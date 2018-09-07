import { promises as fsPromises } from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';

import makeDir from './utils';

const log = debug('page-loader:load_resources');

const getNameByPathname = (pathname) => {
  const { dir, base } = path.parse(pathname);
  const dirParts = dir.split('/').filter(v => v);
  return _.concat(dirParts, base).join('-');
};

const resources = [
  {
    tagName: 'script',
    srcAttr: 'src',
    responseType: 'text',
    save: (data, filePath) => fsPromises.writeFile(filePath, data, 'utf8'),
  },
  {
    tagName: 'img',
    srcAttr: 'src',
    responseType: 'arraybuffer',
    save: (data, filePath) => {
      const binaryData = Buffer.from(data);
      return fsPromises.writeFile(filePath, binaryData);
    },
  },
  {
    tagName: 'link',
    srcAttr: 'href',
    responseType: 'text',
    save: (data, filePath) => fsPromises.writeFile(filePath, data, 'utf8'),
  },
];

const getLocalResoucesLinks = (page) => {
  const $ = cheerio.load(page);
  const result = resources.map((tag) => {
    const elements = $(tag.tagName).map((i, elem) => $(elem).attr(tag.srcAttr));
    const links = Array.from(elements).filter(item => item.search('://') === -1);
    const resultLinks = _.uniq(links);
    return resultLinks.map(pathname => ({ pathname, ...tag }));
  });
  return _.flatten(result);
};

const changeLocalResourcesLinks = (page, links, outputPath) => {
  const $ = cheerio.load(page);
  links.forEach((link) => {
    const filePath = path.resolve(outputPath, getNameByPathname(link.pathname));
    const baseDirPath = path.resolve(outputPath, '..');
    const newPath = path.relative(baseDirPath, filePath);
    return $(`${link.tagName}[${link.srcAttr} = "${link.pathname}"]`).attr(link.srcAttr, newPath);
  });
  return $.html();
};

const loadResource = (uri, link, outputPath, loader) => Promise.resolve(log(`Try to load resource ${link.pathname}`))
  .then(() => loader.get(url.resolve(uri, link.pathname), { responseType: link.responseType }))
  .then((response) => {
    log(`Received a response with status ${response.status}`);
    const savePath = path.resolve(outputPath, getNameByPathname(link.pathname));
    log(`Try to save received resource on ${savePath}`);
    return link.save(response.data, savePath);
  })
  .then(() => {
    log(`Resource ${link.pathname} was saved localy`);
    return link;
  });

export default (uri, outputPath, page, loader) => Promise.resolve(log(`Try to load resources of page ${uri}`))
  .then(() => {
    log('Try to get local resources links');
    const links = getLocalResoucesLinks(page);
    const count = links.length;
    log(`Links to resources are received in quantity: ${count}`);
    if (count === 0) {
      throw new Error('NO LINKS');
    }
    return links;
  })
  .then(links => Promise.all([
    makeDir(outputPath),
    Promise.all(links.map(link => loadResource(uri, link, outputPath, loader))),
  ]))
  .then(([, links]) => {
    log('Begin to change local resources links');
    const changedPage = changeLocalResourcesLinks(page, links, outputPath);
    log(`Links to resources of page ${uri} was changed`);
    return changedPage;
  })
  .then((html) => {
    log('SUCCESS');
    return html;
  })
  .catch((error) => {
    if (error.message === 'NO LINKS') {
      log('No links to load, return page');
      return page;
    }
    throw error;
  });
