import path from 'path';
import url from 'url';
import _ from 'lodash';

const getNameByPathname = (pathname) => {
  const { dir, base } = path.parse(pathname);
  const dirParts = dir.split('/').filter(v => v);
  return _.concat(dirParts, base).join('-');
};

const getNameByUrl = (uri, postfix = '') => {
  const { hostname, pathname } = url.parse(uri);
  const hostParts = hostname.split('.');
  const pathParts = pathname.split('/').filter(v => v);
  return `${_.concat(hostParts, pathParts).join('-')}${postfix}`;
};

export { getNameByPathname, getNameByUrl };
