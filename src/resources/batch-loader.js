import Listr from 'listr';

const listrBatchLoad = (preparedHandlers) => {
  const tasks = new Listr(preparedHandlers.map(({ uri, path, process }) => ({
    title: uri,
    task: () => process(uri, path),
  })), { concurrent: true });

  return tasks.run();
};

const promiseAllBatchLoad = preparedHandlers => Promise.all(preparedHandlers
  .map(({ uri, path, process }) => process(uri, path)));

export default useListr => (useListr ? listrBatchLoad : promiseAllBatchLoad);
