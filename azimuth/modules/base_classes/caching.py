# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import abc
import os
import time
from typing import List, Optional

import h5py
import structlog
from filelock import FileLock
from retrying import RetryError, retry

from azimuth.types import ModuleResponse
from azimuth.utils.conversion import from_pickle_bytes, to_pickle_bytes

log = structlog.get_logger(__name__)


class HDF5FileOpenerWithRetry:
    """Open an HDF5 file with multiple retries.

    Args:
        args: Forwarded to h5py.File
        n_retry: Number of tries to open the file.
        sleep: Sleep time between tries in second.
        kwargs: Forwarded to h5py.File.
    """

    def __init__(
        self,
        *args,
        n_retry=5,
        sleep=1,
        **kwargs,
    ):
        self.n_retry = n_retry
        self.sleep = sleep
        self.file = None
        for i in range(self.n_retry):
            try:
                self.file = h5py.File(*args, **kwargs)
                break
            except OSError as e:
                log.warning(f"Issue opening HDF5: {e}. Retrying... {i}/{self.n_retry}")
                time.sleep(self.sleep)
        else:
            raise TimeoutError("Can't open that file.")

    def __enter__(self):
        return self.file

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.file is not None:
            self.file.close()


class CachingMechanism(abc.ABC):
    """Parent module for caching mechanism in the application."""

    @abc.abstractmethod
    def _store_data_in_cache(self, result: List[ModuleResponse], indices: List[int]):
        ...

    @abc.abstractmethod
    def _check_cache(self, indices: Optional[List[int]]):
        ...

    @abc.abstractmethod
    def _get_cache(self, indices: List[int]):
        ...


class HDF5CacheMixin(CachingMechanism):
    """HDF5 caching functions to cache the results of modules."""

    name: str
    _cache_lock: str  # Lockfile path
    _cache_file: str  # Cachefile path

    def _store_data_in_cache(self, result: List[ModuleResponse], indices: List[int]):
        """Store `results` in `handle` for some `indices`.

        Args:
            result (List[Dict]): A list of records to store.
            indices (List[int]): A list of indices to map result to.

        """
        if len(indices) != len(result):
            raise ValueError(
                f"Expecting same length for `indices`({len(indices)}) and `results`({len(result)}."
            )
        with FileLock(self._cache_lock), HDF5FileOpenerWithRetry(
            self._cache_file, "w", libver="latest"
        ) as handle:
            handle.swmr_mode = True
            for idx, res in zip(indices, result):
                arr = to_pickle_bytes(res)
                ds = handle.require_dataset(f"{self.name}/{idx}", shape=arr.shape, dtype=arr.dtype)
                ds[()] = arr
            handle.flush()

    @retry(stop_max_attempt_number=5, wait_fixed=0.5)
    def _check_cache_internal(self, indices: Optional[List[int]]):
        """Try to read the cache up to 5 times (in case there are errors)
              and see if we have all the indices.

        Notes:
            Should not be called directly, please refer to _check_cache instead.

        Args:
            indices: Optional set of indices to verify.

        """
        if indices is None or not os.path.exists(self._cache_file):
            # Not a cacheable query
            return False

        with h5py.File(self._cache_file, "r", libver="latest", swmr=True) as handle:
            if self.name not in handle:
                return False
            task_grp = handle[self.name]
            return all(str(i) in task_grp for i in indices)

    def _check_cache(self, indices: Optional[List[int]]):
        """Check if all indices are in the cache.

        This is used to know if we already have the result of a request.

        Args:
            indices: Optional set of indices to verify.

        """
        try:
            return self._check_cache_internal(
                indices,
            )
        except (OSError, KeyError, RuntimeError, RetryError) as e:
            # NOTE: The file might be corrupted
            # so the key can be there, but not the values.
            print(f"Error accessing cache in {self.name}", e)
            return False

    @retry(stop_max_attempt_number=5, wait_fixed=0.5)
    def _get_cache(self, indices: List[int]):
        """
        Will gather the results of this tasks on some indices.
        Note: we fail if indices are not there.
        Args:
            indices (List[int]): A list of indices to map result to.

        Returns:
            List[Dict], a list of records for the indices.
        """
        with h5py.File(self._cache_file, "r", libver="latest", swmr=True) as handle:
            result = []
            log.debug(f"Get cache from {self._cache_file} for {len(indices)} key(s)")
            for i in indices:
                grp = handle[f"{self.name}/{i}"]
                result.append(from_pickle_bytes(grp[()]))
            return result
