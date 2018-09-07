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
    const { output } = options;
    log('application start!');
    pageLoad(url, output)
      .catch(e => console.log(e.message))
      .then(() => {
        log('application has successfully completed its work!');
      });
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
