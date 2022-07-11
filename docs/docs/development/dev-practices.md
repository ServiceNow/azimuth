# Development Pratices

## Git Branches

* `main`: Integrates new features, documentation can be lacking. Users will run this branch if they run locally. If they use Docker, they will use our latest release and won't be affected by the latest changes on `main`.
* `release/*`: Branches that can be created to release a version, whenever `main` might contain additional commits which should not be part of the immediate release. `release/*` should be merged in `main` after.

We don't have a convention for the names of regular branches for developing features and fixes.

Each version has its own tag (:material-tag:`v2.0.0` for example) and release package on Github.


## Committing
We try to commit regularly, so it is easy to revert partial changes.

### Front End Types
If you played with types and routes in the back end, remember to regenerate the front-end types, using the following command from the webapp folder while the back end is running (see how to launch [here](launching.md)).
```
cd webapp
yarn types   # while the back end is runnnig
```

### Pre-commit Hooks
When you commit, the pre-commit hooks will automatically be run to format the code included in the commit.
We have different hooks which will run `mypy`, reorder imports, clean unnecessary white-spacing, and perform typical formatting with `black`, `flake8` and `prettier`.

- In some cases, you might need to format using `make format`. However, in most cases, pre-commit hooks will make the necessary changes automatically.
- `mypy` errors will never prevent a commit, but it will print the errors so that you can fix
    them if you introduced a new one.

!!! info "How to temporarily disable pre-commits?"
    For a specific commit, you can avoid running the pre-commits with the flag `--no-verify`. If you do this, make sure to run `pre-commit run --all-files` before opening a PR, which will run the pre-commit on all files.


## Testing
It might be that all tests don't pass at each commit, and this is normal.
Tests can take a while to run, and so you might want to run them only at specific moments, such as before opening a new PR.
When ready to run tests, you can do the following commmands.
```
make format   # It will fix formatting issues.
make test     # It will check for formatting issues, run mypy and all unit tests.
```

You can also only run specific tests, using `poetry run pytest {path_to_test.py}`.

!!! tip "Clean cache for routers tests"
    For tests in `tests/test_routers`, we run the startup task **once** and save the result
    in `/tmp/azimuth_test_cache`. When modifying Modules,
    you need to clean it manually or by running `make clean`.

!!! tip "Regularly launch the app"
    Even when all unit tests pass, it may happen that some new issues arise when launching the app.
    When doing important code changes, it is crucial to launch the app and see if the behavior is as expected.
    Details on launching the app are available [here](launching.md).

## Opening a Pull Request (PR)
We have a template for when you open a PR.
Follow instructions and check the boxes to acknowledge that you have done the required steps.
Regarding the `CHANGELOG.md`, you will need to add your changes only if it is visible for the end-users.
This helps us when building the release notes.
