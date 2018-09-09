import url from 'url';
import Listr from 'listr';

import loadResources from './resouces-loader';

export default (uri, outputPath, page, loader, useListr) => {
  const listrLoadBatcher = (links, oneLinkLoader) => {
    const tasks = new Listr(links.map(link => ({
      title: `${url.resolve(uri, link.pathname)}`,
      task: () => oneLinkLoader(uri, link, outputPath, loader),
    })));
    return () => tasks.run();
  };

  const promiseAllLoadBatcher = (links, oneLinkLoader) => () => Promise.all(links
    .map(link => oneLinkLoader(uri, link, outputPath, loader)));

  const loadBatcher = useListr ? listrLoadBatcher : promiseAllLoadBatcher;
  return loadResources(uri, outputPath, page, loadBatcher);
};
