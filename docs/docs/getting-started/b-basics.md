# B. Learn Basics

## Understanding the Application Folder

In the Azimuth folder downloaded and unzipped at [step A](a-install.md), the following **structure**
exists:

```bash
├── azimuth_shr
│   └── # User dataset, models, and code # (1)
├── config
│   └── # User configs # (2)
├── .app_env  # (3)
├── docker-compose.yml  # (4)
├── Makefile  # (5)
└── README.md # (6)
```

1. Where to put your data, your model and the user code, if relevant.
2. Where to put all configs. Example configs are provided.
3. Default values for env vars.
4. Where the config and Docker images are specified.
5. Available commands to use Azimuth.
6. Instructions to launch the application.

!!! note

    `config` and `azimuth_shr` are two folders where you will put different artifacts before you
    can run Azimuth on your dataset and models. They get mounted automatically on the Docker image.

## The Config File

The Azimuth config file **contains all the information** to launch and customize Azimuth. It
specifies which dataset and pipelines to load in the app, as well as other variables that allow for
**customization** of the app. Most fields have **default values** and don't need to be explicitly
defined in each config. The [:material-link: **
Configuration**](../reference/configuration/index.md) reference details all available fields.

## Clearing the Cache

Azimuth keeps all artifacts in caching folders so that if you close the app and re-launch, it will
load quickly. Once you are done with your analysis, you can delete the cache by running:

```
make clean
```

## Verify your Setup

Out-of-the-box, Azimuth can run on different **demo data and models**
from [HuggingFace (HF)](http://www.huggingface.co). Verify that your setup is working correctly by
**running a demo**.

1. In the terminal, from the `azimuth` folder, execute:
    ```
    # Download the demo data
    make download_demo
    # Run our demo on CLINC
    make DEVICE=$DEVICE CFG_PATH=/config/development/clinc/conf.json compose
    ```
   where `$DEVICE` is one of `gpu` or `cpu`. If none provided, `cpu` will be used.
2. The **app will be accessible** at [http://0.0.0.0:8080](http://0.0.0.0:8080) after a few minutes
   of waiting. The screen will indicate that the start-up tasks have started. When it is completed,
   the application will be loaded.
3. Skim the [:material-link: Key Concepts](../key-concepts/index.md) section to get a high-level
   understanding of some concepts used throughout the application. If you are unsure what each
   screen allows you to do, the [:material-link: User Guide](../user-guide/index.md) section walks
   you through all the available interactions on each screen.

!!! success

    Now that the demo is working, you can adapt the config to make it work on your dataset and
    model. **Proceed to [:material-link: C. Run on Your Use Case](c-run.md)**.

--8<-- "includes/abbreviations.md"
