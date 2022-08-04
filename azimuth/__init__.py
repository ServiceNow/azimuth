from pathlib import Path

from datasets import set_progress_bar_enabled
from datasets.utils.logging import set_verbosity_error

from azimuth.utils.logs import set_logger_config

PROJECT_ROOT = str(Path(__file__).parent)

set_verbosity_error()
set_progress_bar_enabled(False)
set_logger_config()
