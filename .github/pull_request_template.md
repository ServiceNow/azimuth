Resolve #

## Description:

## Checklist:

You should check all boxes before the PR is ready. If a box does not apply, check it to acknowledge it.

* [ ] **ISSUE NUMBER.** You linked the issue number (Ex: Resolve #XXX). If no issue exists, you added the PR directly to the Azimuth Project.
* [ ] **PRE-COMMIT.** You ran pre-commit on all commits, or else, you
  ran `pre-commit run --all-files` at the end.
* [ ] **FRONTEND TYPES.** Regenerate the front-ent types if you played with types and routes.
  Run `cd webapp && yarn types` while the back-end is running.
* [ ] **USER CHANGES.** The changes are added to CHANGELOG.md and the documentation, if they impact
  our users.
* [ ] **DEV CHANGES.**
    * Update the documentation if this PR changes how to develop/launch on the app.
    * Update the `README` files and our wiki for any big design decisions, if relevant.
    * Add unit tests, docstrings, typing and comments for complex sections.
