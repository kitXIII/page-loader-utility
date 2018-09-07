import { promises as fsPromises } from 'fs';
import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';

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
    writeFileProcess: (data, filePath) => fsPromises.writeFile(filePath, data, 'utf8'),
  },
  {
    tag: 'img',
    srcAttr: 'src',
    responseType: 'arraybuffer',
    writeFileProcess: (data, filePath) => {
      const binaryData = Buffer.from(data);
      return fsPromises.writeFile(filePath, binaryData);
    },
  },
  {
    tag: 'link',
    srcAttr: 'href',
    responseType: 'text',
    writeFileProcess: (data, filePath) => fsPromises.writeFile(filePath, data, 'utf8'),
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
    const filePath = path.resolve(outputPath, getNameByPathname(pathname));
    const baseDirPath = path.resolve(outputPath, '..');
    const newPath = path.relative(baseDirPath, filePath);
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

const loadResource = (uri, link, outputPath, loader) => {
  const { tag, pathname } = link;
  const { responseType, writeFileProcess } = getTagObject(tag);
  log(`Try to load resource ${pathname}`);
  return loader.get(url.resolve(uri, pathname), { responseType })
    .then((response) => {
      log(`Received a response with status ${response.status}`);
      return response.data;
    })
    .then((data) => {
      const filePath = path.resolve(outputPath, getNameByPathname(pathname));
      log(`Try to save received resource to ${filePath}`);
      return writeFileProcess(data, filePath);
    })
    .then(() => {
      log(`Resource ${pathname} was saved localy`);
      return link;
    });
};

export default (uri, outputPath, page, loader) => {
  log(`Try to load resources of page ${uri}`);
  log('Try to get local resources links');
  const links = getLocalResoucesLinks(page);
  const count = links.length;
  log(`Links to resources are received in quantity: ${count}`);

  if (count === 0) {
    log('No resources to download');
    return page;
  }

  const handlers = [
    makeDir(outputPath),
    Promise.all(links.map(link => loadResource(uri, link, outputPath, loader))),
  ];

  return Promise.all(handlers)
    .then(([, loadedLinks]) => {
      log('Begin to change local resources links');
      const changedPage = changeLocalResourcesLinks(page, loadedLinks, outputPath);
      log(`Links to resources of page ${uri} was changed`);
      return changedPage;
    })
    .then((html) => {
      log('SUCCESS');
      return html;
    });
};
