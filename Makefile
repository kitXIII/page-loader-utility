install:
	npm install

run:
	rm -rf trash/*
	npm run babel-node -- src/bin/page-loader.js --output trash https://ya.ru

build:
	rm -rf dist
	npm run build

publish:
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