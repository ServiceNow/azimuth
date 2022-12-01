"""
Note - This is a copied from the another internal repo.
Also inspired by https://gist.github.com/tboquet/588955d846c03de66b87c8bca0fb99cb
"""
import collections
import inspect
import logging
import os
import threading
import time
from typing import List

import structlog
from structlog.dev import ConsoleRenderer
from structlog.processors import StackInfoRenderer, TimeStamper, format_exc_info
from structlog.stdlib import add_log_level

log = structlog.get_logger(__name__)


def set_logger_config(level=logging.INFO):
    """Set log configuration to our standard.

    Args:
        level: Logging level to use
    """
    structlog.configure(
        processors=[
            structlog.stdlib.PositionalArgumentsFormatter(),
            StackInfoRenderer(),
            format_exc_info,
            structlog.processors.UnicodeDecoder(),
            TimeStamper(fmt="iso", utc=True),
            add_log_level,
            add_caller_info,
            order_keys,
            BetterConsoleRenderer(),
        ],
        context_class=structlog.threadlocal.wrap_dict(dict),
        wrapper_class=structlog.make_filtering_bound_logger(level),
        cache_logger_on_first_use=True,
    )


def _foreground_color(color):
    return "\x1b[" + str(color) + "m"


# pylint: disable=W0612
def _level_styles():
    """Set color for different levels.

    Returns:
        Dict with color for each level.
    """
    red = 31
    green = 32
    yellow = 33
    blue = 34
    light_gray = 37

    return {
        "critical": _foreground_color(red),
        "exception": _foreground_color(red),
        "error": _foreground_color(red),
        "warning": _foreground_color(yellow),
        "info": _foreground_color(green),
        "debug": _foreground_color(blue),
        "notset": _foreground_color(light_gray),
    }


def add_pid_thread(_, __, event_dict):
    pid = os.getpid()
    thread = threading.current_thread().getName()
    event_dict["pid_thread"] = f"{pid}-{thread}"
    return event_dict


def add_caller_info(logger, method_name, event_dict):
    """Add source info of the log to get the function name.

    Args:
        logger: ...
        method_name: ...
        event_dict: ...

    Returns:
        event log updated with `module` key.
    """
    # Typically skipped funcs: _add_caller_info, _process_event, _proxy_to_logger, _proxy_to_logger
    frame = inspect.currentframe()
    while frame:
        frame = frame.f_back
        module = frame.f_globals["__name__"]
        if module.startswith("structlog."):
            continue
        event_dict["module"] = module
        return event_dict


def order_keys(logger, method_name, event_dict):
    return collections.OrderedDict(
        sorted(event_dict.items(), key=lambda item: (item[0] != "event", item))
    )


class BetterConsoleRenderer:
    """Renderer with timestamp, pid and module name."""

    def __init__(self):
        self._worse_console_renderer = ConsoleRenderer(level_styles=_level_styles())

    def __call__(self, logger, log_method, event_dict):
        pid = event_dict.pop("pid_thread", None)
        module = event_dict.pop("module", None)
        # Format timestamp to remove milliseconds
        event_dict["timestamp"] = event_dict.get("timestamp", "")[:-8]
        if pid is not None:
            pid_thread = "[{}] ".format(str(pid).ljust(16))
        else:
            pid_thread = ""
        mod_func_line = "[{}] ".format(module)

        return (
            pid_thread
            + mod_func_line
            + self._worse_console_renderer(logger, log_method, event_dict)
        )


class TimerLogging:
    """
    Small Context manager to time things.

    Args:
        name: How to name the Timer.

    Examples:
        ```
        with TimerLogging("potato"):
            time.sleep(10)
        # prints: "Complete duration=10 name=potato"
        ```

    """

    def __init__(self, name: str):
        self.start = None
        self.name = name

    def __enter__(self):
        self.start = time.time()

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.start is not None:
            duration = int(time.time() - self.start)
            log.debug("Complete", name=self.name, duration=duration)


class MultipleExceptions(BaseException):
    def __init__(self, exceptions: List[Exception], message="We found the following exceptions: "):
        self.exceptions = exceptions
        self.message = message

    def __str__(self):
        return f"{self.message} \n\t" + "\n".join(map(str, self.exceptions))
