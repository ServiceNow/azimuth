import os
from pathlib import Path

from datasets import disable_progress_bar
from datasets.utils.logging import set_verbosity_error

from azimuth.utils.logs import set_logger_config

PROJECT_ROOT = str(Path(__file__).parent)

set_verbosity_error()
disable_progress_bar()
set_logger_config()
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "1"  # INFO messages from TensorFlow are not printed
