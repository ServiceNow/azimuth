# C. Run on Your Use Case

This page guides you through the process of running the app on your data and pipelines, using
Docker. Different dataset and text classification models can be supported in Azimuth.

!!! info

    Azimuth supports specifying **no pipelines**, to only perform dataset analysis. It also supports
    supplying **mulitple pipelines**, to allow for quick comparison. However, only one dataset per
    config is allowed.

The **simplest scenario** is if you have a [**HuggingFace (HF)**](http://www.huggingface.co)
**dataset** and **model**. For the sake of simplicity, we explain the instructions to run the app
with this scenario. However, you will quickly need to learn about
the [:material-link: Configuration](../reference/configuration/index.md) details
and [:material-link: Custom Objects](../reference/custom-objects/index.md) to launch more complex
use cases.

## 1. Prepare the Config File

**Start from an existing config ** and **edit** the relevant fields to adapt it to your dataset and
models. Examples with an [HuggingFace (HF)](http://www.huggingface.co)
dataset and model are available in `config/examples` (`CLINC` is also shown below).

1. Put your model checkpoint (results
   of [.save_pretained()](https://huggingface.co/docs/transformers/main_classes/model#transformers.PreTrainedModel.save_pretrained))
   under the folder `azimuth/azimuth_shr`.
2. In `azimuth/config`, copy `config/examples/clinc_oos/conf.json` to a new folder with your project
   name. Ex: `config/my_project/conf.json`.
3. Edit the config:
    1. `name`: put your project name.
    2. `dataset.args`: specify the args required to load your dataset
       with [`datasets.load_dataset`](https://huggingface.co/docs/datasets/loading).
    3. Edit `columns` and `rejection_class` based on the dataset.
    4. `pipelines.models.kwargs.checkpoint_path`: put your own checkpoint path to your model. The
       path should start with `/azimuth_shr`, since this folder will be mounted on Docker.
    5. Edit the `saliency_layer` so it is the name of the input layer of the model. It should be set
       to `null` if your model is not from PyTorch or without a word-embedding layer.

!!! tip

    If you need more details on some of these fields:

      * The [:material-link: Project Config](../reference/configuration/project.md) explains in more
        details `name`, `dataset`, `columns` and `rejection_class`.
      * The [:material-link: Model Contract Config](../reference/configuration/project.md) details
        how to define `pipelines`, `model_contract` and `saliency_layer`.

```yaml
{
  "name": "CLINC-151", # (1)
  "dataset": {
    "class_name": "datasets.load_dataset", # (2)
    "args": [ # (3)
        "clinc_oos",
        "imbalanced"
    ]
  },
  "columns": { # (4)
    "text_input": "text",
    "label": "intent"
  },
  "rejection_class": "oos", # (5)
  "model_contract": "hf_text_classification", # (6)
  "pipelines": [ # (7)
    {
      "model": {
        "class_name": "loading_resources.load_hf_text_classif_pipeline", # (8)
        "remote": "/azimuth_shr", # (9)
        "kwargs": { # (10)
          "checkpoint_path": "transformersbook/
                              distilbert-base-uncased-distilled-clinc"
        }
      }
    }
  ],
  "saliency_layer": "distilbert.embeddings.word_embeddings", # (11)
}
```

1. Name for your project. Shown in the application to identify your config.
2. If the dataset is a `HF` dataset, use this `class_name`.
3. `kwargs` to send to the `class_name`.
4. Specify the name of the dataset columns, such as the column with the utterance and the label.
5. Specify the value if a rejection option is present in the classes.
6. If the pipeline is a `HF` pipeline, use this `model_contract`.
7. Multiples ML pipelines can be listed to be available in the webapp.
8. If this a `HF` pipeline, use this `class_name`.
9. Change only if `class_name` is not found in `/azimuth_shr`.
10. `kwargs` to send to the class. Only `checkpoint_path` if you use the class above.
11. Name of the layer on which to compute saliency maps.

## 2. Running the App

1. In the terminal, go the `azimuth` **root directory**.
2. Set `CFG_PATH="/config/my_project/conf.json"` with the **location of the config**.
    * The initial `/` is required as your local config folder will be mounted on the Docker
      container at the root.
    * If you do not specify any `CFG_PATH`, i.e `make compose`, the default demo will launch.
3. Execute the following **command**:
    ```
    make compose
    ```
4. The **app will be accessible** at `http://0.0.0.0:8080` after a few minutes of waiting. The
   start-up tasks will start.

## Advanced Settings

### Additional Config Fields

The [:material-link: **
Configuration**](../reference/configuration/index.md) reference details all additional fields that
can be set, such as changing how behavioral tests are executed, the similarity analysis encoder, the
batch size and so on.

### Environment variables

No matter where you launch the app from, you can always configure some options through environment
variables. They are all redundant with the config attributes, so you can set them in either place.
They are the following:

* Specify the threshold of your model by passing `TH` (ex: `TH=0.6` or `NaN` if there is no
  threshold) in the command. If multiple pipelines are defined, the threshold will apply to all.
* Similarly, pass `TEMP=Y` (ex: `TEMP=3`) to set the temperature of the model.
* Disable behavioral tests and similarity by passing respectively `BEHAVIORAL_TESTING=null` and
  `SIMILARITY=null`.
* Specify the name of the project, passing `NAME`.

!!! note

    Remember that the values above are defined in the config too. If conflicting values are defined,
    values from the config file will prevail.

--8<-- "includes/abbreviations.md"
