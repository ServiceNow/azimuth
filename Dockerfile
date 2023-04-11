ARG DEVICE=cpu

FROM pytorch/pytorch:1.8.1-cuda11.1-cudnn8-runtime as build_gpu
# Copy binaries from other images here
RUN pip install --upgrade pip

FROM python:3.9 as build_cpu
# NOOP step on CPU
FROM build_${DEVICE}

# Set to "dev" for dev deps
ARG STAGE="production"
ARG DEVICE=cpu

ENV STAGE=${STAGE} \
  PYTHONFAULTHANDLER=1 \
  PYTHONUNBUFFERED=1 \
  PYTHONHASHSEED=random \
  PIP_NO_CACHE_DIR=off \
  PIP_DISABLE_PIP_VERSION_CHECK=on \
  PIP_DEFAULT_TIMEOUT=100 \
  POETRY_VERSION=1.1.7 \
  POETRY_HOME="/usr/local/poetry"

RUN apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y curl gcc make && \
    rm -rf /var/lib/apt/lists/*

RUN curl -sSL https://install.python-poetry.org | python - --version 1.4.0 \
    && ln -sf /usr/local/poetry/bin/poetry /usr/local/bin/poetry

# Install dependencies.
COPY poetry.lock pyproject.toml /app/

WORKDIR /app
RUN poetry config virtualenvs.create false && \
  poetry install --extras ${DEVICE} --no-interaction --no-ansi --no-root $(/usr/bin/test $STAGE == production && echo "--no-dev")

# Install the project.
COPY . /app/
RUN poetry install --extras ${DEVICE} --no-interaction --no-ansi $(/usr/bin/test $STAGE == production && echo "--no-dev")
ENV CFG_PATH=
ENV LOAD_CONFIG_HISTORY=
ENV PORT=
ENV ARTIFACT_PATH=/cache
CMD ["sh","-c","umask 0002; python runner.py ${CFG_PATH} ${LOAD_CONFIG_HISTORY:+--load-config-history} ${PORT:+--port ${PORT}}"]
