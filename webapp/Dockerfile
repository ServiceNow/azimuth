# syntax = docker/dockerfile:1.2.1
FROM node:14.17.5 AS base

WORKDIR /app


FROM base as test

COPY yarn.lock yarn.lock
COPY package.json package.json

RUN yarn --production=false;

COPY . /app

RUN yarn --production=false;


FROM test as build

RUN yarn build;


FROM base as production

ENV NODE_ENV=production

COPY --from=build /app/build /app/build
COPY --from=build /app/server.js /app/server.js

RUN npm install express http-proxy-middleware cors
CMD node server.js
