import path from 'path';
import url from 'url';
import cheerio from 'cheerio';
import _ from 'lodash';
import debug from 'debug';
import { loadResource } from './lib/urls';
import { writeFile, makeDir } from './lib/files';
import { getNameByPathname } from './lib/fileNames';
import getBatchLoader from './lib/batchLoader';

const log = debug('page-loader:load_resources');

const attributes = { script: 'src', img: 'src', link: 'href' };

const getLocalResoucesLinks = (page) => {
  const $ = cheerio.load(page);
  const result = _.keys(attributes).map((tag) => {
    const srcAttr = attributes[tag];
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
    const srcAttr = attributes[tag];
    const newPath = path.join(path.basename(outputPath), getNameByPathname(pathname));
    return $(`${tag}[${srcAttr} = "${pathname}"]`).attr(srcAttr, newPath);
  });
  return $.html();
};

const getlinksProceses = loader => ({
  script: (linkUri, fileSavePath) => loadResource(linkUri, loader, {
    validateStatus: status => status === 200,
  })
    .then(data => writeFile(fileSavePath, data, 'utf8')),

  link: (linkUri, fileSavePath) => loadResource(linkUri, loader, {
    validateStatus: status => status === 200,
  })
    .then(data => writeFile(fileSavePath, data, 'utf8')),

  img: (linkUri, fileSavePath) => loadResource(linkUri, loader, {
    validateStatus: status => status === 200,
    responseType: 'arraybuffer',
  })
    .then((data) => {
      const binaryData = Buffer.from(data);
      return writeFile(fileSavePath, binaryData);
    }),
});

export default (uri, outputPath, page, loader, useListr) => {
  log('Try to get local resources links');
  const links = getLocalResoucesLinks(page);
  const count = links.length;
  log(`Links to resources are received in quantity: ${count}`);
  if (count === 0) {
    log('No resources to download');
    return page;
  }

  const linksProceses = getlinksProceses(loader);
  log(`Use listr: ${useListr}`);
  const batchLoad = getBatchLoader(useListr);

  const preparedLinks = links.map(({ tag, pathname }) => ({
    uri: url.resolve(uri, pathname),
    path: path.resolve(outputPath, getNameByPathname(pathname)),
    process: linksProceses[tag],
  }));

  return makeDir(outputPath)
    .then(() => {
      log(`Run batch load resources of page ${uri}`);
      return batchLoad(preparedLinks);
    })
    .then(() => {
      log('Successful batch processing of resources, try to change links on page');
      const changedPage = changeLocalResourcesLinks(page, links, outputPath);
      log(`Links on page ${uri} was changed`);
      return changedPage;
    });
};
