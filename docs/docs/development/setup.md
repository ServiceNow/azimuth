# Initial Setup

## Install Dependencies

### Install `pyenv` (MacOS)
We use `python 3.8.9` for the back end in our repo, but `python >= 3.7` should work in general.
You should use `pyenv` to set up the right `python` version for the project.

* Install [`brew`](https://brew.sh/) (if not already installed).
* Install the [`xz`](https://tukaani.org/xz/) library (if not already installed).
    ```shell
    brew install xz
    ```
* Then install `pyenv` and set the right `python` version.
    ```shell
    brew install pyenv
    pyenv install 3.8.9
    pyenv local 3.8.9      # You can use global or local.
    ```
* Add this to your `~/.zshrc`:
    ```shell
    export PYENV_ROOT="$HOME/.pyenv"
    export PATH="$PYENV_ROOT/bin:$PATH"
    eval "$(pyenv init -)"
    ```
* Run `zsh` to open a new shell (with the updated `~/.zshrc`).
    ```shell
    zsh
    ```
* Check that the version of `python` is the same as you set to `pyenv local`.
    ```shell
    python --version
    ```

    ??? fail "If it doesn't match..."
        It might be due to a wrong ordering in your `$PATH`. Print it and make sure that `$PYENV_ROOT/bin` is at the beginning. Edit `~/.zshrc` accordingly.
        ```shell
        echo $PATH
        ```

### Install `Poetry`
We use `poetry` as our dependency manager for the back end.

* Install [`poetry`](https://python-poetry.org/docs/).
* Check that the version of python that `poetry` uses is the same as you set to `pyenv local`.
    ```shell
    poetry run python --version
    ```

    ??? fail "If it prints a warning mentioning another python version..."
        You might need to force `poetry` to use the right python environment.
        ```shell
        poetry env use $(which python)
        ```

* Install the dependencies.
    ```shell
    poetry install
    ```

### Docker (Optional)
Docker is needed for different tasks such as releasing and updating the documentation. However, it won't be needed at first to develop and launch the app. You can skip this step and wait until you are required to use it.

* Install [`Docker Desktop`](https://www.docker.com/products/docker-desktop). If you are using a Mac, check "Apple logo" > "About This Mac" to know if you have a `Mac with Intel Chip` or a `Mac with Apple Chip`.

### Front End
- Install [`Node.js`](https://nodejs.org).
- Once you've installed `Node`, you can install `yarn`.

    ```shell
    npm install -g yarn
    ```

- You can then install front-end dependencies, from the webapp folder, using:

    ```shell
    cd webapp
    yarn
    ```

## Setting up the development environment
### Install IDE
* If developing in back end, we recommend installing PyCharm:
    * Install [PyCharm](https://www.jetbrains.com/pycharm/download/#section=mac).
    * In PyCharm preferences, you can add your existing python virtual environment as the "Python Interpreter", pointing where what `poetry run which python` prints.
* If developing in front end, we recommend installing Visual Studio Code:
    * [Install Visual Studio Code](https://code.visualstudio.com/download)
    * A pre-defined configuration is available in the repo, to help development. Two things to do:
        * View > Extensions > search for `esbenp.prettier-vscode` and install it. That's the official `Code formatter using prettier` by publisher `Prettier`.
        * File > Open Workspace from File > select [`azimuth.code-workspace`](https://github.com/ServiceNow/azimuth/blob/master/azimuth.code-workspace), which will set up two folders: `webapp` and `.` (for the rest). In the `webapp` folder, [`webapp/.vscode/settings.json`](https://github.com/ServiceNow/azimuth/blob/master/webapp/.vscode/settings.json) will configure Prettier to format your files on save.

### Pre-commit Hooks
We installed pre-commit hooks which will format automatically your code with each commit. The first time, you need to run the following command.
```
poetry run pre-commit install
```
