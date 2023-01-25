# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import re


def clean_utterance(utterance: str) -> str:
    """Converts characters as appropriate for downstream functions (e.g., search, spaCy).

    Args:
        utterance: Utterance to be cleaned.

    Returns:
        utterance_clean: Cleaned utterance.

    """
    re_irregular_apostrophes = re.compile("[’`]")
    utterance_clean = re_irregular_apostrophes.sub("'", utterance).lower()
    return utterance_clean
