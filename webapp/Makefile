.PHONY: test
test:
	yarn prettier --check . || (CODE=$? && echo "Try running: yarn prettier --write ." && exit $(CODE))
	CI=true yarn test --no-watch

.PHONY: npm.audit.fix
npm.audit.fix:
	# Inspired from https://stackoverflow.com/a/60878037
	# Make sure the node_modules are exaclty as expected
	rm -rf node_modules
	yarn
	# Convert yarn.lock -> package-lock.json
	npm install --package-lock-only
	rm yarn.lock
	# Fix vulnerabilities
	# Ignoring errors thanks to "-"
	# This test confirms we need both "rm -rf node_modules":
	# If there are no yarn-specific features in pachakge.json, like "resolutions",
	# removing the following line should cause this script to recreate a yarn.lock file identical to the original.
	-npm audit fix
	# Convert package-lock.json -> yarn.lock
	yarn import
	rm package-lock.json
	# Clear up some stuff in the new yarn.lock (not sure why it happens)
	rm -rf node_modules
	yarn
