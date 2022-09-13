# Minimal makefile for documentation

REGISTRY = servicenowdocker
IMAGE = azimuth_docs

.PHONY: build_docs
build_docs:
	docker build -t $(REGISTRY)/$(IMAGE) -f docs/Dockerfile.docs .

.PHONY: push_docs
push_docs:
	docker push $(REGISTRY)/$(IMAGE)

.PHONY: serve_docs
serve_docs:
	docker run -p 8080:8080 --rm -it $(REGISTRY)/$(IMAGE)
