import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';

const getFileName = url => `${url.match(/(?<=https?:\/\/).+/i)[0].replace(/\W/g, '-')}.html`;

export default (url, outputDir, requester = axios) => requester.get(url)
  .then((response) => {
    if (response.status !== 200) {
      throw new Error(`Expected 200, but was ${response.status} for '${url}'`);
    }
    return response.data;
  }).then((data) => {
    const filepath = path.join(outputDir, getFileName(url));
    return fsPromises.writeFile(filepath, data, { encoding: 'utf8', mode: 0o777, flag: 'ax+' });
  });
