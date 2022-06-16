# Minimal makefile for Sphinx documentation
#
REGISTRY = servicenowdocker
IMAGE = azimuth_docs

.PHONY: html
html:
	mkdocs build

.PHONY: watch
watch:
	mkdocs serve

.PHONY: build_doc
build_doc:
	docker build -t $(REGISTRY)/$(IMAGE) -f Dockerfile.docs .

.PHONY: push_doc
push_doc:
	docker push $(REGISTRY)/$(IMAGE)

.PHONY: server
server:
	docker run -p 8080:8080 --rm -it $(REGISTRY)/$(IMAGE)