import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';
import url from 'url';
import _ from 'lodash';

import loadResources from './resources';

const getNameByUrl = (uri, postfix) => {
  const { hostname, pathname } = url.parse(uri);
  const hostParts = hostname.split('.');
  const pathParts = pathname.split('/').filter(v => v);
  return `${_.concat(hostParts, pathParts).join('-')}${postfix}`;
};

const makeDir = dirPath => fsPromises.stat(dirPath)
  .then((stat) => {
    if (stat.isFile()) {
      throw new Error(`On path ${dirPath} there is a file`);
    }
    return true;
  })
  .catch((error) => {
    if (error.code === 'ENOENT') {
      return fsPromises.mkdir(dirPath);
    }
    throw error;
  });

export default (uri, outputDir, loader = axios) => makeDir(outputDir)
  .then(() => loader.get(uri))
  .then(response => response.data)
  .then((data) => {
    const resourcePath = path.join(outputDir, getNameByUrl(uri, '_files'));
    return loadResources(uri, resourcePath, data, loader);
  })
  .then((data) => {
    const outputPath = path.join(outputDir, getNameByUrl(uri, '.html'));
    return fsPromises.writeFile(outputPath, data, 'utf8');
  });
