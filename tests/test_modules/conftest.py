# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import pytest

from azimuth.modules.base_classes.artifact_manager import ArtifactManager


@pytest.fixture(autouse=True)
def cleanup_class():
    yield
    # Code that will run after your test, for example:
    ArtifactManager.clear_cache()
