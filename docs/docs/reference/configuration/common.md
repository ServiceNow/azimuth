# Common Fields Config

These fields are generic and can be adapted based on the user's machine.

=== "Class Definition"

    ```python
    class CommonFieldsConfig(ProjectConfig, extra=Extra.ignore):
        """"""
        artifact_path: str = "cache"
        batch_size: int = 32
        use_cuda: Union[Literal["auto"], bool] = "auto"
        large_dask_cluster: bool = False
        read_only_config: bool = False
    ```

=== "Config Example"

    Example to append to the config to override the default `batch_size`.

    ```json
    {
      "batch_size": 64,
    }
    ```

## Artifact Path

🔵 **Default value**: `cache`

Where to store artifacts (Azimuth config history, HDF5 files, HF datasets).

!!! tip "Using Docker?"

    Our Azimuth Docker image has `ARTIFACT_PATH=/cache` defined, effectively defining `/cache` as the default `artifact_path`.

## Batch Size

🔵 **Default value**: 32

Batch size to use during inference. A higher batch size will make computation faster, depending on
the memory available on your machine.

## Use Cuda

🔵 **Default value**: `auto`

If cuda is available on your machine, set to `true`, otherwise `false`. Can also be set to "auto"
and let the user-code take care of it.

## Large Dask Cluster

🔵 **Default value**: False

The memory of the dask cluster is usually 6GB. If your models are big or if you encounter garbage collection errors,  you can set the memory to 12GB by setting `large_dask_cluster` to `True`.

## Read-Only Config

🔵 **Default value**: False

This field allows to block the changes to the config when set to `True`. This can be useful in certain context, such as when hosting a demo.

--8<-- "includes/abbreviations.md"
