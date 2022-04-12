# B. Learn Basics

## Understanding the Application Folder

In the Azimuth folder downloaded and unzipped at [step A](a-install.md), the following **structure**
exists:

```bash
├── azimuth_shr
│   └── # User dataset, models and  code # (1)
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
specifies which dataset and pipelines to load in the app, as well as other variables that control
**customization** of the app. Most attributes have **default values** and don't need to be
explicitly defined in each config. The **full reference** is [here](../reference/index.md).

## Verify your Setup

Out-of-the-box, Azimuth can run on a **demo data and model**
from [HuggingFace (HF)](http://www.huggingface.co). Verify that your setup is working correctly by
**running the demo**.

1. In the terminal, from the `azimuth` folder, execute:
    ```
    make launch
    ```
2. The **app will be accessible** at [http://0.0.0.0:8080](http://0.0.0.0:8080) after a few seconds
   of waiting. The screen will indicate that the start-up tasks have started. When it is completed,
   the application will be **loaded**. The [User Guide](../user-guide/index.md) section walks you
   through all the screens.

!!! success

    Now that the demo is working, you can adapt the config to make it work on your dataset and
    model. **Proceed to [Run on Your Use Case](c-run.md)**.

--8<-- "includes/abbreviations.md"
