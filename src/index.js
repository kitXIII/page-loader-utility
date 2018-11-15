import axios from 'axios';
import path from 'path';
import debug from 'debug';
import { writeFile, checkDir } from './lib/files';
import { loadResource as loadPage, validateUrl } from './lib/urls';
import { getNameByUrl } from './lib/fileNames';

import loadResources from './resouces';

const log = debug('page-loader:load_page');
const errorlog = debug('page-loader:error');

export default (uri, outputDir, loader = axios, useListr = true) => Promise.resolve(log('Run check input parameters'))
  .then(() => checkDir(outputDir))
  .then(() => validateUrl(uri))
  .then(() => loadPage(uri, loader, {
    validateStatus: status => status === 200,
    timeout: 3000,
  }))
  .then((page) => {
    const resourcesPath = path.join(outputDir, getNameByUrl(uri, '_files'));
    return loadResources(uri, resourcesPath, page, loader, useListr);
  })
  .then((processedPage) => {
    const pageFilePath = path.join(outputDir, getNameByUrl(uri, '.html'));
    return writeFile(pageFilePath, processedPage, 'utf8');
  })
  .then(() => {
    log('SUCCESS');
    return getNameByUrl(uri, '.html');
  })
  .catch((error) => {
    errorlog(`FAIL with error: ${error.message}`);
    throw error;
  });
