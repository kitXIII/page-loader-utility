import Listr from 'listr';

const listrBatchLoader = (links, oneLinkLoader, ...args) => Promise.all(links
  .map((link) => {
    const task = new Listr([{
      title: `${link.uri}`,
      task: () => oneLinkLoader(link, ...args),
    }]);
    return task.run();
  }));

const promiseAllBatchLoader = (links, oneLinkLoader, ...args) => Promise.all(links
  .map(link => oneLinkLoader(link, ...args)));


export default useListr => (useListr ? listrBatchLoader : promiseAllBatchLoader);
