/*eslint-env node*/
const express = require("express");
const app = express();
const cors = require("cors");
const fs = require("fs");
const http = require("http");
const https = require("https");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");

const corsConfig = {
  methods: "GET,POST,PUT,DELETE",
  origin: "*",
  credentials: true,
};

// Configure express.
app.use(cors(corsConfig));

app.use(
  "/api/local",
  createProxyMiddleware({
    pathRewrite: { "^/api/[^/]+/": "/" },
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

// We use `||` rather than `&&` so that if one env var is set but not the other (probably a mistake), we error out.
if (process.env.HTTPS_KEY || process.env.HTTPS_CERT) {
  const tls = {
    key: fs.readFileSync(process.env.HTTPS_KEY),
    cert: fs.readFileSync(process.env.HTTPS_CERT),
  };
  https.createServer(tls, app).listen(port);
} else {
  http.createServer(app).listen(port);
}
console.log(`
API server listening on port ${port}
Server PID: ${process.pid}
`);

module.exports = app;
