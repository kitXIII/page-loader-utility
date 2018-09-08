import axios from 'axios';
import fs from 'fs';
import path from 'path';
import url from 'url';
import _ from 'lodash';
import debug from 'debug';

import loadResources from './resource-loader';

const { promises: fsPromises } = fs;

const log = debug('page-loader:load_page');
const errorlog = debug('page-loader:error');

const getNameByUrl = (uri, postfix) => {
  const { hostname, pathname } = url.parse(uri);
  const hostParts = hostname.split('.');
  const pathParts = pathname.split('/').filter(v => v);
  return `${_.concat(hostParts, pathParts).join('-')}${postfix}`;
};

const validateUrl = uri => Promise.resolve(log(`Try to validate URL "${uri}"`))
  .then(() => url.parse(uri))
  .catch(() => {
    throw new Error('Can not read input URL');
  })
  .then(({ protocol, host }) => {
    if ((protocol !== 'http:' && protocol !== 'https:') || !host) {
      throw new Error(`URL "${uri}" is not valid`);
    }
    log(`URL "${uri}" is valid`);
    return true;
  });

const checkDir = outputDir => Promise.resolve(log(`Try to check "${outputDir}"`))
  .then(() => fsPromises.access(outputDir, fs.constants.W_OK))
  .then(() => fsPromises.readdir(outputDir))
  .catch((error) => {
    switch (error.code) {
      case 'ENOTDIR':
        throw new Error(`"${outputDir}" is file`);
      case 'ENOENT':
        throw new Error(`Output directory "${outputDir}" not exists`);
      case 'EACCES':
        throw new Error(`Access "${outputDir}" denied. Check your permissions`);
      default:
        throw error;
    }
  })
  .then(() => {
    log(`"${outputDir}" checked: OK`);
    return null;
  });

export default (uri, outputDir, loader = axios) => Promise.resolve(log('Run check input parameters'))
  .then(() => checkDir(outputDir))
  .then(() => validateUrl(uri))
  .then(() => {
    log(`Try to load page ${uri}`);
    return loader.get(uri);
  })
  .then((response) => {
    log(`Response status: ${response.status}`);
    if (response.status !== 200) {
      throw new Error(`Server response status was expected 200 but ${response.status} received`);
    }
    return response.data;
  })
  .then((page) => {
    const resourcesPath = path.join(outputDir, getNameByUrl(uri, '_files'));
    return loadResources(uri, resourcesPath, page, loader);
  })
  .then((processedPage) => {
    const pageFilePath = path.join(outputDir, getNameByUrl(uri, '.html'));
    log(`Try to save page to ${pageFilePath}`);
    return fsPromises.writeFile(pageFilePath, processedPage, 'utf8');
  })
  .then(() => {
    log('SUCCESS');
    return null;
  })
  .catch((error) => {
    errorlog(`FAIL with error: ${error.message}`);
    throw error;
  });
