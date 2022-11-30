# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.


def clean_utterance(utterance: str) -> str:
    """Converts characters as appropriate for downstream functions (e.g., search, spaCy).

    Args:
        utterance: Utterance to be cleaned.

    Returns:
        utterance_clean: Cleaned utterance.

    """
    utterance_clean = utterance.replace("’", "'").lower()  # Quote->apostrophe (unicode 8217 -> 39)
    return utterance_clean
