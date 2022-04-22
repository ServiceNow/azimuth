/*eslint-env node*/
const express = require("express");
const app = express();
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

app.use(
  "/api/local",
  createProxyMiddleware({
    pathRewrite: {
      "^/api/[^/]+/": "/", // rewrite path
    },
    target: process.env.REACT_APP_BACKEND_PORT
      ? `http://host.docker.internal:${process.env.REACT_APP_BACKEND_PORT}`
      : "http://host.docker.internal:8091",
    changeOrigin: true,
  })
);

const buildDirPath = path.join(__dirname, "./build");

app.use(express.static(buildDirPath));

// unknown routes should go to index.html as they will be handled by the client
app.get("*", (req, res) => {
  res.sendFile("index.html", { root: buildDirPath });
});

app.use((err, req, res, next) => {
  if (err) {
    const code = err.code || 500;
    return res.status(code).json(err);
  }
});

const port = process.env.PORT || 8080;

app.server = app.listen(port);
console.log(`
API server listening on port ${port}
Server PID: ${process.pid}
`);

module.exports = app;
