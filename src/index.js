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

const isDirectoryExists = (dir) => {
  log(`Check if output directory ${dir} exists`);
  return fsPromises.readdir(dir);
};

export default (uri, outputDir, loader = axios) => isDirectoryExists(outputDir)
  .then(() => {
    log(`Try to load page ${uri}`);
    return loader.get(uri);
  })
  .then((response) => {
    log(`Received a response with status ${response.status}`);
    return response.data;
  }).then((data) => {
    const resourcePath = path.join(outputDir, getNameByUrl(uri, '_files'));
    return loadResources(uri, resourcePath, data, loader);
  })
  .then((data) => {
    const outputPath = path.join(outputDir, getNameByUrl(uri, '.html'));
    log(`Try to save page to ${outputPath}`);
    return fsPromises.writeFile(outputPath, data, 'utf8');
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
