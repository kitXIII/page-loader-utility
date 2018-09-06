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
    savePromise: (response, filePath) => fsPromises.writeFile(filePath, response.data, 'utf8'),
  },
  {
    tagName: 'img',
    srcAttr: 'src',
    responseType: 'arraybuffer',
    savePromise: (response, filePath) => {
      const binaryData = Buffer.from(response.data);
      return fsPromises.writeFile(filePath, binaryData);
    },
  },
  {
    tagName: 'link',
    srcAttr: 'href',
    responseType: 'text',
    savePromise: (response, filePath) => fsPromises.writeFile(filePath, response.data, 'utf8'),
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

const changeLocalResourcesLinks = (content, links, outputPath) => {
  const $ = cheerio.load(content);
  links.forEach((link) => {
    const filePath = path.resolve(outputPath, getNameByPathname(link.pathname));
    const baseDirPath = path.resolve(outputPath, '..');
    const newPath = path.relative(baseDirPath, filePath);
    return $(`${link.tagName}[${link.srcAttr} = "${link.pathname}"]`).attr(link.srcAttr, newPath);
  });
  return $.html();
};

const loadResource = (uri, resource, outputPath, loader) => loader
  .get(url.resolve(uri, resource.pathname), { responseType: resource.responseType })
  .then((response) => {
    const savePath = path.resolve(outputPath, getNameByPathname(resource.pathname));
    return resource.savePromise(response, savePath);
  })
  .then(() => resource);

const loadResources = (uri, links, outputPath, content, loader) => fsPromises.mkdir(outputPath)
  .then(() => {
    const arrayOfPromises = links.map(resource => loadResource(uri, resource, outputPath, loader));
    return Promise.all(arrayOfPromises);
  })
  .then(processedLinks => changeLocalResourcesLinks(content, processedLinks, outputPath));

export default (uri, outputPath, content, loader) => {
  const links = getLocalResoucesLinks(content);
  if (links.length === 0) {
    return content;
  }
  return loadResources(uri, links, outputPath, content, loader);
};
