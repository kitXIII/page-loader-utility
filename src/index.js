import axios from 'axios';
import { promises as fsPromises } from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import _ from 'lodash';

const getName = (link, type) => {
  const translators = {
    html: url => `${url.match(/(?<=https?:\/\/).+/i)[0].replace(/\W/g, '-')}.html`,
    dir: url => `${url.match(/(?<=https?:\/\/).+/i)[0].replace(/\W/g, '-')}_files`,
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
    return resultLinks.map(link => ({ link, type: tag, filename: getName(link, 'file') }));
  });
  return _.flatten(result);
};

const loadResources = (content, outputPath) => {
  const links = getLocalResoucesLinks(content);
  if (links.length === 0) {
    return content;
  }

  return content;
};

export default (url, outputDir, loader = axios) => makeDir(outputDir)
  .then(() => loader.get(url))
  .then(response => response.data)
  .then((data) => {
    const resourcePath = path.join(outputDir, getName(url, 'dir'));
    return loadResources(data, resourcePath);
  })
  .then((data) => {
    const outputPath = path.join(outputDir, getName(url, 'html'));
    return fsPromises.writeFile(outputPath, data, { encoding: 'utf8', mode: 0o777, flag: 'a+' });
  });
