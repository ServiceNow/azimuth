"""
Code from https://github.com/GEM-benchmark/NL-Augmenter/blob/
26343c2b9116c8886eaaf8aa904e412e6fc64b17/interfaces/SentenceOperation.py#L10

MIT License

Copyright (c) 2021 GEM-benchmark

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Contractions and Expansions List(s) borrowed from https://github.com/marcotcr/checklist/
blob/master/checklist/perturb.py

"""

from typing import List, Tuple


class Operation(object):
    languages = None
    tasks = None
    seed = 0
    heavy = False
    max_outputs = 1

    def __init__(self, seed=0, verbose=False, max_outputs=1):
        self.seed = seed
        self.verbose = verbose
        self.max_outputs = max_outputs
        if self.verbose:
            print(f"Loading Operation {self.name()}")

    @classmethod
    def compare(self, raw: object, pt: List[object]) -> Tuple[int, int]:
        successful_pt = 0
        failed_pt = 0
        for pt_example in pt:
            if pt_example == raw:
                failed_pt += 1
            else:
                successful_pt += 1
        return successful_pt, failed_pt

    @classmethod
    def is_heavy(cls):
        return cls.heavy

    @classmethod
    def domain(cls):
        return cls.tasks, cls.languages

    @classmethod
    def name(cls):
        return cls.__name__


class SentenceOperation(Operation):
    """
    The base class for implementing utterance-level perturbations and transformations.
    "tasks" :: The tasks for which this perturbation is applicable. All the list of tasks are
    given in tasks.TaskType.
    "languages" :: The locales and/or languages for which this perturbation is applicable.
     eg. "es", "mr",
    "en_IN"
    """

    def generate(self, sentence: str) -> List[str]:
        raise NotImplementedError

    def filter(self, sentence: str) -> bool:
        raise NotImplementedError
