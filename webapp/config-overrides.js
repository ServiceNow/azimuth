module.exports = {
  webpack: function override(config, env) {
    config.output.library = "azimuth";
    config.output.libraryTarget = "umd";
    config.output.filename = "static/js/[name].js";

    config.optimization.runtimeChunk = false;
    delete config.optimization.splitChunks;

    return config;
  },
};
