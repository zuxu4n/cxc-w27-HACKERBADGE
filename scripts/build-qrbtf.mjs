import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = (file) => new URL(`vendor/qrbtf/${file}`, root);
const read = (file) => readFile(source(file), 'utf8');
// Reuse the supplied CxC vector geometry for the monochrome QR centerpiece.
const logo = await readFile(new URL('dist/assets/cxc-logo.svg', root), 'utf8');
const logoPaths = logo.match(/<path\b[^>]*\/>/g).join('').replace(/ id="[^"]*"/g, '').replace(/#1B66FF/g, '#101010');
const runtime = [
  '/*! QRBTF browser runtime: react-qrbtf 1.2.1; React / ReactDOMServer 16.14.0. MIT licenses: qrbtf-LICENSES.txt */',
  await read('react-16.14.0.production.min.js'),
  await read('react-dom-server-16.14.0.browser.production.min.js'),
  // The published qrbtf UMD build expects the lowercase browser global.
  'window.react = window.React;',
  await read('react-qrbtf-1.2.1.umd.js'),
  'delete window.react;',
  `window.badgeQRLogoPaths = ${JSON.stringify(logoPaths)};`
].join('\n;\n');

const licenses = await Promise.all([
  ['React QRBTF 1.2.1 — CPunisher', 'LICENSE.react-qrbtf.txt'],
  ['React / ReactDOMServer 16.14.0 — Facebook', 'LICENSE.react.txt'],
  ['Lodash (included in the upstream QRBTF bundle)', 'LICENSE.lodash.txt'],
  ['ReactCSS (included in the upstream QRBTF bundle)', 'LICENSE.reactcss.txt'],
  ['QR encoding (included in the upstream QRBTF bundle)', 'LICENSE.qrcode.txt']
].map(async ([name, file]) => `${name}\n${'='.repeat(64)}\n${await read(file)}`));

await writeFile(new URL('dist/assets/qrbtf-runtime.js', root), runtime);
await writeFile(new URL('dist/assets/qrbtf-LICENSES.txt', root), licenses.join('\n\n'));
console.log('Built the local QRBTF runtime and license notices.');
