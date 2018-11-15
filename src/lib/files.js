import fs from 'fs';
import _ from 'lodash';
import debug from 'debug';

const { promises: fsPromises } = fs;
const log = debug('page-loader:lib_files');

const writeFile = (...args) => {
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

const checkDir = outputDir => Promise.resolve(log(`Check existence of the path: ${outputDir}`))
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
    log(`${outputDir} checked: OK`);
    return null;
  });

const makeDir = dirPath => Promise.resolve(log(`Check existence of the directory: ${dirPath}`))
  .then(() => fsPromises.readdir(dirPath))
  .catch((error) => {
    if (error.code === 'ENOENT') {
      log(`It is empty path, try make directory: ${dirPath}`);
      return fsPromises.mkdir(dirPath);
    }
    throw error;
  })
  .then(() => {
    log(`Directory ${dirPath} was created`);
    return null;
  });

export { writeFile, checkDir, makeDir };
