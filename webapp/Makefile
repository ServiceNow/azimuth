.PHONY: test
test:
	yarn prettier --check . || (CODE=$? && echo "Try running: yarn prettier --write ." && exit $(CODE))
	CI=true yarn test --no-watch
