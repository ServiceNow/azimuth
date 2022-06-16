# B. Learn Basics

## Understanding the Application Folder

In the downloaded Azimuth folder from [step A](a-install.md), the following structure
exists:

```bash
azimuth  # Root directory
├── azimuth
│   └── # Back End # (7)
├── azimuth_shr
│   └── # User dataset, models, and code # (1)
├── config
│   └── # User configs # (2)
├── webapp
│   └── # Front End # (8)
├── .app_env  # (3)
├── docker-compose.yml  # (4)
├── Makefile  # (5)
└── README.md # (6)
```

1. Where to put your data, model and code, if relevant. `azimuth_shr` stands for
   azimuth shared, because it contains user artifacts that are shared with the application. Azimuth
   provides default artifacts already to load common dataset and models.
2. Where to put all configs. Example configs are provided.
3. Default values for env vars.
4. Where the config and Docker images are specified.
5. Available commands to use Azimuth.
6. Instructions to launch the application.
7. Only available when cloning the repo.
8. Only available when cloning the repo.

!!! note "Where to put your data, code and configs?"

    `config` and `azimuth_shr` are two folders where you will put different artifacts before you
    can run Azimuth on your dataset and models. They get mounted automatically on the Docker image.

## The Config File

The Azimuth config file contains all the information to launch and customize Azimuth. It specifies
which dataset and pipelines to load in the app, as well as other variables that allow for
customization of the app. Most fields have default values and don't need to be explicitly defined in
each config. The [:material-link: Configuration](../reference/configuration/index.md) reference
details all available fields.

Different configuration examples are provided in the repo under `config/examples`, leveraging
pretrained models from [HuggingFace](https://huggingface.co). The next
step, [:material-link: C. Run on Your Use Case](c-run.md), will detail how to adapt an existing config to create your own.

## Clearing the Cache

Azimuth keeps all artifacts in caching folders so that if you close the app and re-launch, it will
load quickly. Once you are done with your analysis, you can delete the cache by running:

```
make clean
```

## Run Our Demo to Verify Your Setup

Out-of-the-box, Azimuth can run on different demo data and models
from [HuggingFace (HF)](http://www.huggingface.co). Verify that your setup is working correctly by
running a demo.

1. In the terminal, from the `azimuth` folder (the root directory), execute the following commands.
   The first one installs the Google Drive downloading library. The second command downloads from
   Google Drive the demo data and model. Our demo is using a subset of
   the [`clinc_oos` dataset](https://huggingface.co/datasets/clinc_oos) from HuggingFace, with only
   16 classes.
    ```
    pip install gdown
    make download_demo
    ```

    ??? fail "You cannot install `gdown`?"
        Look at the following
        [:material-github: Discussion](https://github.com/ServiceNow/azimuth/discussions/46) to
        download the data manually.

2. Run **our dummy or full demo** (option a. or b.), based on how much time you have. If it is the
   first time that you are running the command, it will take additional time to download the Docker
   image (~15 min). If you have access to GPUs, you can add to the command `DEVICE=gpu` (default
   is `cpu`).
    1. If you don't have a lot of time and just want to verify your setup, you can run our dummy
       CLINC demo (~2min):
       ```
       make CFG_PATH=/config/development/clinc_dummy/conf.json launch
       ```
    2. If you have a bit more time, run our full CLINC demo (~10min):
       ```
       make CFG_PATH=/config/development/clinc/conf.json launch
       ```

3. The **app will be accessible** at [http://0.0.0.0:8080](http://0.0.0.0:8080) after a few minutes
   of waiting. The screen will indicate that the start-up tasks have started. When it is completed,
   the application will be loaded.
4. Skim the [:material-link: Key Concepts](../key-concepts/index.md) section to get a high-level
   understanding of some concepts used throughout the application. If you are unsure what each
   screen allows you to do, the [:material-link: User Guide](../user-guide/index.md) section walks
   you through all the available interactions on each screen.

!!! success "Successful demo"

    Now that the demo is working, you can adapt the config to make it work on your dataset and
    model. **Proceed to [:material-link: C. Run on Your Use Case](c-run.md)**.

--8<-- "includes/abbreviations.md"
