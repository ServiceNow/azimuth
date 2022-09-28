# Common Fields Config

These fields are generic and can be adapted based on the user's machine.

=== "Class Definition"

    ```python
    class CommonFieldsConfig(ProjectConfig, extra=Extra.ignore):
        """"""
        artifact_path: str = "/cache"
        batch_size: int = 32
        use_cuda: Union[Literal["auto"], bool] = "auto"
        large_dask_cluster: bool = False
    ```

=== "Config Example"

    Example to append to the config to override the default `batch_size`.

    ```json
    {
      "batch_size": 64,
    }
    ```

## Artifact Path

:blue_circle: **Default value**: `/cache`

Where to store the caching artifacts (`HDF5` files and HF datasets). The value needs to be available
inside Docker (see `docker-compose.yml`). `/cache` is available by default on the docker image.

!!! tip "Not using Docker?"

    If Azimuth is run without Docker, the cache needs to be a path with write access (`/cache` will not
    work).

## Batch Size

:blue_circle: **Default value**: 32

Batch size to use during inference. A higher batch size will make computation faster, depending on
the memory available on your machine.

## Use Cuda

:blue_circle: **Default value**: `auto`

If cuda is available on your machine, set to `true`, otherwise `false`. Can also be set to "auto"
and let the user-code take care of it.

## Large Dask Cluster

:blue_circle: **Default value**: False

The memory of the dask cluster is usually 6GB. For bigger models, that might not be enough. It can be set to 12GB, by setting `large_dask_cluster` to `True`.

--8<-- "includes/abbreviations.md"
