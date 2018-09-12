import { promises as fsPromises } from 'fs';
import _ from 'lodash';
import debug from 'debug';
import url from 'url';

const fileLog = debug('page-loader:write_file');
const loadLog = debug('page-loader:load_resource');

export const customWriteFile = (...args) => {
  const output = _.head(args);
  fileLog(`Try get info about ${output}`);
  return fsPromises.stat(output)
    .then(() => {
      fileLog(`Got stats of ${output}, but expect no stats`);
      throw new Error(`Output "${output}" aready exists`);
    })
    .catch((error) => {
      if (error.code === 'ENOENT') {
        fileLog(`Path ${output} is empty, try to save file`);
        return fsPromises.writeFile(...args);
      }
      throw error;
    });
};

export const customLoadResource = (uri, loader, options = {}) => {
  loadLog(`Try to load resource ${uri}`);
  const { host } = url.parse(uri);
  return loader.get(uri, options)
    .catch((error) => {
      if (error.response) {
        throw new Error(`On load ${uri} server ${host} responded with a status code ${error.response.status}`);
      } else if (error.request) {
        throw new Error(`On load ${uri} no respons was received from ${host}`);
      }
      throw error;
    })
    .then((response) => {
      loadLog(`Response status: ${response.status}`);
      return response.data;
    });
};
