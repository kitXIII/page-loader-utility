import Listr from 'listr';

const listrBatchLoader = (links, oneLinkLoader, ...args) => {
  const tasks = new Listr(links.map(link => ({
    title: `${link.uri}`,
    task: () => oneLinkLoader(link, ...args),
  })), { concurrent: true });

  return tasks.run();
};

const promiseAllBatchLoader = (links, oneLinkLoader, ...args) => Promise.all(links
  .map(link => oneLinkLoader(link, ...args)));


export default useListr => (useListr ? listrBatchLoader : promiseAllBatchLoader);
