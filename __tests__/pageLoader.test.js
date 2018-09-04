import nock from 'nock';
import os from 'os';
import path from 'path';
import { promises as fsPromises } from 'fs';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

describe('Simple page load', async () => {
  const host = 'http://localhost';
  const status = 200;
  const bodyFilePath = path.resolve(__dirname, '__fixtures__/index.html');

  test('Download page and write to file', async () => {
    const pathname = '/page';
    const body = await fsPromises.readFile(bodyFilePath, 'utf8');
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));

    nock(host).get(pathname).reply(status, body);

    await pageLoader(`${host}${pathname}`, tmpDir, axios);

    const receivedData = await fsPromises.readFile(path.join(tmpDir, 'localhost-page.html'), 'utf8');
    return expect(receivedData).toBe(body);
  });

  test('Create output directory if it does not exist', async () => {
    const pathname = '/empty';
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
    const output = path.resolve(tmpDir, 'internal');
    nock(host).get(pathname).reply(status, {});
    await pageLoader(`${host}${pathname}`, output, axios);
    return expect(fsPromises.readdir(tmpDir)).resolves.toContain('internal');
  });

  test('Fail on http-response status not equal 200', async () => {
    const pathname = '/fail';
    nock(host).get(pathname).reply(404);
    await expect(pageLoader(`${host}${pathname}`, os.tmpdir(), axios)).rejects.toThrow();
  });
});
