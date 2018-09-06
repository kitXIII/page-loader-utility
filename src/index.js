import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import _ from 'lodash';
import url from 'url';

const getName = (link, type) => {
  const translators = {
    html: uri => `${uri.match(/(?<=https?:\/\/).+/i)[0].replace(/\W/g, '-')}.html`,
    dir: uri => `${uri.match(/(?<=https?:\/\/).+/i)[0].replace(/\W/g, '-')}_files`,
    file: pathname => pathname.match(/^\/?(.+)/i)[1].replace(/\W+(?!\w+$)/g, '-'),
  };
  return translators[type](link);
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
    return resultLinks.map(pathname => ({ pathname, type: tag, filename: getName(pathname, 'file') }));
  });
  return _.flatten(result);
};

const loadResources = (uri, outputPath, content, loader) => {
  const links = getLocalResoucesLinks(content);
  if (links.length === 0) {
    return content;
  }
  console.log(links);
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
    const resourcePath = path.join(outputDir, getName(uri, 'dir'));
    return loadResources(uri, resourcePath, data, loader);
  })
  .then((data) => {
    const outputPath = path.join(outputDir, getName(uri, 'html'));
    return fsPromises.writeFile(outputPath, data, 'utf8');
  });
