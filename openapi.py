import json
import sys

from fastapi.openapi.utils import get_openapi

from azimuth.app import create_app

if __name__ == "__main__":
    app = create_app()
    openapi = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
        tags=app.openapi_tags,
        servers=app.servers,
    )
    json.dump(openapi, sys.stdout)
