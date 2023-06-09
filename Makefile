REGISTRY = servicenowdocker
IMAGE = azimuth
TAG = latest
DEVICE = auto
STAGE = production
ENV_FILE = .app_env
export DOCKER_BUILDKIT ?= 1

ifeq ($(DEVICE),auto)
	GPU_AVAILABLE=$(shell nvidia-smi 1>/dev/null 2>/dev/null && echo "success")
	ifeq ($(GPU_AVAILABLE),success)
		export DEVICE=gpu
	else
		export DEVICE=cpu
	endif
endif

ifeq ($(STAGE),production)
    TAG_EXT=
else
    TAG_EXT=_test
endif

ifeq ($(DEVICE),gpu)
	COMPOSE_EXT=-f docker-compose-gpu.yml
else
	COMPOSE_EXT=
endif

include makefiles/Makefile.security
include makefiles/Makefile.test
include makefiles/Makefile.local
include makefiles/Makefile.demo

.PHONY: build
build: build_be build_fe

.PHONY: build_be
build_be:
	docker build \
		--build-arg DEVICE=$(DEVICE) \
		--build-arg STAGE=$(STAGE) \
		-t $(REGISTRY)/$(IMAGE):$(TAG)_$(DEVICE)$(TAG_EXT) \
		.

.PHONY: build_fe
build_fe:
	docker build \
		--target $(STAGE) \
		-t $(REGISTRY)/$(IMAGE)-app:$(TAG)$(TAG_EXT) \
		webapp/.

.PHONY: compose
compose: build launch

.PHONY: launch
launch:
	docker compose -f docker-compose.yml $(COMPOSE_EXT) --env-file $(ENV_FILE) up

.PHONY: push
push:
	docker push $(REGISTRY)/$(IMAGE):$(TAG)_$(DEVICE)$(TAG_EXT)
	docker push $(REGISTRY)/$(IMAGE)-app:$(TAG)$(TAG_EXT)

.PHONY: docs_serve
docs_serve:
	cd docs && mkdocs serve
