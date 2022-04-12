const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = (app) => {
  app.use(
    "/api/local",
    createProxyMiddleware({
      pathRewrite: { "^/api/local/": "/" },
      target: `http://localhost:${process.env.REACT_APP_BACKEND_PORT || 8091}`,
      changeOrigin: true,
    })
  );
};
