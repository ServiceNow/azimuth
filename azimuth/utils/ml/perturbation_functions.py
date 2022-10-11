# Copyright ServiceNow, Inc. 2021 – 2022
# This source code is licensed under the Apache 2.0 license found in the LICENSE file
# in the root directory of this source tree.
import contextlib
import re
from typing import List

import nlpaug.augmenter.char as nac

from azimuth.config import PerturbationTestingConfig
from azimuth.types.perturbation_testing import (
    PerturbationType,
    PerturbedUtteranceDetails,
)
from azimuth.utils.ml.third_parties.contractions import ContractionExpansions
from azimuth.utils.validation import assert_not_none

"""
This file contains functions that perturb an utterance, and can be used by
PerturbationTestingModule.
"""


def add_neutral_token(
    original: str, position: str, neutral_tokens: List[str]
) -> List[PerturbedUtteranceDetails]:
    """Add neutral tokens to an utterance at the position indicated.

    Args:
        original: Original utterance.
        position: prefix or suffix.
        neutral_tokens: list of neutral tokens to add.

    Returns:
        List of perturbed utterance details.

    Raises:
        ValueError: if position is invalid.

    """

    results = []
    for neutral_token in neutral_tokens:
        # Create a perturbed_utterance with a new token as prefix and get the predictions.
        if position == "prefix":
            utterance = f"{neutral_token} {original}"
            perturbation_type = PerturbationType.PreInsertion
        elif position == "suffix":
            utterance = f"{original} {neutral_token}"
            perturbation_type = PerturbationType.PostInsertion
        else:
            raise ValueError("Position not supported.")

        results.append(
            PerturbedUtteranceDetails(
                perturbed_utterance=utterance,
                perturbation_type=perturbation_type,
                perturbations=[neutral_token],
            )
        )
    return results


