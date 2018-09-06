import { promises as fsPromises } from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';

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
    savePromise: (data, filePath) => fsPromises.writeFile(filePath, data, 'utf8'),
  },
  {
    tagName: 'img',
    srcAttr: 'src',
    responseType: 'stream',
    savePromise: (data, filePath) => fsPromises.writeFile(filePath, data),
  },
  {
    tagName: 'link',
    srcAttr: 'href',
    responseType: 'text',
    savePromise: (data, filePath) => fsPromises.writeFile(filePath, data, 'utf8'),
  },
];

const getLocalResoucesLinks = (content) => {
  const $ = cheerio.load(content);

  const result = resources.map((tag) => {
    const elements = $(tag.tagName).map((i, elem) => $(elem).attr(tag.srcAttr));
    const links = Array.from(elements).filter(item => item.search('://') === -1);
    const resultLinks = _.uniq(links);
    return resultLinks.map(pathname => ({ pathname, ...tag }));
  });
  return _.flatten(result);
};

const loadResource = (uri, resource, outputPath, loader) => loader
  .get(url.resolve(uri, resource.pathname), { responseType: resource.responseType })
  .then(response => response.data)
  .then((data) => {
    const savePath = path.resolve(outputPath, getNameByPathname(resource.pathname));
    console.log(savePath);
    return resource.savePromise(data, savePath);
  })
  .then(() => resource);

const loadResources = (uri, links, outputPath, loader) => fsPromises.mkdir(outputPath)
  .then(() => {
    const arrayOfPromises = links.map(resource => loadResource(uri, resource, outputPath, loader));
    return Promise.all(arrayOfPromises);
  });

export default (uri, outputPath, content, loader) => {
  const links = getLocalResoucesLinks(content);
  if (links.length === 0) {
    return content;
  }
  return loadResources(uri, links, outputPath, loader)
    .then(() => content);
};
