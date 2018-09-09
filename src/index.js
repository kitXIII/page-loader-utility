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
  .then(() => {
    log(`Try to parce url string "${uri}"`);
    return url.parse(uri);
  })
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
        throw new Error(`Access to "${outputDir}" denied. Check your permissions`);
      default:
        throw error;
    }
  })
  .then(() => {
    log(`"${outputDir}" checked: OK`);
    return null;
  });

const loadPage = (uri, loader) => Promise.resolve(log(`Try to load page "${uri}"`))
  .then(() => loader.get(uri, { validateStatus: status => status === 200, timeout: 3000 }))
  .catch((error) => {
    const { host } = url.parse(uri);
    if (error.response) {
      throw new Error(`Server ${host} responded with a status code ${error.response.status}`);
    } else if (error.request) {
      throw new Error(`No respons was received from ${host}`);
    }
    throw error;
  })
  .then((response) => {
    log(`Page ${response.status} loaded`);
    return response.data;
  });

const saveFile = (output, data) => Promise.resolve(log(`Try get info about ${output}`))
  .then(() => fsPromises.stat(output))
  .then(() => {
    log(`Got stats of ${output}, but expect no stats`);
    throw new Error(`Output "${output}" aready exists`);
  })
  .catch((error) => {
    if (error.code === 'ENOENT') {
      log(`Path ${output} is empty, try to save file`);
      return fsPromises.writeFile(output, data, 'utf8');
    }
    throw error;
  });

export default (uri, outputDir, loader = axios) => Promise.resolve(log('Run check input parameters'))
  .then(() => checkDir(outputDir))
  .then(() => validateUrl(uri))
  .then(() => loadPage(uri, loader))
  .then((page) => {
    const resourcesPath = path.join(outputDir, getNameByUrl(uri, '_files'));
    return loadResources(uri, resourcesPath, page, loader);
  })
  .then((processedPage) => {
    const pageFilePath = path.join(outputDir, getNameByUrl(uri, '.html'));
    return saveFile(pageFilePath, processedPage);
  })
  .then(() => {
    log('SUCCESS');
    return null;
  })
  .catch((error) => {
    errorlog(`FAIL with error: ${error.message}`);
    throw error;
  });
