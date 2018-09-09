import { promises as fsPromises } from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';
import customWriteFile from '../util';

import getBatchLoader from './batch-loader';

const log = debug('page-loader:load_resources');

const getNameByPathname = (pathname) => {
  const { dir, base } = path.parse(pathname);
  const dirParts = dir.split('/').filter(v => v);
  return _.concat(dirParts, base).join('-');
};

const tags = [
  {
    tag: 'script',
    srcAttr: 'src',
    responseType: 'text',
    writeFileProcess: (data, filePath) => customWriteFile(filePath, data, 'utf8'),
  },
  {
    tag: 'img',
    srcAttr: 'src',
    responseType: 'arraybuffer',
    writeFileProcess: (data, filePath) => {
      const binaryData = Buffer.from(data);
      return customWriteFile(filePath, binaryData);
    },
  },
  {
    tag: 'link',
    srcAttr: 'href',
    responseType: 'text',
    writeFileProcess: (data, filePath) => customWriteFile(filePath, data, 'utf8'),
  },
];

const getTagObject = tag => tags.find(item => tag === item.tag);

const getLocalResoucesLinks = (page) => {
  const $ = cheerio.load(page);
  const result = tags.map(({ tag, srcAttr }) => {
    const collection = $(tag).map((i, elem) => $(elem).attr(srcAttr));
    const links = Array.from(collection).filter(link => !url.parse(link).host);
    const resultLinks = _.uniq(links);
    return resultLinks.map(pathname => ({ pathname, tag }));
  });
  return _.flatten(result);
};

const changeLocalResourcesLinks = (page, links, outputPath) => {
  const $ = cheerio.load(page);
  links.forEach(({ pathname, tag }) => {
    const { srcAttr } = getTagObject(tag);
    const newPath = path.join(path.basename(outputPath), getNameByPathname(pathname));
    return $(`${tag}[${srcAttr} = "${pathname}"]`).attr(srcAttr, newPath);
  });
  return $.html();
};

const makeDir = dirPath => Promise.resolve(log(`Check if dir exists ${dirPath}`))
  .then(() => fsPromises.readdir(dirPath))
  .catch((error) => {
    if (error.code === 'ENOENT') {
      log(`It is empty path, try make directory ${dirPath}`);
      return fsPromises.mkdir(dirPath);
    }
    throw error;
  })
  .then(() => {
    log(`Directory ${dirPath} was created`);
    return null;
  });

const loadResource = (link, outputPath, loader) => {
  const { tag, pathname, uri } = link;
  const { responseType, writeFileProcess } = getTagObject(tag);
  log(`Try to load resource ${pathname}`);
  return loader.get(uri, { responseType })
    .catch((error) => {
      const { host } = url.parse(uri);
      if (error.response) {
        throw new Error(`On load ${uri} server ${host} responded with a status code ${error.response.status}`);
      } else if (error.request) {
        throw new Error(`On load ${uri} no respons was received from ${host}`);
      }
      throw error;
    })
    .then((response) => {
      log(`Response status: ${response.status}`);
      return response.data;
    })
    .then((data) => {
      const filePath = path.resolve(outputPath, getNameByPathname(pathname));
      log(`Try to save received resource to ${filePath}`);
      return writeFileProcess(data, filePath, pathname);
    })
    .then(() => {
      log(`Resource ${pathname} was saved localy`);
      return null;
    });
};

export default (uri, outputPath, page, loader, useListr) => {
  log(`Try to load resources of page ${uri}`);
  log('Try to get local resources links');
  const links = getLocalResoucesLinks(page);
  const count = links.length;
  log(`Links to resources are received in quantity: ${count}`);

  if (count === 0) {
    log('No resources to download');
    return page;
  }
  const processedLinks = links.map(link => ({ ...link, uri: url.resolve(uri, link.pathname) }));
  log(`Use listr: ${useListr}`);
  const batchLoad = getBatchLoader(useListr);
  return makeDir(outputPath)
    .then(() => batchLoad(processedLinks, loadResource, outputPath, loader))
    .then(() => {
      const changedPage = changeLocalResourcesLinks(page, links, outputPath);
      log(`Links to resources of page ${uri} was changed`);
      log('SUCCESS');
      return changedPage;
    });
};
