# Documentation

This is the Azimuth documentation!

### How to

**This assumes that the current working directory is this repo root directory.**

If this is not the case, please remove the `--directory docs` from the commands.

1. Build
    * `make --directory docs build_doc`
2. Push
   * `make --directory docs push_doc`
3. Publish to a new job
   * `make --directory docs publish`
4. Serve locally
   * `make --directory docs server`

From the `/docs` folder, you can run the following command to serve the doc with autoreloading. This is useful when editing the doc: `mkdocs serve`.
