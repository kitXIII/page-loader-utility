#!/usr/bin/env node

import program from 'commander';
import pageLoad from '..';
import { version } from '../../package.json';

program
  .version(version)
  .description('Downloads a page from the network and puts it in the specified folder')
  .option('-o, --output [path]', 'path to save the downloaded page', process.cwd())
  .arguments('<url>')
  .action((url, options) => {
    const { output } = options;
    console.log('output ', output);
    pageLoad(url, output);
  })
  .parse(process.argv);

if (program.args.length === 0) {
  program.help();
}
