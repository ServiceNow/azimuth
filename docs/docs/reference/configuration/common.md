# Common fields

```python
class CommonFieldsConfig(ProjectConfig, extra=Extra.ignore):
    """Fields that can be modified without affecting caching."""

    # Where to store artifacts. (HDF5 files,  HF datasets, Dask config)
    artifact_path: str = "/cache"
    # Batch size to use during inference.
    batch_size: int = 32
    # Will use CUDA and will need GPUs if set to True.
    # If "auto" we check if CUDA is available.
    use_cuda: Union[Literal["auto"], bool] = "auto"
```

### Artifact Path

If you are launching the app locally, you can use `/cache` as the artifact path, which is
available in the Docker Image. In any case, be sure that this value is available inside Docker by looking at the `docker-compose.yml` file.


### Batch Size

A higher batch size will make computation faster, depending on the memory available on your machine. The default is set
to `32`.

### Use Cuda

If cuda is available on your machine, set to `true`, otherwise `false`.
Can also be set to "auto" and let the user-code take care of it.