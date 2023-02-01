# Modules
The [Module API](base_classes/module.py) is the core design for any task launched by this app.
It ensures:
* Proper interaction with `TaskManager`, leveraging distributed computing via `start_task_from_dataset()`.
* Effective collection of the results from all the Dask workers using `result()`, and utilization of caching so computations are only done once.
* Proper interaction with `DatasetSplitManager` to have access to all the dataset updates.

When requesting a module to be computed, different arguments need to be set:
* `dataset_split_name`: Defines on which dataset split the module should be computed. Some modules need both splits and take `DatasetSplitName.all`.
* `config`: Azimuth config defined by the user, which may contain some attributes that will affect the computations.
* `mod_options`: Different module options can be defined that will affect how the computations are being done.
    * `indices`: For some modules only (see details below), indices can be sent to get the results for the specified indices only.
    * `filters`: For some modules only (see details below), filters can be sent to get the results for the filtered dataset only.

# Implementation
## Module API
Each task follows the same `Module` API.
We implement `compute_on_dataset_split()` that will get the result on the entire dataset and `compute()` that computes on a specific batch.
On some tasks, there is no need to implement `compute()`, such as Aggregation Modules working on full datasets.

 ```python
from typing import List

from datasets import Dataset

from azimuth.modules.base_classes import Module
from azimuth.types import ModuleResponse


class YourModule(Module):
    def compute_on_dataset_split(self) -> List[ModuleResponse]:
        ...

    def compute(self, batch: Dataset) -> List[ModuleResponse]:
        ...
 ```

Each `Module` returns a `List[ModuleResponse]` which is the result for each index or set of indices
requested. This is a pydantic object that you need to inherit from.

* The length of this list will vary based on the parent module, as described in the next section.
* We usually override the return type to an object that better describes the output of the module.
  The new type should still be wrapped in a list. So `mypy` does not complain, we
  add `# type: ignore` to the function signature line.

## Parent Modules

When creating a new module, one crucial decision is to determine what type of Module it should
inherit from. Different options are available, with different particularities.

![Modules Architecture](../../docs/docs/_static/images/development/modules_architecture.png)

### Module

- This is the parent module. No Module should directly inherit from it. It includes a lot of the
  basic methods that apply to all modules.
- All module options are ignored by default (`required_mod_options` and `optional_mod_options` are
  empty) in this module.

### Indexable Module

- It works based on indices, and its results will be the same length as the number of indices that
  were requested. This has crucial implications for caching: the cache can be retrieved per indices,
  i.e. if we request results for a set of indices that is partially different from a previous set of
  indices, only the missing indices will be computed.
- `optional_mod_options` include `indices` for that purpose.
- `.get_dataset_split()` returns a subset of the `dataset_split`, based on `indices`.

#### Dataset Result Module

- It inherits from Indexable Module.
- It implements a new method, `.save_result()`, which saves the result of the module in the
  huggingface dataset.

##### Model Contract Module

- It inherits from Dataset Result Module, and is a module that wraps models.
- These modules handle all the tasks which are in need of direct access to the model in order to
  compute their results (e.g. prediction, saliency).
- `required_mod_options` include both `model_contract_method_name` and `pipeline_index`.
- `optional_mod_options` include options that can affect models, such as the `threshold`.

### Aggregation Module
- This module inherits from `Module`, and so the same methods and attributes are available.
- This module performs an aggregation, which makes the length of the module's result not equal to the number of data points that were requested. For example, the metric module will compute `X` metrics, based on a set of `n` data points. This has crucial implications for caching, as the module needs to be recomputed as soon as the set of data points is changed. For that reason, the result of an aggregation task needs to be a list of length one.

#### Filterable Module
- This module inherits from `AggregationModule` and is similar in all points.
- `required_mod_options` include `pipeline_index` since all filterable modules require filtering on the dataset, which involve predictions.
- `optional_mod_options` include `filters`, which mean the dataset can be filtered using `DatasetFilters` (as opposed to regular modules which use indices only).
- As such, `.get_dataset_split()` returns a subset of the `dataset_split`, based on `filters`.


#### Comparison Module
- This module inherits from `AggregationModule` and is similar in all points. The only difference it that it works on multiple dataset split at the same time. As such, it only accepts `DatasetSplitName.all`.

> :warning: **One more time:** All aggregation modules need to have a list of length one as a result. Indexable modules need to have a result length equal to the number of indices (or to the full dataset split if no indices are specified). More details on caching is available in the section Caching below.

Because the user can make changes to the dataset, we needed to add a Mixin that can be added to Modules that will need to be recomputed if the user change the dataset.
- Expirable Mixin
    - This module needs to be recomputed every time the user makes a change to the dataset. This
      usually happens because of the use of data action tags in the filter in module options, which
      can lead to a different set of data points once the user starts to annotate. This also happens when thresholds are edited in the config, which recompute some smart tags.
    - Since it is a Mixin, it is added as a second inheritance to Modules that need it.

## ConfigScope

