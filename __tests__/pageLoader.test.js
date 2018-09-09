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
const bodySimpleFilePath = path.resolve(__dirname, '__fixtures__/simple.html');
const bodyFilePath = path.resolve(__dirname, '__fixtures__/index.html');

describe('Page load tests', () => {
  test('Download page without resources and write it to file', async () => {
    const pathname = '/page';
    const body = await fsPromises.readFile(bodySimpleFilePath, 'utf8');
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));

    nock(host).get(pathname).reply(status, body);
    await pageLoader(`${host}${pathname}`, tmpDir, axios, false);
    const receivedData = await fsPromises.readFile(path.join(tmpDir, 'localhost-page.html'), 'utf8');
    return expect(receivedData).toBe(body);
  });

  test('Download page with resources', async () => {
    const cssFilePath = path.resolve(__dirname, '__fixtures__/base.css');
    const jsFilePath = path.resolve(__dirname, '__fixtures__/main.js');
    const imgFilePath = path.resolve(__dirname, '__fixtures__/logo.png');

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

    await pageLoader(`${host}${pathname}`, tmpDir, axios, false);

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

describe('Error messages tests', () => {
  describe('File system errors', () => {
    const pathname = '/fsErrors';
    nock(host).get(pathname).reply(status, 'Some text');

    test('Fail with friendly message when output directory not exists', async () => {
      const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
      const output = path.resolve(tmpDir, 'nodirectory');
      await expect(pageLoader(`${host}${pathname}`, output, axios, false)).rejects.toThrowError(`Output directory "${output}" not exists`);
      await expect(fsPromises.readdir(tmpDir)).resolves.not.toContain('nodirectory');
    });

    test('Fail with friendly message when output is file', async () => {
      const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
      const output = path.resolve(tmpDir, 'file');
      await fsPromises.writeFile(output, 'Word', 'utf8');
      await expect(pageLoader(`${host}${pathname}`, output, axios, false)).rejects.toThrowError(`"${output}" is file`);
    });

    test('Fail with friendly message when no access to output directory', async () => {
      const output = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
      await fsPromises.chmod(output, 0o555);
      await expect(pageLoader(`${host}${pathname}`, output, axios, false)).rejects.toThrowError(`Access to "${output}" denied. Check your permissions`);
    });

    test('Fail with friendly message when output file already exists', async () => {
      const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
      const output = path.join(tmpDir, 'localhost-fsErrors.html');
      await fsPromises.writeFile(output, 'Word', 'utf8');
      await expect(pageLoader(`${host}${pathname}`, tmpDir, axios, false)).rejects.toThrowError(`Output "${output}" aready exists`);
    });
  });

  describe('Page load errors', () => {
    test('Fail with friendly message when URL is not valid', async () => {
      const outputPath = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
      await expect(pageLoader('.', outputPath, axios, false)).rejects.toThrowErrorMatchingSnapshot();
      await expect(pageLoader('/addr', outputPath, axios, false)).rejects.toThrowErrorMatchingSnapshot();
      await expect(pageLoader('ftp://localhost.ru', outputPath, axios, false)).rejects.toThrowErrorMatchingSnapshot();
      await expect(pageLoader({}, outputPath, axios, false)).rejects.toThrowErrorMatchingSnapshot();
    });

    test('Fail with friendly message when http-response status not equal 200', async () => {
      const pathname = '/fail';
      nock(host).get(pathname).reply(404);
      await expect(pageLoader(`${host}${pathname}`, os.tmpdir(), axios, false)).rejects.toThrowErrorMatchingSnapshot();
    });

    test('Fail with friendly message when no response from server', async () => {
      await expect(pageLoader('http://noServer.local', os.tmpdir(), axios, false)).rejects.toThrowErrorMatchingSnapshot();
    });
  });

  describe('Resources load errors', () => {
    test('Fail with friendly message when server responds about the inaccessibility of one of the resources', async () => {
      const pathname = '/page/with/problem_links1';
      const body = await fsPromises.readFile(bodyFilePath, 'utf8');
      const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));

      nock(host).get(pathname).reply(status, body);
      nock(host).get('/assets/css/base.css').reply(status, 'css');
      nock(host).get('/assets/js/main.js').reply(status, 'js');
      nock(host).get('/assets/imgs/logo.png').reply('403');

      await expect(pageLoader(`${host}${pathname}`, tmpDir, axios, false)).rejects.toThrowErrorMatchingSnapshot();
    });

    test('Fail with friendly message when there is no server response when loading one of the resources', async () => {
      const pathname = '/page/with/problem_links2';
      const body = await fsPromises.readFile(bodyFilePath, 'utf8');
      const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));

      nock(host).get(pathname).reply(status, body);
      nock(host).get('/assets/css/base.css').reply(status, 'css');
      nock(host).get('/assets/js/main.js').reply(status, 'js');

      await expect(pageLoader(`${host}${pathname}`, tmpDir, axios, false)).rejects.toThrowErrorMatchingSnapshot();
    });

    test('Fail with friendly message when output file for resource already exists', async () => {
      const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'jest-test'));
      const pathname = '/page/with/problem_links3';
      const body = await fsPromises.readFile(bodyFilePath, 'utf8');

      nock(host).get(pathname).reply(status, body);
      nock(host).get('/assets/css/base.css').reply(status, 'css');
      nock(host).get('/assets/js/main.js').reply(status, 'js');
      nock(host).get('/assets/imgs/logo.png').reply(status, {});
      const outputDir = path.resolve(tmpDir, 'localhost-page-with-problem_links3_files');
      const output = path.join(outputDir, 'assets-imgs-logo.png');
      await fsPromises.mkdir(outputDir);
      await fsPromises.writeFile(output, 'Word', 'utf8');
      await expect(pageLoader(`${host}${pathname}`, tmpDir, axios, false)).rejects.toThrowError(`Output "${output}" aready exists`);
    });
  });
});
