import { promises as fsPromises } from 'fs';
import debug from 'debug';

const log = debug('page-loader:make_dir');

const makeDir = dirPath => Promise.resolve(log(`Try get info about ${dirPath}`))
  .then(() => fsPromises.stat(dirPath))
  .then((stat) => {
    log(`Info about ${dirPath} was got`);
    if (stat.isFile()) {
      throw new Error(`${dirPath} is an existing file`);
    }
    log('It is an existing directory, go out');
    return true;
  })
  .catch((error) => {
    if (error.code === 'ENOENT') {
      log(`It is empty path, try make directory ${dirPath}`);
      return fsPromises.mkdir(dirPath);
    }
    throw error;
  })
  .then(() => {
    log('SUCCESS');
    return null;
  });

export default makeDir;