def neutral_prefix(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Add a neutral prefix to an utterance.

    Args:
        original: Original utterance.
        config: Azimuth Config.

    Returns:
         List of perturbed utterance details.

    """
    behavioral_testing_config = assert_not_none(config.behavioral_testing)
    prefix = behavioral_testing_config.neutral_token.prefix_list

    return add_neutral_token(original, "prefix", prefix)


def neutral_suffix(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Add a neutral suffix to an utterance.

    Args:
        original: Original utterance.
        config: Azimuth Config.

    Returns:
        List of perturbed utterance details.

    """
    behavioral_testing_config = assert_not_none(config.behavioral_testing)
    suffixes = behavioral_testing_config.neutral_token.suffix_list

    return add_neutral_token(original, "suffix", suffixes)


def add_all_neutral_tokens(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Add neutral tokens at the beginning and the end of the utterance.

    Args:
        original: Utterance to perturb.
        config: Azimuth Config.

    Returns:
         List of perturbed utterance details.

    """
    return neutral_prefix(original, config) + neutral_suffix(original, config)


def remove_or_add_final_punctuation(
    original: str, punctuation_sign: str
) -> List[PerturbedUtteranceDetails]:
    """Remove or add the specified punctuation sign at the end of an utterance.

    If an utterance's last character is the specified punctuation, it removes it. Otherwise,
    it either replaces the last character (if it's a period, exclamation mark, question mark or
    coma) or adds it.

    Args:
        original: Utterance to perturb.
        punctuation_sign: Punctuation sign to remove or add.

    Returns:
        List of perturbed utterance details.

    """
    last_char = original[-1]
    # Delete punctuation if last character is the specified punctuation sign.
    if last_char == punctuation_sign:
        perturb_utt = original[:-1]
        perturbation_type = PerturbationType.Deletion
    # Replace with specified punctuation if last character is another punctuation sign.
    elif any([p in last_char for p in [".", "!", "?", ","]]):
        perturb_utt = original[:-1] + punctuation_sign
        perturb_utt = re.sub(r" ([.!?,])", r"\1", perturb_utt)  # Remove any penultimate space
        perturbation_type = PerturbationType.Replacement
    # Add specified punctuation otherwise.
    else:
        perturb_utt = original + punctuation_sign
        perturbation_type = PerturbationType.PostInsertion

    return [
        PerturbedUtteranceDetails(
            perturbed_utterance=perturb_utt,
            perturbation_type=perturbation_type,
            perturbations=[punctuation_sign],
        )
    ]


def remove_or_add_final_period(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Remove or add period at the end of an utterance.

    Args:
        original: Utterance to perturb.
        config: Azimuth Config.

    Returns:
        List of perturbed utterance details.

    """
    return remove_or_add_final_punctuation(original, ".")


def remove_or_add_final_question_mark(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Remove or add question mark at the end of an perturbed_utterance.

    Args:
        original: Utterance to perturb.
        config: Azimuth Config

    Returns:
         List of perturbed utterance details.

    """
    return remove_or_add_final_punctuation(original, "?")


def remove_or_add_inside_punctuation(
    original: str, punctuation_sign: str
) -> List[PerturbedUtteranceDetails]:
    """Remove or add a specified punctuation sign inside an utterance.

    It will not touch the punctuation at the end, except if there is just one word in the
    utterance.

    Args:
        original: Utterance to perturb.
        punctuation_sign:  Punctuation sign to add or remove.

    Returns:
        List of perturbed utterance details.

    """
    # If specified punctuation sign is in any position apart from the last, remove it.
    if punctuation_sign in original[:-1]:
        perturb_utt = (
            original[:-1].translate(str.maketrans("", "", punctuation_sign)) + original[-1]
        )
        perturbation_type = PerturbationType.Deletion
    #  Add the specified punctuation sign in the middle of the utterance (or after if there is
    #  only one word. This can produce odd results, such as 2 punctuation signs
    #  one beside the other.
    else:
        all_words = original.split()
        # Position of the added punctuation
        punctuation_position = (len(all_words) - 1) // 2
        perturb_utt = " ".join(
            word + punctuation_sign if pos == punctuation_position else word
            for pos, word in enumerate(all_words)
        )
        perturbation_type = PerturbationType.Insertion
    return [
        PerturbedUtteranceDetails(
            perturbed_utterance=perturb_utt,
            perturbation_type=perturbation_type,
            perturbations=[punctuation_sign],
        )
    ]


def remove_or_add_inside_comma(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Remove or add a comma inside an utterance (not at the end).

    Args:
        original: Utterance to perturb.
        config: Azimuth Config.

    Returns:
        List of perturbed utterance details.

    """
    return remove_or_add_inside_punctuation(original, ",")


def remove_or_add_inside_period(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Remove or add a period inside an utterance (not at the end).

    Args:
        original: Utterance to perturb.
        config: Azimuth Config.

    Returns:
        List of perturbed utterance details.

    """

    return remove_or_add_inside_punctuation(original, ".")


def get_utterances_diff(original_utterance: str, perturbed_utterance: str) -> List[str]:
    return list(set(perturbed_utterance.split()).difference(set(original_utterance.split())))


def typo(original: str, config: PerturbationTestingConfig) -> List[PerturbedUtteranceDetails]:
    """Create different types of typos in an utterance.

    It uses the nlpaug package for this test and introduce mistakes raised by OCR, keyboard typo,
    or common mistakes such as missing a char or swapping two chars. This test will generate
    several perturbed utterances per original utterance, but we limit the number of generated
    augmentations to one per type of augmentation.

    Args:
        original: Utterance to perturb.
        config: Azimuth Config.

    Returns:
       List of perturbed utterance details.

    """

    augmentations = []
    perturbation_types = []
    behavioral_testing_config = assert_not_none(config.behavioral_testing)
    for nb_typo in range(1, behavioral_testing_config.typo.nb_typos_per_utterance + 1):
        augmentations.extend(
            [
                nac.KeyboardAug(min_char=4, aug_word_max=nb_typo, aug_char_p=0.1 * nb_typo),
                nac.RandomCharAug(
                    action="swap", min_char=4, aug_word_max=nb_typo, aug_char_p=0.1 * nb_typo
                ),
                nac.RandomCharAug(
                    action="delete", min_char=4, aug_word_max=nb_typo, aug_char_p=0.1 * nb_typo
                ),
            ]
        )
        perturbation_types.extend(
            [PerturbationType.Replacement, PerturbationType.Swap, PerturbationType.Deletion]
        )

    results = []
    for aug, perturbation_type in zip(augmentations, perturbation_types):
        with contextlib.redirect_stdout(None):
            # While nlpaug fixes their useless print, we ignore it.
            perturbed_utterance = aug.augment(original, n=1)
        # Issue 854 nac adds spaces around the quote/apostrophe and $ sign; remove them.
        perturbed_utterance = re.sub(r" (['’]) ", r"\1", perturbed_utterance)
        perturbed_utterance = re.sub(r"([$]) ", r"\1", perturbed_utterance)
        # nac replaces apostrophes with quotes; revert to original.
        perturbed_utterance = (
            re.sub(r"’", r"'", perturbed_utterance) if "'" in original else perturbed_utterance
        )
        # nac removes space before the final punctuation; re-add them.
        perturbed_utterance = (
            perturbed_utterance[:-1] + " " + perturbed_utterance[-1]
            if re.search(r" [.!?,]", original[-2:])
            else perturbed_utterance
        )
        perturbations = get_utterances_diff(original, perturbed_utterance)
        results.append(
            PerturbedUtteranceDetails(
                perturbed_utterance=perturbed_utterance,
                perturbation_type=perturbation_type,
                perturbations=perturbations,
            )
        )
    return results


def remove_or_add_contractions(
    original: str, config: PerturbationTestingConfig
) -> List[PerturbedUtteranceDetails]:
    """Expand or contract relevant expressions when present in the utterance.

    Args:
        original: Utterance to perturb.
        config: Azimuth Config.

    Returns:
       List of perturbed utterance details.

    """
    contract_exp = ContractionExpansions()
    results = []

    def check_original(new_utt, ori_utt, perturbation_type):
        if perturb_utt != ori_utt:
            perturbations = get_utterances_diff(ori_utt, new_utt)
            return PerturbedUtteranceDetails(
                perturbed_utterance=new_utt,
                perturbation_type=perturbation_type,
                perturbations=perturbations,
            )
        else:
            return None

    perturb_utt = contract_exp.expand_contractions(original)
    result = check_original(perturb_utt, original, PerturbationType.Expansion)
    if result:
        results.append(result)

    perturb_utt = contract_exp.contract(original)
    result = check_original(perturb_utt, original, PerturbationType.Contraction)
    if result:
        results.append(result)

    return results
