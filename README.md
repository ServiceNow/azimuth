<p align="center">
  <img width=50% src="docs/docs/_static/logo.svg">
  <br>
  <a href="https://join.slack.com/t/newworkspace-5wx1461/shared_invite/zt-16x8eqt1h-ho3Hh6ilcN7FpZyLkjr9oA">
    <img alt="Slack" src="https://img.shields.io/badge/slack-chat-green.svg?logo=slack"/>
  </a>
  <a href="./LICENSE">
    <img alt="Licence" src="https://img.shields.io/badge/License-Apache%202.0-blue.svg"/>
  </a>
  </h1>
</p>

## Overview

Azimuth is an application that helps model developers better understand their dataset and their model results by
performing thorough error analyses. It currently only supports text classification use cases.

Our [documentation](https://servicenow.github.io/azimuth) contains details how to launch the application and its main
features.

### Quick start

To get the application running, we can use a pretrained model from [HuggingFace](huggingface.co).

In `config/nlp_text_classification/banking77/conf.json` you will find an example of an Azimuth configuration file. For
more information on our configuration file, see
our [Documentation](https://servicenow.github.io/azimuth/getting-started/config/).

If you have Docker installed, run the following to launch Azimuth for the `banking77` data and model:

`make DEVICE=cpu CFG_PATH=/config/nlp_text_classification/banking77/conf.json launch`

To get Azimuth running with a gpu simply set `DEVICE=gpu` instead.

If you don't have Docker installed, please refer
to [Getting Started](https://servicenow.github.io/azimuth/getting-started/install/).

Once the startup tasks are completed, you will be able to access Azimuth. To learn more about Azimuth's features, refer
to our [User Guide](https://servicenow.github.io/azimuth/user-guide/dashboard/).

To use your own dataset or model, please refer
to [Getting Started](https://servicenow.github.io/azimuth/getting-started/install/).

## How to Develop

Our Development documentation can be found [here](https://servicenow.github.io/azimuth/development/setup). We document
our big technical decisions on our [wiki](https://github.com/ServiceNow/azimuth/wiki/Technical-Design-Decisions).

### Code Documentation

At different places in the code, you'll find `README` files explaining further how the back end works. Don't hesitate to
add other `README` files in appropriate places, and don't forget to edit them if you change these components.

* In [azimuth](azimuth/README.md), explaining the main back-end components.
* In [azimuth/modules](azimuth/modules/README.md), explaining how modules work.
* In [azimuth/routers](azimuth/routers/README.md), explaining how to add new routes.

### Repo Structure

```bash
├── config
│   └── Config files for different data/models
├── docs
│   └── User documentation
├── tests
│   └── Unit/integration tests
├── azimuth
│   ├── functional
│   │   └── Capabilities outside of Modules.
│   ├── modules
│   │   └── Where core capabilities are implemented
│   ├── routers
│   │   └── FastAPI routers
│   ├── types
│   │   └── Specific pydantic types that this application is based on
│   ├── utils
│   │   └── Extra utilities
├── azimuth_shr
│   └── Custom code that is shareable.
├── docker-compose.yml # Where the config and images are specified.
├── docker-compose-gpu.yml # Extension to use Azimuth with gpus.
└── runner.py # Application entrypoint.
```

# License

The package is licensed by ServiceNow, Inc. under the Apache 2.0 license. See [LICENSE](LICENSE) for more details.