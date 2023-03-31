# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import os
import tempfile
from os.path import join as pjoin

import dask
import distributed
import structlog
from distributed import SpecCluster

log = structlog.get_logger()


def default_cluster(large=False) -> SpecCluster:
    """Create a default Dask cluster for scheduling.

    Args:
        large: Whether workers have 12Gb of mem or 6Gb.

    Notes:
        1. We start workers as non-daemon as we need to spawn workers in the workers.
        2. If one wants to make their own cluster please see:
            https://docs.dask.org/en/latest/how-to/deploy-dask-clusters.html

    Returns:
        A LocalCluster with 2 workers.
    """
    dask_envs = {
        "DASK_DISTRIBUTED__WORKER__DAEMON": "False",
        "DASK_DISTRIBUTED__WORKER__MULTIPROCESSING_METHOD": "fork",
    }
    os.environ.update(dask_envs)

    # Start the cluster locally
    memory_limit = "12GB" if large else "6GB"
    log.info(f"Starting cluster locally with {memory_limit} of memory!")
    tmp_file = pjoin(str(tempfile.mkdtemp()), "dask-worker-space")
    with dask.config.set({"distributed.worker.daemon": False}):
        cluster = distributed.LocalCluster(
            n_workers=2,  # Assignment to workers is hard-coded, so it needs to stay 2.
            local_directory=tmp_file,
            threads_per_worker=1,
            memory_limit=memory_limit,  # "auto" doesnt work well.
        )
    return cluster
