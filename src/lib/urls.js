import debug from 'debug';
import url from 'url';
import axios from './axios';

const log = debug('page-loader:lib_urls');

const loadResource = async (uri, options = {}) => {
  log(`Try to load resource ${uri}`);
  const { host } = url.parse(uri);
  try {
    const response = await axios.get(uri, options);
    log(`Response status: ${response.status}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`On load ${uri} server ${host} responded with a status code ${error.response.status}`);
    } else if (error.request) {
      throw new Error(`On load ${uri} no respons was received from ${host}`);
    }
    throw error;
  }
};

const validateUrl = (uri) => {
  let parsedUrl;
  try {
    log(`Try to parce url string ${uri}`);
    parsedUrl = url.parse(uri);
  } catch (error) {
    throw new Error('Can not read input URL');
  }
  if ((parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') || !parsedUrl.host) {
    throw new Error(`URL "${uri}" is not valid`);
  }
  log(`URL ${uri} is valid`);
  return true;
};

export { loadResource, validateUrl };
