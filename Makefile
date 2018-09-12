install:
	npm install

run:
	rm -rf trash/*
	npm run babel-node -- src/bin/page-loader.js --output trash https://www.iana.org/domains/reserved

build:
	rm -rf dist
	npm run build

publish:
	npm publish

publish-patch:
	npm version patch
	npm publish

lint:
	npx eslint .

test:
	npm test

test-debug:
	DEBUG="page-loader*" npm test

watch:
	npm run watch

.PHONY: test debug