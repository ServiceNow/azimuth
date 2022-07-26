# syntax = docker/dockerfile:1.2.1
FROM node:14.17.5 AS builder
# Same base image
FROM builder as test
WORKDIR /app
COPY yarn.lock yarn.lock
COPY package.json package.json


RUN yarn --production=false;
COPY . /app

RUN yarn --production=false;


FROM builder as prod_builder

ENV NODE_ENV=production

WORKDIR /app
COPY yarn.lock yarn.lock
COPY package.json package.json

RUN yarn --production=false;

COPY . /app

RUN yarn --production=false;yarn build;

FROM builder as production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod_builder /app/build /app/build
COPY --from=prod_builder /app/server.js /app/server.js

RUN npm install express http-proxy-middleware cors
CMD node server.js
