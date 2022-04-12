# How to Add a New Router

All routes, i.e. the code that is called in the HTTP server, are defined here. The easiest way to create a new one is to start from an existing route. You will need to change the `TAGS`, determine if the route should be a `post` or a `get`, and decide on the arguments that will be needed to call the route. You can use `Depends` to get access to a `DatasetManager` or a `TaskManager`.

!!! tip
    You can call `Depends` on various objects of the app, ask us or look into [app.py](../app.py) to see what's possible.

Once the route is created, it needs to be added in [app.py](../app.py) along with the others. An example below:

```
from azimuth.routers.v1.influence import router as influence_router
...
api_router.include_router(
        influence_router, prefix="/influence", dependencies=[Depends(require_application_ready)]
    )
```

You can now test your application by running `poetry run python runner.py $CFG_PATH --debug`.
The swagger will be up at `0.0.0.0:8091/docs` and you can test your route.
