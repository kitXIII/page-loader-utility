import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';
import url from 'url';
import _ from 'lodash';
import debug from 'debug';

import loadResources from './resource-loader';

const log = debug('page-loader:load_page');
const errorlog = debug('page-loader:error');

const getNameByUrl = (uri, postfix) => {
  const { hostname, pathname } = url.parse(uri);
  const hostParts = hostname.split('.');
  const pathParts = pathname.split('/').filter(v => v);
  return `${_.concat(hostParts, pathParts).join('-')}${postfix}`;
};

export default (uri, outputDir, loader = axios) => {
  log(`Check if output directory ${outputDir} exists`);
  const pageFilePath = path.join(outputDir, getNameByUrl(uri, '.html'));
  const resourcesPath = path.join(outputDir, getNameByUrl(uri, '_files'));
  return fsPromises.readdir(outputDir)
    .then(() => {
      log(`Try to load page ${uri}`);
      return loader.get(uri);
    })
    .then((response) => {
      log(`Response status: ${response.status}`);
      return response.data;
    })
    .then(page => loadResources(uri, resourcesPath, page, loader))
    .then((processedPage) => {
      log(`Try to save page to ${pageFilePath}`);
      return fsPromises.writeFile(pageFilePath, processedPage, 'utf8');
    })
    .then(() => {
      log('SUCCESS');
      return null;
    })
    .catch((error) => {
      const msg = error ? error.message : '';
      errorlog(`FAIL with error: ${msg}`);
      throw error;
    });
};
