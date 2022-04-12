# Azimuth Back-End

The Back-End leverages different components that allows for Azimuth to compute the needed information to analyze the dataset and the model results.
The most important components are `TaskManager`, `DatasetSplitManager` and `Module`.
The components interact nicely together.
* `TaskManager` is a simple `Dask` client. Its job is to manage task launches, leveraging distributed computing. A task is an instance of a module, with a set of specified arguments controlling exactly what will be computed.
* Classes inheriting from `Module` compute everything that requires complex operations on the
  dataset and/or the model.
* `DatasetSplitManager` handles all requests linked to modifying the dataset. Any results from the
  modules which is computed per utterance will be stored in a HuggingFace dataset. Examples:
  predictions and tags.

There are two different computation flows during which the different components interact Manager: the start-up flow and the request flow.

## Computation Flows
Two different flows exist within the app: the start-up tasks flow to load the app, and the request flow once the app is loaded and the user starts interacting with it.
These [semi-sequence graphs](https://miro.com/app/board/o9J_lLJ8c28=/) demonstrate these two flows.

### Start-Up Flow
Some modules can be long to compute, and as such, are added in the [start-up](startup.py) flow to avoid any latency in the web app later on.

1. As soon as the application is launched, an instance of `DatasetSplitManager` is created and initialized with the dataset provided in the user config. An instance of `TaskManager` is also created, which will populate the list of available tasks with `register_tasks()`.
2. The tasks listed in the start-up are spawn using the `TaskManager`.
    * `TaskManager` will receive the request of computing the result for each task. Therefore, it will instantiate the relevant `Module` and schedule it if not found in the cache with `start_task_on_dataset_split()`.
    * The task will be scheduled on the `Dask` cluster.
    * When each task finishes, the start-up flow will save the computations in the HuggingFace dataset by calling `Module.save_results` after completion. This is done by callbacks set when we first started the `Module`. See `azimuth.modules.module.Module.on_end` and `azimuth.startup.on_end` for examples of callbacks.

### Request Flow

Once the start-up flow is finished, the homepage will load. As the user interacts with the app, new
computation requests will be sent to the back-end, as well as annotation requests. An annotation
request happens when the user adds or modifies a value in the dataset, such as a data action tag.

Computation requests are handled as follows:
1. `TaskManager` will receive the request and create the corresponding `Module` instance with the specified arguments that were requested.
2. The `done()` function within `Module` will check in the cache if the results were already computed for the set of arguments that were specified. If the results already exist, the computation will be skipped. Otherwise, the computation will be launched on the cluster.
4. The web server will wait for the completion of the `Module` before returning the response.

Annotation requests are handled as follows:
1. The request will be sent to the `DatasetSplitManager`, which will save the change in the dataset.

## Task Manager
[Task Manager](task_manager.py) is a simple `Dask` client.
Its job is to manage task launches, leveraging distributed computing.

When a request comes in, either in start-up or in the request flow, the following steps will be taken:
1. If dependencies were provided, i.e. other tasks that need to be run before the requested task, Task Manager will handle those first.
2. The Module associated with the task name will be found using `get_task()`.
3. Task Manager will check if the results are already cached, using `Module.done()`.
3. If they are not already cached, it will launch the task and wait for the results, using `Module.result()`.
4. When available, the results will be returned and saved. The ModuleResponse is saved by pickling, hence the response must be picke-able.

> :warning: The actual cache is written in a callback. If the `Future` is done, it does not mean that the cache is written. You need to call `Module.done` to be sure.

### Dask

For distributed computing we use `Dask`. In local mode, it is similar to `concurrent.futures`, but on the Toolkit it allows us to scale to any number of GPUs.

#### Tips & tricks
1. Objects are not shared between workers.
    * Initializing a variable on the main worker won't initialize it on the new worker.
    * Calling `client.run` will run a function on all workers.
    * The source of truth is always in the main thread (do not edit the dataset from the workers).
2. Avoid recomputation.
    * We save every results in the cache. Before starting a computation, remember to look for it in the cache, using `Module.done()`. Our functions such as `get_task_result()` and `TaskManager.get_task()` do it for you.
3. GIL
    * GIL is a global lock, meaning that when you take a Lock, it locks the entire process. Be aware to not "hug the GIL". More info [here](https://realpython.com/python-gil/).

#### Known issues

* [On Github Action] When a worker goes OOM, you will see errors such as
    `distributed.comm.core.CommClosedError: in <closed TCP>: Stream is closed`
    `distributed.scheduler.KilledWorker`
  * To fix this, reduce your test load by supplying less indices or use smaller models/datasets.
* [Anytime] A future might get lost. This can happens when a worker dies or when the scheduler restarts.
  * To fix this, you can call `future.retry()`.
  * Tracked in #58
* [Anytime] We use single-writer-multiple-readers (SMWR) locks in the HDF5, while this is safe **most of the time**, it can happen that we try to read while it is written. This will throw an error, but we will retry 5 times.
* [Anytime] Sometime in the workers, the Dask client is not connecting. We are not sure why. As a workaround, we ignore Dask and run the task synchronously.

## Modules
The `Module` class and its children are the core components of the application where all available computations are written. Due to the complexity of this component, a dedicated README is available [here](modules/README.md)

## Dataset Split Manager
[DatasetSplitManager](dataset_split_manager.py) is one of the two ways that is used to store calculated results. It is created since caching was not seamless when loading pages in the web app.

Since the main use case of this application at the moment is restricted to NLP, the `DatasetSplitManager` is designed to add new columns containing the calculated information per utterance in the `HuggingFace` dataset.

It is important to verify whether the results calculated by any module should be added to the `DatasetSplitManager` columns as well.
It is generally the case when a module computes a result for each utterance, such as predictions and smart tags.
The information stored in the `DatasetSplitManager` will automatically be part of the dataset export that the user can trigger from within the app.

The [syntax tags](modules/dataset_analysis/syntax_tagging.py) is a good example on how all or part of the results calculated in the module can be saved to the `DatasetSplitManager` as smart tags, using `save_result()`.

### Multi-table support
We decided to stick with HuggingFace for the time being, but it doesn't support multiple tables.
So hacked around this by having a `base_dataset` which contains information such as the utterance, it's label, some smart tags.
In addition, we have a dictionary `prediction_tables` which contains columns based on the Pipeline used.
When we request information, we join the base_dataset, and it's prediction table.

**NOTE** This is far from being optimal, but we lack the expertise to move to SQLModel.

## Configuration

Our configuration is strongly-typed by using Pydantic.
In addition, `mypy` will detect typing issues if our code does not conform to the Pydantic model.
