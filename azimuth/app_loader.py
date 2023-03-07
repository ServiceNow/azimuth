# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

from azimuth.app import start_app
from azimuth.config import parse_args

args = parse_args()
app = start_app(
    config_path=args.config_path, load_config_history=args.load_config_history, debug=args.debug
)
