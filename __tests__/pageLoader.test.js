import nock from 'nock';
import os from 'os';
import path from 'path';
import { promises as fsPromises } from 'fs';
import axios from 'axios';
import httpAdapter from 'axios/lib/adapters/http';
import pageLoader from '../src';

axios.defaults.adapter = httpAdapter;

const host = 'http://localhost';
const status = 200;

describe('Simple page load', () => {
  const bodyFilePath = path.resolve(__dirname, '__fixtures__/simple.html');

  test('Download page and write to file', async () => {
    const pathname = '/page';
    const body = await fsPromises.readFile(bodyFilePath, 'utf8');
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));

    nock(host).get(pathname).reply(status, body);

    await pageLoader(`${host}${pathname}`, tmpDir, axios);

    const receivedData = await fsPromises.readFile(path.join(tmpDir, 'localhost-page.html'), 'utf8');
    return expect(receivedData).toBe(body);
  });

  test('Fail if output directory does not exist', async () => {
    const pathname = '/empty';
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
    const output = path.resolve(tmpDir, 'internal');
    nock(host).get(pathname).reply(status, {});
    await expect(pageLoader(`${host}${pathname}`, output, axios)).rejects.toThrow();
    await expect(fsPromises.readdir(tmpDir)).resolves.not.toContain('internal');
  });

  test('Fail on http-response status not equal 200', async () => {
    const pathname = '/fail';
    nock(host).get(pathname).reply(404);
    await expect(pageLoader(`${host}${pathname}`, os.tmpdir(), axios)).rejects.toThrow();
  });

  test('Fail if output path - an existing path to the file', async () => {
    const pathname = '/empty';
    nock(host).get(pathname).reply(status, {});
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
    const outputPath = path.resolve(tmpDir, 'file');
    await fsPromises.writeFile(outputPath, 'Word', { flag: 'a+' });
    await expect(pageLoader(`${host}${pathname}`, outputPath, axios)).rejects.toThrow();
  });
});

describe('Download local resources', () => {
  const bodyFilePath = path.resolve(__dirname, '__fixtures__/index.html');
  const cssFilePath = path.resolve(__dirname, '__fixtures__/base.css');
  const jsFilePath = path.resolve(__dirname, '__fixtures__/main.js');
  const imgFilePath = path.resolve(__dirname, '__fixtures__/logo.png');

  test('Download page with links', async () => {
    const pathname = '/page/with/links';
    const body = await fsPromises.readFile(bodyFilePath, 'utf8');
    const css = await fsPromises.readFile(cssFilePath, 'utf8');
    const js = await fsPromises.readFile(jsFilePath, 'utf8');
    const img = await fsPromises.readFile(imgFilePath);
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));

    nock(host).get(pathname).reply(status, body);
    nock(host).get('/assets/css/base.css').reply(status, css);
    nock(host).get('/assets/js/main.js').reply(status, js);
    nock(host).get('/assets/imgs/logo.png').reply(status, img);

    await pageLoader(`${host}${pathname}`, tmpDir, axios);

    const assetsDir = path.resolve(tmpDir, 'localhost-page-with-links_files');
    const recivedCssFilePath = path.resolve(assetsDir, 'assets-css-base.css');
    const recivedJsFilePath = path.resolve(assetsDir, 'assets-js-main.js');
    const recivedImgFilePath = path.resolve(assetsDir, 'assets-imgs-logo.png');
    const recivedHtmlFilePath = path.join(tmpDir, 'localhost-page-with-links.html');

    const recivedCss = await fsPromises.readFile(recivedCssFilePath, 'utf8');
    const recivedJs = await fsPromises.readFile(recivedJsFilePath, 'utf8');
    const recivedImg = await fsPromises.readFile(recivedImgFilePath);
    const listOfRecivedfiles = await fsPromises.readdir(assetsDir);
    const recivedHtml = await fsPromises.readFile(recivedHtmlFilePath, 'utf8');

    expect(listOfRecivedfiles).toEqual(['assets-css-base.css', 'assets-imgs-logo.png', 'assets-js-main.js']);
    expect(recivedCss).toBe(css);
    expect(recivedJs).toBe(js);
    expect(recivedImg).toEqual(img);
    expect(recivedHtml).toMatch('localhost-page-with-links_files/assets-css-base.css');
    expect(recivedHtml).toMatch('localhost-page-with-links_files/assets-js-main.js');
    expect(recivedHtml).toMatch('localhost-page-with-links_files/assets-imgs-logo.png');
    expect(recivedHtml).not.toMatch('/assets/css/base.css');
    expect(recivedHtml).not.toMatch('/assets/js/main.js');
    expect(recivedHtml).not.toMatch('/assets/imgs/logo.png');
  });
});
