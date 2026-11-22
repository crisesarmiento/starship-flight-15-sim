import console from 'node:console';
import { readdir, readFile } from 'node:fs/promises';
import process from 'node:process';
import { URL } from 'node:url';
import { gzipSync } from 'node:zlib';

// Justify any increase to the limit in the PR.
const limitKB = 200;
const assets = new URL('../dist/assets/', import.meta.url);
const files = (await readdir(assets, { withFileTypes: true }))
  .filter(file => file.isFile() && file.name.endsWith('.js'));

if (!files.length) throw new Error('No .js files found in dist/assets');

let bytes = 0;
for (const file of files) {
  bytes += gzipSync(await readFile(new URL(file.name, assets))).length;
}

console.log(`Gzipped JS bundle: ${(bytes / 1000).toFixed(2)} kB (${bytes} bytes); limit: ${limitKB} kB`);
if (bytes > limitKB * 1000) process.exitCode = 1;
