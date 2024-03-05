[![Maintainability](https://api.codeclimate.com/v1/badges/65689336d48da74cb617/maintainability)](https://codeclimate.com/github/kitXIII/project-lvl3-s310/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/65689336d48da74cb617/test_coverage)](https://codeclimate.com/github/kitXIII/project-lvl3-s310/test_coverage) [![Build Status](https://travis-ci.org/kitXIII/project-lvl3-s310.svg?branch=master)](https://travis-ci.org/kitXIII/project-lvl3-s310) [![NPM Version](http://img.shields.io/npm/v/kit-page-loader.svg?style=flat)](https://www.npmjs.org/package/kit-page-loader)


# Console page-loader (JS)


Utility that downloads a page from the network and puts it in the specified folder.


## Requirements


Node >= 10


## Install


`$ npm install -g kit-page-loader`


## Get help


`$ page-loader --help`


## Usage


`$ page-loader <url>`

To specify output dir, use --output option:

`$ page-loader --output [path] <url>`


## Example


Example of installation and usage
[![asciicast](https://asciinema.org/a/200426.png)](https://asciinema.org/a/200426?speed=2&autoplay=1&loop=1&size=small)


## Debugging


Page-loader uses debug, so just run with environmental variable DEBUG set to page-loader:*

`$ DEBUG="page-loader*" page-loader.js --output some_dir http://www.someresouce.example`
