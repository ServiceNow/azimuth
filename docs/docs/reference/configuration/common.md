# Common Fields Config

These fields can be modified without affecting the caching.

=== "Class Definition"

    ```python
    class CommonFieldsConfig(ProjectConfig, extra=Extra.ignore):
        """"""
        artifact_path: str = "/cache"
        batch_size: int = 32
        use_cuda: Union[Literal["auto"], bool] = "auto"
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

If Azimuth is run without Docker, the cache needs to be a path with write access (`/cache` will not
work).

## Batch Size

:blue_circle: **Default value**: 32

Batch size to use during inference. A higher batch size will make computation faster, depending on
the memory available on your machine.

## Use Cuda

:blue_circle: **Default value**: `auto`

Azimuth will use CUDA and will need GPUs if set to True. If "auto", Azimuth will check if CUDA is
available.

--8<-- "includes/abbreviations.md"
