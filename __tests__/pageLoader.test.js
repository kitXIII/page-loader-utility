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
  const pathname = '/page';
  const status = 200;
  const bodyFilePath = path.resolve(__dirname, '__fixtures__/index.html');

  test('Read file', async () => {
    const body = await fsPromises.readFile(bodyFilePath, 'utf8');
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-'));

    nock(host).get(pathname).reply(status, body);

    await pageLoader(`${host}${pathname}`, tmpDir, axios);

    const receivedData = await fsPromises.readFile(path.join(tmpDir, 'localhost-page.html'), 'utf8');
    return expect(receivedData).toBe(body);
  });

  test('Fail on status not equal 200', async () => {
    nock(host).get('/fail').reply(404);
    await expect(pageLoader(`${host}/fail`, os.tmpdir(), axios)).rejects.toThrow();
  });
});
