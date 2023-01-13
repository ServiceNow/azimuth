# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from pathlib import Path

import numpy as np
import structlog
import torch
from datasets import ClassLabel, Dataset, DatasetDict, Features, load_dataset
from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    Pipeline,
    TextClassificationPipeline,
)

from azimuth.config import AzimuthConfig

log = structlog.get_logger(__file__)

AZ_SHR_DIR = Path(__file__).parent.resolve()
_CACHED_MODELS_DIR = str(AZ_SHR_DIR.joinpath("cached_models"))


def _should_use_cuda(azimuth_config: AzimuthConfig):
    if azimuth_config.use_cuda == "auto":
        use_cuda = torch.cuda.is_available()
    else:
        use_cuda = azimuth_config.use_cuda
    return use_cuda


def load_hf_text_classif_pipeline(checkpoint_path: str, azimuth_config: AzimuthConfig) -> Pipeline:
    log.debug(f"Loading text classification model from {checkpoint_path} ...")
    model = AutoModelForSequenceClassification.from_pretrained(
        checkpoint_path, cache_dir=_CACHED_MODELS_DIR
    )
    # As of March 28th, 2022, pipelines didn't support fast tokenizers
    # See https://github.com/huggingface/transformers/issues/7735
    tokenizer = AutoTokenizer.from_pretrained(
        checkpoint_path, use_fast=False, cache_dir=_CACHED_MODELS_DIR
    )
    device = 0 if _should_use_cuda(azimuth_config) else -1

    # We set return_all_scores=True to get all softmax outputs
    return TextClassificationPipeline(
        model=model, tokenizer=tokenizer, device=device, return_all_scores=True
    )


def load_sst2_dataset() -> DatasetDict:
    log.debug("Loading dataset sst2...")
    datasets = load_dataset("glue", "sst2")
    datasets["validation"] = datasets["validation"].rename_column("sentence", "utterance")
    datasets["train"] = datasets["train"].rename_column("sentence", "utterance")
    # Cutting training set from 60k to 1k.
    return DatasetDict(
        {"train": datasets["train"].select(np.arange(1000)), "validation": datasets["validation"]}
    )


def load_CLINC150_data(full_path, python_loader, train=True, eval=True) -> Dataset:
    """This dataset contains train, validation and test in one file."""
    log.debug("Loading dataset for CLINC150 intent classification")
    dst = load_dataset(python_loader, data_files={"full": full_path})
    if not train:
        dst.pop("train")
    if not eval:
        dst.pop("validation")
        dst.pop("test")
    return dst


def align_labels(ds_dict: DatasetDict, azimuth_config: AzimuthConfig) -> DatasetDict:
    features: Features = next(iter(ds_dict.values())).features
    if not isinstance(features[azimuth_config.columns.label], ClassLabel):
        # Get all classes from both set and apply the same mapping to every dataset.
        classes = sorted(
            list(
                set(label for ds in ds_dict.values() for label in ds[azimuth_config.columns.label])
            )
        )
        ds_dict = ds_dict.class_encode_column(azimuth_config.columns.label)
        ds_dict = ds_dict.align_labels_with_mapping(
            {class_name: i for i, class_name in enumerate(classes)}, azimuth_config.columns.label
        )
    return ds_dict


def load_csv(azimuth_config, train_path=None, validation_path=None) -> DatasetDict:
    data_files = dict()
    if train_path:
        data_files["train"] = train_path
    if validation_path:
        data_files["validation"] = validation_path
    ds_dict = load_dataset(path="csv", data_files=data_files)
    ds_dict = align_labels(ds_dict, azimuth_config)
    # Remove any empty utterances (which may exist in csv input)
    for ds_name, ds in ds_dict.items():
        ds_dict[ds_name] = ds_dict[ds_name].filter(
            lambda x: x[azimuth_config.columns.text_input] is not None
        )
    return ds_dict
