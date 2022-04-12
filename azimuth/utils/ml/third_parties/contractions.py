"""
Code from https://github.com/GEM-benchmark/NL-Augmenter/blob/main/transformations/
contraction_expansions/transformation.py

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


MIT License

Copyright (c) 2020 Marco Tulio Correia Ribeiro

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
"""
import re

from azimuth.utils.ml.third_parties.transformations_types import SentenceOperation


class ContractionExpansions(SentenceOperation):
    def __init__(self):
        super().__init__()
        self.contraction_map = {
            "ain't": "is not",
            "aren't": "are not",
            "can't": "cannot",
            "can't've": "cannot have",
            "could've": "could have",
            "couldn't": "could not",
            "didn't": "did not",
            "doesn't": "does not",
            "don't": "do not",
            "hadn't": "had not",
            "hasn't": "has not",
            "haven't": "have not",
            "he'd": "he would",
            "he'd've": "he would have",
            "he'll": "he will",
            "he's": "he is",
            "how'd": "how did",
            "how'd'y": "how do you",
            "how'll": "how will",
            "how's": "how is",
            "I'd": "I would",
            "I'll": "I will",
            "I'm": "I am",
            "I've": "I have",
            "i'd": "i would",
            "i'll": "i will",
            "i'm": "i am",
            "i've": "i have",
            "isn't": "is not",
            "it'd": "it would",
            "it'll": "it will",
            "it's": "it is",
            "ma'am": "madam",
            "might've": "might have",
            "mightn't": "might not",
            "must've": "must have",
            "mustn't": "must not",
            "needn't": "need not",
            "oughtn't": "ought not",
            "shan't": "shall not",
            "she'd": "she would",
            "she'll": "she will",
            "she's": "she is",
            "should've": "should have",
            "shouldn't": "should not",
            "that'd": "that would",
            "that's": "that is",
            "there'd": "there would",
            "there's": "there is",
            "they'd": "they would",
            "they'll": "they will",
            "they're": "they are",
            "they've": "they have",
            "wasn't": "was not",
            "we'd": "we would",
            "we'll": "we will",
            "we're": "we are",
            "we've": "we have",
            "weren't": "were not",
            "what're": "what are",
            "what's": "what is",
            "when's": "when is",
            "where'd": "where did",
            "where's": "where is",
            "where've": "where have",
            "who'll": "who will",
            "who's": "who is",
            "who've": "who have",
            "why's": "why is",
            "won't": "will not",
            "would've": "would have",
            "wouldn't": "would not",
            "you'd": "you would",
            "you'd've": "you would have",
            "you'll": "you will",
            "you're": "you are",
            "you've": "you have",
        }
        self.reverse_contraction_map = {value: key for key, value in self.contraction_map.items()}

    def contract(self, sentence):
        """Contract expanded contractions in an utterance (if any)
        Parameters
        ----------
        sentence : str
            input string
        Returns
        -------
        string
            String with contractions contracted (if any)
        """

        reverse_contraction_pattern = re.compile(
            r"\b({})\b ".format("|".join(self.reverse_contraction_map.keys())),
            flags=re.IGNORECASE | re.DOTALL,
        )

        def cont(possible):
            match = possible.group(1)
            first_char = match[0]
            expanded_contraction = self.reverse_contraction_map.get(
                match, self.reverse_contraction_map.get(match.lower())
            )
            expanded_contraction = first_char + expanded_contraction[1:] + " "
            return expanded_contraction

        return reverse_contraction_pattern.sub(cont, sentence)

    def expand_contractions(self, sentence):
        """Expands contractions in an utterance (if any)
        Parameters
        ----------
        sentence : str
            input string
        Returns
        -------
        string
            String with contractions expanded (if any)
        """

        contraction_pattern = re.compile(
            r"\b({})\b".format("|".join(self.contraction_map.keys())),
            flags=re.IGNORECASE | re.DOTALL,
        )

        def expand_match(contraction):
            match = contraction.group(0)
            first_char = match[0]
            expanded_contraction = self.contraction_map.get(
                match, self.contraction_map.get(match.lower())
            )
            expanded_contraction = first_char + expanded_contraction[1:]
            return expanded_contraction

        return contraction_pattern.sub(expand_match, sentence)

    def contractions(self, sentence):
        """Perturbation functions, contracts and expands contractions if present
        Parameters
        ----------
        sentence : str
            input
        Returns
        -------
        list
            List of strings with contractions expanded or contracted
            if no contractions are possible returns the same utterance
        """
        expanded = [self.expand_contractions(sentence), self.contract(sentence)]
        return [t for t in expanded if t != sentence]

    def generate(self, sentence):
        pertubed = self.contractions(sentence)
        if pertubed != []:
            return pertubed
        else:
            return [sentence]
