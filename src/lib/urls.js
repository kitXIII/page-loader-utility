import debug from 'debug';
import url from 'url';

const log = debug('page-loader:lib_urls');

const loadResource = (uri, loader, options = {}) => {
  log(`Try to load resource ${uri}`);
  const { host } = url.parse(uri);
  return loader.get(uri, options)
    .catch((error) => {
      if (error.response) {
        throw new Error(`On load ${uri} server ${host} responded with a status code ${error.response.status}`);
      } else if (error.request) {
        throw new Error(`On load ${uri} no respons was received from ${host}`);
      }
      throw error;
    })
    .then((response) => {
      log(`Response status: ${response.status}`);
      return response.data;
    });
};

const validateUrl = uri => Promise.resolve(log(`Try to validate URL ${uri}`))
  .then(() => {
    log(`Try to parce url string ${uri}`);
    return url.parse(uri);
  })
  .catch(() => {
    throw new Error('Can not read input URL');
  })
  .then(({ protocol, host }) => {
    if ((protocol !== 'http:' && protocol !== 'https:') || !host) {
      throw new Error(`URL "${uri}" is not valid`);
    }
    log(`URL ${uri} is valid`);
    return true;
  });

export { loadResource, validateUrl };
