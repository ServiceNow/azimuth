# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import string
from dataclasses import dataclass
from typing import Callable, List

import numpy as np
import torch
from datasets import ClassLabel, Dataset, DatasetDict, Features, load_dataset
from scipy.special import softmax
from tensorflow import keras
from tensorflow.keras import layers
from transformers import (
    DistilBertConfig,
    DistilBertForSequenceClassification,
    DistilBertModel,
    DistilBertTokenizer,
    Pipeline,
    TextClassificationPipeline,
)

from azimuth.config import AzimuthConfig
from azimuth.utils.ml.seeding import RandomContext

_CACHE_DIR = "/tmp/azimuth_test_models"
_MAX_DATASET_LEN = 42


def _should_use_cuda(azimuth_config: AzimuthConfig):
    if azimuth_config.use_cuda == "auto":
        use_cuda = torch.cuda.is_available()
    else:
        use_cuda = azimuth_config.use_cuda
    return use_cuda


def load_hf_text_classif_pipeline(checkpoint_path: str, azimuth_config: AzimuthConfig) -> Pipeline:
    # The first time, we load a random model, save it for subsequent loads
    use_cuda = _should_use_cuda(azimuth_config)
    try:
        model = DistilBertForSequenceClassification.from_pretrained(_CACHE_DIR)
    except OSError:
        with RandomContext(seed=2022):
            model = DistilBertForSequenceClassification(DistilBertConfig())
            model.init_weights()
            model.save_pretrained(_CACHE_DIR)
    tokenizer = DistilBertTokenizer.from_pretrained(checkpoint_path)
    device = 0 if use_cuda else -1

    # We set return_all_scores=True to get all softmax outputs
    return TextClassificationPipeline(
        model=model, tokenizer=tokenizer, device=device, return_all_scores=True
    )


def load_sst2_dataset(train: bool = True, max_dataset_len: int = _MAX_DATASET_LEN) -> DatasetDict:
    datasets = load_dataset("glue", "sst2")
    datasets["validation"] = datasets["validation"].rename_column("sentence", "utterance")
    # Test has no label
    ds = {"validation": datasets["validation"].select(np.arange(max_dataset_len))}
    if train:
        datasets["train"] = datasets["train"].rename_column("sentence", "utterance")
        ds.update({"train": datasets["train"].select(np.arange(max_dataset_len))})
    return DatasetDict(ds)


def load_intent_data(train_path, test_path, python_loader) -> Dataset:
    return load_dataset(python_loader, data_files={"train": train_path, "test": test_path})


def load_file_dataset(*args, azimuth_config, **kwargs):
    # Load a file dataset and cast the label column as a ClassLabel.
    ds_dict = load_dataset(*args, **kwargs)
    features: Features = [v.features for v in ds_dict.values()][0]
    if not isinstance(features[azimuth_config.columns.label], ClassLabel):
        # Get all classes from both set and apply the same mapping to every dataset.
        classes = sorted(
            list(set(sum([ds[azimuth_config.columns.label] for ds in ds_dict.values()], [])))
        )
        ds_dict = ds_dict.class_encode_column(azimuth_config.columns.label)
        ds_dict = ds_dict.align_labels_with_mapping(
            {class_name: i for i, class_name in enumerate(classes)}, azimuth_config.columns.label
        )
    return ds_dict


def load_CLINC150_data(full_path, python_loader) -> Dataset:
    """This dataset contains train, validation and test in one file."""
    return load_dataset(python_loader, data_files={"full": full_path})


def load_tf_model(checkpoint_path: str) -> Callable:
    # Not using checkpoint_path here as we just want to create a dummy model
    inputs = layers.Input(shape=(768,))
    # Fix number of output neurons to 4
    logits = layers.Dense(4, activation="softmax")(inputs)
    model_dummy = keras.Model(inputs=inputs, outputs=logits)

    # The first time, we load a random model, save it for subsequent loads
    try:
        model = DistilBertModel.from_pretrained(_CACHE_DIR)
    except OSError:
        model = DistilBertModel(DistilBertConfig())
        model.save_pretrained(_CACHE_DIR)
    tokenizer = DistilBertTokenizer.from_pretrained(checkpoint_path, cache_dir=_CACHE_DIR)

    # Create embedder from tokenizer + model
    def embedder(utterances):
        tokens = tokenizer(utterances, return_tensors="pt", padding=True)
        outputs = model(**tokens)
        last_hidden_states = outputs.last_hidden_state
        embeddings = last_hidden_states.detach()[:, 0, :]  # Only take CLS token for each utterance
        return model_dummy(np.array(embeddings))

    return embedder


def config_structured_output(num_classes, threshold=0.8):
    from azimuth.utils.ml.postprocessing import PostProcessingIO

    @dataclass
    class MyOutputFormat:
        model_output: PostProcessingIO
        postprocessor_output: PostProcessingIO

    class StructuredOutput:
        def __init__(self, num_classes, threshold, no_prediction_idx):
            self.rng = np.random.RandomState(2022)
            self.num_classes = num_classes
            self.threshold = threshold
            self.no_prediction_idx = no_prediction_idx

        def __call__(
            self, utterances: List[str], num_workers=0, batch_size=32, truncation=True
        ) -> MyOutputFormat:
            # Random logits based on the first letter
            initial_logits = np.stack(
                [np.random.RandomState(ord(s[0])).randn(self.num_classes) * 2 for s in utterances]
            )
            initial_preds = PostProcessingIO(
                texts=utterances,
                logits=initial_logits,
                preds=np.argmax(initial_logits, -1)[:, None],
                probs=softmax(initial_logits, -1),
            )
            # Our particular postprocessing is very cool,
            # we apply temp scaling=5 and threshold
            postprocessed_logits = initial_logits / 5
            postprocessed_probs = softmax(postprocessed_logits, -1)
            preds = np.where(
                postprocessed_logits.max(-1) > self.threshold,
                postprocessed_probs.argmax(-1),
                self.no_prediction_idx,
            )
            postprocessed = PostProcessingIO(
                texts=utterances,
                logits=postprocessed_logits,
                preds=preds[:, None],
                probs=postprocessed_probs,
            )
            return MyOutputFormat(model_output=initial_preds, postprocessor_output=postprocessed)

    return StructuredOutput(num_classes, threshold, no_prediction_idx=num_classes)


def get_custom_dataset(length, num_classes, azimuth_config) -> DatasetDict:
    text_column = azimuth_config.columns.text_input
    label_column = azimuth_config.columns.label
    rng = np.random.RandomState(2022)

    def gen_text():
        return "".join(rng.choice(list(string.ascii_uppercase + string.digits), size=10))

    classes = {i: f"class_{i}" for i in range(num_classes)}
    inverse_mapping = {v: k for k, v in classes.items()}

    ds_dict = DatasetDict(
        train=Dataset.from_dict(
            {
                text_column: [gen_text() for _ in range(length)],
                label_column: [classes[i % num_classes] for i in range(length)],
            }
        ),
        validation=Dataset.from_dict(
            {
                text_column: [gen_text() for _ in range(length)],
                label_column: [classes[i % num_classes] for i in range(length)],
            }
        ),
    )
    ds_dict = ds_dict.class_encode_column(label_column)
    ds_dict.align_labels_with_mapping(inverse_mapping, label_column=label_column)
    return ds_dict
