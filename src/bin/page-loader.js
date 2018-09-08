#!/usr/bin/env node

import program from 'commander';
import pageLoad from '..';
import debug from 'debug';
import { version } from '../../package.json';

const log = debug('page-loader');

program
  .version(version)
  .description('Downloads a page from the network and puts it in the specified folder')
  .option('-o, --output [path]', 'path to save the downloaded page', process.cwd())
  .arguments('<url>')
  .action((url, options) => {
    log('application start!');
    const { output } = options;
    pageLoad(url, output)
      .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
      })
      .then(() => {
        log('application has successfully completed!');
      });
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
