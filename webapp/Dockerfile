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


FROM builder as production

ENV NODE_ENV=production

WORKDIR /app
COPY yarn.lock yarn.lock
COPY package.json package.json

RUN yarn --production=false;

COPY . /app

RUN yarn --production=false;yarn build;
