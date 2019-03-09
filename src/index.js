import path from 'path';
import debug from 'debug';
import { writeFile, checkDir } from './lib/files';
import { loadResource as loadPage, validateUrl } from './lib/urls';
import { getNameByUrl } from './lib/fileNames';

import loadResources from './resouces';

const log = debug('page-loader:load_page');
const errorlog = debug('page-loader:error');

export default async (uri, outputDir, useListr = false) => {
  try {
    log('Run check input parameters');
    await checkDir(outputDir);
    validateUrl(uri);

    const pageFileName = getNameByUrl(uri, '.html');
    const pageFilePath = path.join(outputDir, pageFileName);
    const resourcesPath = path.join(outputDir, getNameByUrl(uri, '_files'));

    const page = await loadPage(uri, {
      validateStatus: status => status === 200,
      timeout: 3000,
    });

    const processedPage = await loadResources(uri, resourcesPath, page, useListr);
    await writeFile(pageFilePath, processedPage, 'utf8');
    log('SUCCESS');
    return pageFileName;
  } catch (error) {
    errorlog(`FAIL with error: ${error.message}`);
    throw error;
  }
};
