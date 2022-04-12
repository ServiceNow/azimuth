# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.

import uvicorn

from azimuth.config import parse_args

if __name__ == "__main__":
    args = parse_args()

    kwargs = dict(
        app="azimuth.app_loader:app",
        host="0.0.0.0",
        port=int(args.port),
        reload=args.debug,
        debug=args.debug,
        workers=1,
        reload_dirs=["azimuth"],
    )

    uvicorn.run(**kwargs)
