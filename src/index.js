import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';
// import cheerio from 'cheerio';
// import _ from 'lodash';

const getFileName = url => `${url.match(/(?<=https?:\/\/).+/i)[0].replace(/\W/g, '-')}.html`;

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

export default (url, outputDir, requester = axios) => requester.get(url)
  .then((response) => {
    if (response.status !== 200) {
      throw new Error(`Expected 200, but was ${response.status} for '${url}'`);
    }
    return response.data;
  })
  .then((data) => {
    const fileName = getFileName(url);
    const outputPath = outputDir ? path.join(outputDir, fileName) : fileName;
    return makeDir(outputDir)
      .then(() => fsPromises.writeFile(outputPath, data, { encoding: 'utf8', mode: 0o777, flag: 'a+' }));
  });
