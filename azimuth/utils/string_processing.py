# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.


def clean_utterance(utterance: str, lowercase: bool = True):
    """Converts characters as appropriate for downstream functions (e.g., search, spaCy)

    Args:
        utterance (str): Utterance to be cleaned
        lowercase (bool): Lowercase all characters?

    Returns:
        utterance_clean (str): Cleaned utterance
    """
    utterance_clean = utterance.replace("’", "'")  # Single quote -> apostrophe (unicode 8217 -> 39)
    utterance_clean = utterance_clean.lower() if lowercase else utterance_clean
    return utterance_clean
