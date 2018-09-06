import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';

const getNameByUrl = (uri, postfix) => {
  const { hostname, pathname } = url.parse(uri);
  const hostParts = hostname.split('.');
  const pathParts = pathname.split('/').filter(v => v);
  return `${_.concat(hostParts, pathParts).join('-')}${postfix}`;
};

const getNameByPathname = (pathname) => {
  const { dir, base } = path.parse(pathname);
  const dirParts = dir.split('/').filter(v => v);
  return _.concat(dirParts, base).join('-');
};

const makeDir = dirPath => fsPromises.stat(dirPath)
  .then((stat) => {
    if (stat.isFile()) {
      throw new Error(`On path ${dirPath} there is a file`);
    }
    return true;
  })
  .catch((error) => {
    if (error.code === 'ENOENT') {
      return fsPromises.mkdir(dirPath);
    }
    throw error;
  });

const getLocalResoucesLinks = (content) => {
  const atributes = { script: 'src', img: 'src', link: 'href' };

  const $ = cheerio.load(content);

  const result = _.keys(atributes).map((tag) => {
    const elements = $(tag).map((i, elem) => $(elem).attr(atributes[tag]));
    const links = Array.from(elements).filter(item => item.search('://') === -1);
    const resultLinks = _.uniq(links);
    return resultLinks.map(pathname => ({ pathname, tag, filename: getNameByPathname(pathname) }));
  });
  return _.flatten(result);
};

const loadResources = (uri, outputPath, content, loader) => {
  const links = getLocalResoucesLinks(content);
  if (links.length === 0) {
    return content;
  }
  const { protocol, host } = url.parse(uri);
  const arrayOfPromises = links.map((link) => {
    const config = {
      method: 'get',
      url: url.format({ protocol, host, pathname: link.pathname }),
      responseType: link.tag === 'image' ? 'stream' : 'text',
    };
    const filePath = path.resolve(outputPath, link.filename);
    return loader(config)
      .then(response => response.data)
      .then((data) => {
        const fileEncoding = link.tag === 'image' ? 'utf8' : null;
        return fsPromises.writeFile(filePath, data, fileEncoding);
      })
      .then(() => ({ ...link, relative: path.relative(outputPath, filePath) }));
  });
  return makeDir(outputPath)
    .then(() => Promise.all(arrayOfPromises))
    .then(() => content);
};

export default (uri, outputDir, loader = axios) => makeDir(outputDir)
  .then(() => loader.get(uri))
  .then(response => response.data)
  .then((data) => {
    const resourcePath = path.join(outputDir, getNameByUrl(uri, '_files'));
    return loadResources(uri, resourcePath, data, loader);
  })
  .then((data) => {
    const outputPath = path.join(outputDir, getNameByUrl(uri, '.html'));
    return fsPromises.writeFile(outputPath, data, 'utf8');
  });
