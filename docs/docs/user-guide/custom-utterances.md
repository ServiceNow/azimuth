# Custom utterances

Azimuth has limited support for "custom utterances", i.e. utterances not part of the initial dataset.

Azimuth offers support through API routes accessible locally at [`http://0.0.0.0:8091/docs#/Custom%20Utterances%20v1`](http://0.0.0.0:8091/docs#/Custom%20Utterances%20v1).

## Data augmentation

To augment a list of utterances, you can follow these intructions:

=== "Python"

    ```python
    from pprint import pprint

    import requests

    utterances = ["welcome to Azimuth",
                  "Don't forget to star our repo!"]

    response = requests.get("http://0.0.0.0:8091/custom_utterances/perturbed_utterances",
                            params={"utterances": utterances}).json()
    pprint([r["perturbedUtterance"] for r in response])
    ```

=== "Output"

    ```bash
    >>> [ 'pls welcome to Azimuth',
          'please welcome to Azimuth',
          ...,
          'Do not forget to star our repo!'
          ]
    ```

## Saliency

If a pipeline allows it, you can get saliency of a custom utterance by doing the following:

=== "Python"

    ```python
    from pprint import pprint

    import requests

    utterances = ["welcome to Azimuth",
                  "Don't forget to star our repo!"]

    response = requests.get("http://0.0.0.0:8091/custom_utterances/saliency",
                            params={"utterances": utterances, "pipeline_index": 0}).json()
    pprint(response)
    ```

=== "Output"

    ```bash
    >>> [{'saliency': [0.08587087690830231,
                        ...
                       ],
          'tokens': ['[CLS]', 'welcome', 'to', 'az', '##im', '##uth', '[SEP]']},
          ...
         ]
    ```