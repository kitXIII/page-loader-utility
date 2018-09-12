import Listr from 'listr';

const listrBatchLoad = (preparedHandlers) => {
  const tasks = new Listr(preparedHandlers.map(({ uri, path, handler }) => ({
    title: uri,
    task: () => handler(uri, path),
  })), { concurrent: true });

  return tasks.run();
};

const promiseAllBatchLoad = preparedHandlers => Promise.all(preparedHandlers
  .map(({ uri, path, handler }) => handler(uri, path)));

export default useListr => (useListr ? listrBatchLoad : promiseAllBatchLoad);
