#!/usr/bin/env node

import program from 'commander';
import pageLoad from '..';
import { version } from '../../package.json';

program
  .version(version)
  .description('Downloads a page from the network and puts it in the specified folder')
  .option('-o, --output [path]', 'Path to save the downloaded page')
  .arguments('<url>')
  .action((url, options) => {
    const { output } = options;
    pageLoad(url, output);
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
