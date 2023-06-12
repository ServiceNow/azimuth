from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.status import HTTP_400_BAD_REQUEST, HTTP_404_NOT_FOUND


async def handle_validation_error(request: Request, exception: ValidationError):
    """Handle ValidationError.

    Args:
        request: Request
        exception: ValidationError

    Returns:
        A JSONResponse with the appropriate error status code and content.
    """

    def pretty(location):
        """Get a pretty representation of the error's location.

        Args:
            location: e.g. ["query", "outcome", 0] or ["uncertainty", "iterations"]

        Returns:
            e.g. "query parameter outcome=potato" or "AzimuthConfig['uncertainty']['iterations']"
        """
        if exception.model.__name__ == "Request" and location[0] in {"path", "query"}:
            param_type, param, *index = location
            params = getattr(request, f"{param_type}_params")
            value = params.getlist(param)[index[0]] if index else params.get(param)
            return f"{param_type} parameter {param}{'' if value is None else f'={value}'}"

        return exception.model.__name__ + "".join(f"[{repr(p)}]" for p in location)

    detail = "\n".join(dict.fromkeys(f'{pretty(e["loc"])}: {e["msg"]}' for e in exception.errors()))

    return JSONResponse(
        status_code=HTTP_404_NOT_FOUND  # for errors in paths, e.g., /dataset_splits/potato
        if "path" in (error["loc"][0] for error in exception.errors())
        else HTTP_400_BAD_REQUEST,  # for other errors like in query params, e.g., pipeline_index=-1
        content={"detail": detail},
    )
