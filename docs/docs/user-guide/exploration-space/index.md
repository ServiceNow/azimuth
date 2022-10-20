# Introduction to Exploration Space

The Exploration Space includes the datasets and predictions of your model in an interactive way.
Explore the utterances and the predictions, spot patterns in errors, and annotate the data to
trigger further work to improve the model's predictions.

![Screenshot](../../_static/images/exploration-space/performance-overview.png)

!!! tip "Access from dashboard"

    Access this space through the header of the dashboard.

    ![Screenshot](../../_static/images/dashboard/top-banner.png)

## Views

Interact with the Exploration Space in different views. Filter the data on any view with the control
panel. Both training and evaluation sets can be explored.

!!! tip "Pipeline dropdown"

    Don't forget the pipeline dropdown in the top banner to see how the performance of different
    pipelines compare. This space also exists without selecting any pipelines, to perform dataset
    analysis.

### [Prediction Overview](performance-overview.md)

* Assess the quality of the metrics for any given subset of the data.
* Visualize the distribution of the confidence scores, according to prediction outcome.
* See the most important words from the utterances, according to prediction outcome.

### [Confusion Matrix](confusion-matrix.md)

* Visualize the model confusion between each pair of intents.

### [Utterance Table](utterance-table.md)

* Explore the utterances, with their labels, predictions, and smart tags.
* Access all utterance details, including the detailed prediction results, the behavioral tests, and
  the most similar utterances.
* Annotate utterances to identify further work.

## Control Panel

All views are affected by the control panel.

!!! tip "Share and save the filters"

    :material-share: The control panel selection can be saved and shared by using the url,
    which contains the selected filters and options.

    :material-arrow-collapse-left: It can also be collapsed to leave more space for the rest of
    the content.

### Evaluation Set and Training Set

![Screenshot](../../_static/images/control-panel/dataset-toggle.png){: style="width:400px"}

Explore the views on both the evaluation and the training set by clicking the toggle. Clicking on a
tab will update the view.

### Excluding Post-Processing

![Screenshot](../../_static/images/control-panel/exlude-post-processing.png){: style="width:300px"}

By default, the predictions are shown after the ML pipeline, including the model prediction and the
post-processing steps (temperature scaling, thresholding, or else). To analyze the model predictions
only, you can exclude the post-processing steps in the exploration space. This will affect the
displayed predictions, as well as related computations: the metrics, the confidence histogram and
the confusion matrix. This will not affect the smart tags, as these would be too long to recompute.

### Filters

Filter the data on any view according to different dimensions of the data, such as the model's
confidence, the utterances label, or the smart tags. The available categories and behaviors of
filters are listed below.

#### Filter Categories

![Screenshot](../../_static/images/control-panel/utterances-search.png){: style="width:200px"}

* **Search a particular string** to filter utterances that contain it.
* Filter predictions based on their **confidence value**. You can specify a minimum and a maximum
  value.
* Filter predictions according to their prediction [**outcomes**](../../key-concepts/outcomes.md).
* Filter by **labeled class** (the target).
* Filter by **predicted class**.
* Filter by [**smart tags**](../../key-concepts/smart-tags.md).
* Filter by user-applied [**proposed actions**](../../key-concepts/proposed-actions.md).

#### Filters Behavior

##### Bars Distribution

* The bar distributions to the right of the filters show the
  prediction [outcome](../../key-concepts/outcomes.md) count for a given filter. Selecting or
  deselecting filters update the bars based on the current selection.
  ![Screenshot](../../_static/images/control-panel/bar-distribution.png){: style="width:400px"}

##### Filters Selection

* The checkbox beside the name of each filter category can be used to **select or deselect all**
  corresponding filters.
* When selecting filters, the other filters that can no longer be selected will be **greyed-out**.
    * Example: selecting a smart tag filter greys out the `NO_SMART_TAGS` option.
* The **number of utterances** currently selected by the filters is shown in parentheses at the top
  of the panel (beside the title `Filters`).
* Click `Clear filters` to **reset all filters** to the default values.

##### Negative filtering

* For smart tag families and proposed actions, you can filter based on the **absence of all available
  filters** within a category, respectively `NO_SMART_TAGS` and `NO_ACTION`.

##### Search
![Screenshot](../../_static/images/control-panel/filter-search.png){: style="width:400px"}

* Use the search bar to find specific filters.

--8<-- "includes/abbreviations.md"
