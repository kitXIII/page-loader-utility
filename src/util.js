import { promises as fsPromises } from 'fs';
import _ from 'lodash';
import debug from 'debug';

const log = debug('page-loader:write_file');

const customWriteFile = (...args) => {
  const output = _.head(args);
  log(`Try get info about ${output}`);
  return fsPromises.stat(output)
    .then(() => {
      log(`Got stats of ${output}, but expect no stats`);
      throw new Error(`Output "${output}" aready exists`);
    })
    .catch((error) => {
      if (error.code === 'ENOENT') {
        log(`Path ${output} is empty, try to save file`);
        return fsPromises.writeFile(...args);
      }
      throw error;
    });
};

export default customWriteFile;
