# Uncertainty Estimation

## What is it?

Uncertainty estimation is a field of machine learning that aims to determine when a model is
uncertain of its prediction. By nature, deep learning models are overconfident and their predictions
are not trustworthy[^1] . It is possible for a model to output a prediction with high
confidence and still be uncertain.

Uncertainty is split into two distinct sources: data uncertainty and model uncertainty. Data
uncertainty, also called aleatoric uncertainty, comes from mislabelled examples, noisy data,
overlapping classes, etc. Model uncertainty, also called epistemic uncertainty, relates to
uncertainty around the model's parameters. As such, epistemic uncertainty is going to be high when a
data sample is close to the model's decision boundary.

It is important to know that while epistemic uncertainty can be reduced with more data, the
intrinsic noise that produces aleatoric uncertainty can't be reduced with more data. More
information on uncertainty estimation can be found in the
[BAAL documentation](https://baal.readthedocs.io/en/latest/literature/core-papers.html#how-to-estimate-uncertainty-in-deep-learning-networks).

## Where is it used in Azimuth?

Azimuth has some simple uncertainty estimation capabilities. If an uncertainty configuration is
provided in the config file, Azimuth assigns a [:material-link: Smart Tag](smart-tags.md) for
utterances with high
epistemic uncertainty. These utterances tend to be outliers or mislabeled examples.

## How is it computed?

### Epistemic Uncertainty Smart Tag

On Pytorch models, Azimuth leverages
MC-Dropout ([Gal et al. 2015](https://arxiv.org/abs/1506.02142))[^2]. MC-Dropout draws multiple sets
of weights from the model's posterior distribution, effectively creating a Bayesian ensemble. This
type of ensemble is weaker than a regular ensemble, as there is a high correlation between each
member of the ensemble[^4].

It uses this weak ensemble to estimate the epistemic uncertainty using BALD (
[Houlsby et al. 2013](https://arxiv.org/abs/1112.5745)). The maximum BALD value is `log(C)`
where `C` is the number of classes. Predictions with high epistemic uncertainty are data points for
which slight changes in the model parameters can cause significant changes in the predictions. On
models that do not have any Dropout layers, this has no effect.

## Configuration

[:material-link: Model Contract Configuration](../reference/configuration/model_contract.md)
offers some attributes to enable uncertainty quantification, by defining the number of iterations
for MC-Dropout, and the threshold value for the smart tag.

[^1]:Evaluating Scalable Uncertainty Estimation Methods for DNN-Based Molecular Property Prediction.
Scalia et al. J. Chem. Inf. Model, 2020
[^2]:Dropout as a bayesian approximation: Representing model uncertainty in deep learning. Gal and
Ghahramani, ICML, 2020
[^3]:Bayesian active learning for classification and preference learning. Houlsby et al. arXiv
preprint arXiv:1112.5745, 2011
[^4]:The power of ensembles for active learning in image classification. Beluch et al. CVPR, 2018

--8<-- "includes/abbreviations.md"
