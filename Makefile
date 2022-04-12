REGISTRY = azimuth
IMAGE = azimuth
TAG = latest
DEVICE = cpu
STAGE = production
ENV_FILE = .app_env
export DOCKER_BUILDKIT ?= 1

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

.PHONY: build
build: build_be build_fe

.PHONY: build_be
build_be:
	docker build \
		--build-arg DEVICE=$(DEVICE) \
		--build-arg STAGE=$(STAGE) \
		-t $(REGISTRY)/$(IMAGE)_$(DEVICE):$(TAG)$(TAG_EXT) \
		.

.PHONY: build_fe
build_fe:
	docker build \
		--target $(STAGE) \
		webapp/.

.PHONY: compose
compose: build launch

.PHONY: launch
launch:
	docker-compose -f docker-compose.yml $(COMPOSE_EXT) --env-file $(ENV_FILE) up

define FROM_FILE_PYSCRIPT
import sys, os, shutil
pjoin = os.path.join
name, file = sys.argv[1], sys.argv[2]
ROOT = './azimuth_shr/local_files'
folder = pjoin(ROOT, name)
os.makedirs(folder, exist_ok=True)
for line in open(file, 'r').readlines():
    line = line.strip()
    if line:
        print("Copy", line, "in", folder)
        shutil.copy(line, folder)
endef
export FROM_FILE_PYSCRIPT

.PHONY: from_file
from_file:
    ifndef NAME
		@echo 'NAME is not defined';
		exit 1
    endif
    ifndef FILE
		@echo 'FILE is not defined';
		exit 1
    endif
	python -c "$$FROM_FILE_PYSCRIPT" $(NAME) $(FILE);
	$(MAKE) CFG_PATH="/azimuth_shr/local_files/$(NAME)" launch