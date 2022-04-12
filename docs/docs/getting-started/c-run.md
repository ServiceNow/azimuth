# C. Run on Your Use Case

This page guides you through the process of running the app on your data and pipelines, using
Docker. Different dataset and text classification models can be supported in Azimuth.

The **simplest scenario** is if you have a [**HuggingFace (HF)**](http://www.huggingface.co)
**dataset** and **model**. For the sake of simplicity, we explain the instructions to run the app
with this scenario. If your use case is more complex, the following resources will show you how
to **adapt the instructions** accordingly.

* Your data is **not a HF Dataset**? TODO
* Your model is **not a HF pipeline**? TODO
* You don't have a model, just a **file with saved predictions**? TODO
* Your data or model **cannot be moved** to `azimuth/azimuth_shr`? TODO
* Complete the list TODO

## 1. Prepare the Config File

**Start from an existing config** and **edit** the relevant fields to adapt it to your dataset and
models. An example with an [HuggingFace (HF)](http://www.huggingface.co) dataset and model is
available in `azimuth/config/hf_example/conf.json` (also shown below).

1. Put your model checkpoint under the folder `azimuth/azimuth_shr`. TODO Explain more
2. In `azimuth/config`, copy `hf_example/conf.json` to a new folder with your project name.
   Ex: `my_project/conf.json`
3. Edit the config:
    1. `name`: put your project name.
    2. `pipelines[models][kwargs][checkpoint_path]`: put your own checkpoint path to your model. The
       path should start with `/azimuth_shr`, since this folder will be mounted on Docker.
    3. `dataset[args]`: specify the args to send to the HF function to get the good dataset.
    4. Edit `columns` and `rejection_class` based on the dataset.

```yaml
{
  "name": "CLINC-151", # (1)
  "model_contract": "hf_text_classification", # (2)
  "pipelines": [ # (3)
    {
      "model": {
        "class_name": "loading_resources.load_hf_text_classif_pipeline", # (4)
        "remote": "/azimuth_shr", # (5)
        "kwargs": { # (6)
          "checkpoint_path": "transformersbook/
                              distilbert-base-uncased-distilled-clinc"
        }
      }
    }
  ],
  "dataset": {
    "class_name": "datasets.load_dataset", # (7)
    "args": [ # (8)
        "clinc_oos",
        "imbalanced"
    ]
  },
  "columns": { # (9)
    "text_input": "text",
    "label": "intent"
  },
  "rejection_class": "oos" # (10)
}
```

1. Name for your project. Shown in the application to identify your config.
2. If the pipeline is a `HF` pipeline, use this `model_contract`.
3. Multiples ML pipelines can be listed to be available in the webapp.
4. If this a `HF` pipeline, use this `class_name`.
5. Change only if the class is not in `/azimuth_shr`.
6. `kwargs` to send to the class. Only `checkpoint_path` if you use the class above.
7. If the dataset is a `HF` dataset, use this `class_name`.
8. `kwargs` to send to the `class_name`.
9. Specify the name of the dataset columns, such as the column wit the utterance and the label.
10. Specify the value if a rejection option is present in the classes.

## 2. Running the App

1. In the terminal, go the `azimuth` **root directory**.
2. Set `CFG_PATH='/config/my_project/conf.json'` with the **location of the config**.
    * The initial `/` is required as your local config folder will be mounted on the Docker
      container at the root.
    * If you do not specify any `CFG_PATH`, i.e `make launch`, the default demo will launch.
3. Execute the following **command**:
    ```
    make launch
    ```
4. The **app will be accessible** at `http://0.0.0.0:8080` after a few seconds of waiting. The
   start-up tasks will start.

## Advanced Settings [Optional]

### Additional Config Fields

TODO

### Environment variables

No matter where you launch the app from, you can always configure some options through environment
variables. They are all redundant with the config attributes, so you can set them in either place.
They are the following:

* Specify the threshold (X) of your model by passing `TH` (ex: `TH=0.6` or `NaN` if there is no
  threshold) in the command. If multiple pipelines are defined, the threshold will apply to all.
* Similarly, pass `TEMP=Y` (ex: `TEMP=3`) to set the temperature (Y) of the model.
* Disable behavioral tests and similarity by passing respectively `BEHAVIORAL_TESTING=null` and
  `SIMILARITY=null`.
* Specify the name of the project, passing `NAME`.

!!! note

    Remember that the values above are defined in the config too. If conflicting values are defined,
    values from the config file will prevail.

--8<-- "includes/abbreviations.md"
