#!/usr/bin/env node

import program from 'commander';
import debug from 'debug';
import { version } from '../../package.json';
import pageLoad from '..';

const log = debug('page-loader');
const currentDir = process.cwd();

program
  .version(version)
  .description('Downloads a page from the network and puts it in the specified folder')
  .option('-o, --output [path]', 'path to save the downloaded page', currentDir)
  .arguments('<url>')
  .action((url, options) => {
    log('application start!');
    const { output } = options;
    pageLoad(url, output)
      .then((pageFileName) => {
        log('application has successfully completed!');
        console.log(`\nPage was downloaded as ${pageFileName}`);
      }, (error) => {
        console.error(error.message);
        log('application error');
        process.exitCode = 1;
      });
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