A Module is assigned a scope, for example the `ModelContractConfig` is used when you need access to the model.
The caching mechanism is based on the Module's scope. This way, we can have more robust caching
where we invalidate the cache only when a field used by the Module is changed.

You can define your Module as such to use a Scope. Scopes are defined in [../config.py](../config.py).

```python
class YourModule(Module[ModelContractConfig]):
    ...
```

While it is possible to not assign a Scope, `mypy` won't be able to help you.

## Class Variables to Define
Some class variables may need to be overridden for a new module, to ensure that the module throws if not called accordingly. This also has crucial implications for the cache: the module results will not be regenerated for nothing.

For example, it should throw if a module is called with the wrong dataset_split, or called with mod_options that should not affect the module's results.

### Allowed Splits
`allowed_splits` defines which `dataset_split_name` that can be sent to the module.
* The default is that both train and test can be sent.
* We override this attribute when necessary, such as for Comparison Modules.

### Required Mod Options
`required_mod_options` is a set containing all `mod_options` that are mandatory for a given module.
* By default, the set is empty.
* Different default values are available in the different parent modules below. When overriding the default values, the values from the parent module should be added to the set.

### Optional Mod Options
Similarly, `optional_mod_options` is a set containing `mod_options` that are optional for a given module.

## Artifact Manager

When you call `self.get_dataset_manager()`, `self.get_dataset()`, `self.get_model()`, the value is stored in a singleton from `ArtifactManager`.
This can cause issues when we send `Module` on the distributed network as we need to copy these objects which can add latency to the network.

It is safe to run these methods during `compute_on_dataset_split()` and `compute()` as this is run on the workers.
In addition, we have sections of the code where we give the `DatasetSplitManager` directly, `save_result` for example.

There shouldn't be any occurrence where we need the model or the dataset outside a Module, except when calling `self.get_indices()` in caching methods from `Module`, and in tests.

## Connecting to the Task Manager

Once the new module is implemented, it needs to be added to the set of supported modules that the task manager can launch.

1. Add your new module to the relevant enum:
    * For regular modules, it should be in `azimuth.types.general.modules.SupportedModule`.
    * For domain specific modules, if you add a method, it should be added in `azimuth.types.general.modules.SupportedMethod`. The module should be added to `azimuth.types.general.modules.SupportedModelContract`.
2. For Domain Specific Modules only, add a method in `azimuth.modules.module.DomainSpecificModule` if your module implements a new method. Define its route in `route_request()`.
3. Add a new mapping so the task manager knows what module should be launched.
    * For domain specific modules, it should be both in `azimuth.modules.model_contract_task_mapping` and `azimuth.modules.task_mapping`.
    * For all other modules, it should be in `azimuth.modules.task_mapping`


# Calling a Module

There are different ways to call a module.
Calling directly `compute_on_dataset_split()`or `compute()` works for tests, but should not be used otherwise, since it ignores the cache.
There are two ways to launch a task:
- If you are calling a `Module` from a place where a `TaskManager` is defined, such as the start-up task, you can use it to launch the task.
- If you are calling a Module where you don't have access to a `TaskManager`, such as from another module, you can use `azimuth.modules.task_execution.get_task_result` to get the result safely.

## With a `TaskManager`

You can call `TaskManager.get_task()` with the `Module` parameters to get the `Module` back.
If the task has been requested before, it will return the same object.
If the Module is not `done()`, the task will be launched.
Be aware that the `Module` computation is not necessarily completed when you get the Module back.

In addition, we can supply `dependencies` which is a list of other Modules that we **need** to be completed before we start the computation.
This is useful when the dependency edits the HuggingFace Dataset that our `Module` needs for its computation.

## Without a `TaskManager`

The function `azimuth.modules.task_execution.get_task_result` will launch the task for you on a `Dask`client.
Note the `result_type` argument, it is only used for `mypy` so that `get_task_result` returns the correct type.
See the example above how you would get the results of another module from `MyModule`.

```python
from typing import List

from azimuth.modules.base_classes import Module
from azimuth.modules.task_execution import get_task_result
from azimuth.types import ModuleResponse


class AnotherModule(Module):
    ...


class MyModule(Module):
    def compute_on_dataset_split(self):
        inner_module = AnotherModule(...)
        result = get_task_result(task_module=inner_module, result_type=List[ModuleResponse])
```

You can explore the function `get_task_result` in our repo to see how we first check in the cache, get a client, and start the task.

# Caching

Every module result is cached in a HDF5 file. This allows for random-access to the file and avoids
re-computation. The caching is implemented in `azimuth.modules.caching.HDF5CacheMixin`. A new cache
is generated everytime the `.name` of the module changes. The `.name` is generated automatically
based on the `task_name`, the `dataset_split_name`, and two striped hash sequences, based on
either `required_mod_options`/`optional_mod_options` values (minus `indices`) or `config` attribute values. By default, a
new cache folder is created when one of the attribute value from the `ProjectConfig` is changed.
This includes attributes related to the dataset.
