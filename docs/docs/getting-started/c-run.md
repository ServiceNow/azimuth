# C. Run on Your Use Case

This page guides you through the process of running the app on your data and pipelines, using
Docker. Different dataset and text classification models can be supported in Azimuth.

!!! info "Launch Azimuth with no pipeline, or with multiple pipelines"

    Azimuth supports specifying **no pipelines**, to only perform dataset analysis. It also supports
    supplying **mulitple pipelines**, to allow for quick comparison. However, only one dataset per
    config is allowed.

The **simplest scenario** is if you have a [**HuggingFace (HF)**](http://www.huggingface.co)
**dataset** and **model**. For the sake of simplicity, we explain the instructions to run the app
with this scenario. However, you will quickly need to learn about
the [:material-link: Configuration](../reference/configuration/index.md) details
and [:material-link: Custom Objects](../reference/custom-objects/index.md) to launch more complex
use cases.

## Configure and Run Azimuth

!!! tip "Run our demo first"

    You haven't run our demo yet? You might want to verify your setup before feeding your own model
    and dataset. Go back to [B. Learn Basics](b-basics.md).

1. Put your model checkpoint (results
   of [`.save_pretained()`](https://huggingface.co/docs/transformers/main_classes/model#transformers.PreTrainedModel.save_pretrained))
   under the folder `azimuth_shr`.
2. **Optional** - Configure Azimuth with a config file. If you don't, the UI will simply prompt you to configure Azimuth from the config UI.
    1. **Start from an existing config ** and **edit** the relevant fields to adapt it to your dataset and
        models. Examples with a [HuggingFace (HF)](http://www.huggingface.co)
        dataset and model are available in `config/examples`. For example: `config/examples/clinc_oos/conf.json` for `CLINC`.
    2. In `config`, copy `config/examples/clinc_oos/conf.json` to a new folder with your project
        name. For example: `config/my_project/conf.json`.
    3. Set `CFG_PATH=/config/my_project/conf.json` with the **location of the config**.
        * The initial `/` is required as your local config folder will be mounted on the Docker
          container at the root.
    4. Edit this new config as described in step 5, then proceed with step 3.
3. From the `azimuth` **root directory**, run the following **command**:
    ```
    make launch
    ```
4. The **app will be accessible** at [localhost:8080](http://localhost:8080) after a few minutes.
    The back-end API will be accessible at [localhost:8080/api/local/docs](http://localhost:8080/api/local/docs).
5. If necessary, edit the config:
    1. `name`: set your project name.
    2. `dataset.args`: specify the args required to load your dataset
       with [`datasets.load_dataset`](https://huggingface.co/docs/datasets/loading).
    3. Edit `columns` and `rejection_class` based on the dataset.
    4. `pipelines.models.kwargs.checkpoint_path`: set your own checkpoint path to your model. The
       path should start with `/azimuth_shr`, since this folder will be mounted on the Docker container.
    5. Edit the `saliency_layer` so it is the name of the input layer of the model. It should be set
       to `null` if your model is not from PyTorch or without a word-embedding layer.

    !!! tip "Links to full reference"

        If you need more details on some of these fields:

          * The [:material-link: Project Config](../reference/configuration/project.md) explains in
            more details `name`, `dataset`, `columns` and `rejection_class`.
          * The [:material-link: Model Contract Config](../reference/configuration/project.md)
            details how to define `pipelines`, `model_contract` and `saliency_layer`.

```yaml
{
  "name": "CLINC150", # (1)
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

## About the Config History

After a successful start, Azimuth saves the provided config in its `config_history.jsonl` artifact. If you use the API to edit the config, the edits are saved there. If you restart Azimuth (for example after shutting it down for the night), you can resume where you left off with:
```shell
make LOAD_CONFIG_HISTORY=1 launch
```
In fact, it is possible to specify both `LOAD_CONFIG_HISTORY=1` and a `CFG_PATH` together, in which case Azimuth will automatically

1. load the config from `CFG_PATH` when it first starts (if `config_history.jsonl` is empty); and
2. load the config from `config_history.jsonl` from then on (if Azimuth is restarted).

For example:
```shell
make CFG_PATH=/config/my_project/conf.json LOAD_CONFIG_HISTORY=1 launch
```
Although confusing, this enables you to stop and restart the docker container with the same command.

## Advanced Settings

### Additional Config Fields

The [:material-link: **
Configuration**](../reference/configuration/index.md) reference details all additional fields that
can be set, such as changing how behavioral tests are executed, the similarity analysis encoder, the
batch size and so on.

### Environment Variables

No matter where you launch the app from, you can always configure some options through environment
variables. They are all redundant with the config attributes, so you can set them in either place.
They are the following:

* Specify the threshold of your model by passing `TH` (ex: `TH=0.6` or `NaN` if there is no
  threshold) in the command. If multiple pipelines are defined, the threshold will apply to all.
* Similarly, pass `TEMP=Y` (ex: `TEMP=3`) to set the temperature of the model.
* Disable behavioral tests and similarity by passing respectively `BEHAVIORAL_TESTING=null` and
  `SIMILARITY=null`.
* Specify the name of the project, passing `NAME`.
* You can specify the device on which to run Azimuth, with `DEVICE` being one of `auto`, `gpu` or `cpu`. If
  none is provided, `auto` will be used. Ex: `DEVICE=gpu`.
* Specify `READ_ONLY_CONFIG=1` to lock the config once Azimuth is launched.
* Specify `LOAD_CONFIG_HISTORY=1` to load the latest config from Azimuth's config history.

!!! note "Config file prevails over environment variables"

    Remember that the values above are defined in the config too. If conflicting values are defined,
    values from the config file will prevail.

--8<-- "includes/abbreviations.md"
