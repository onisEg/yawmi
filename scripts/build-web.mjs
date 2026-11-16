// Stage only the public web assets for Capacitor's native Android WebView.
// This script does not touch the deployed site, original assets, or Supabase.
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const webDir = join(root, 'dist');
const assets = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'sw.js'
];

await rm(webDir, { recursive: true, force: true });
await mkdir(webDir, { recursive: true });

for (const asset of assets) {
  await copyFile(join(root, asset), join(webDir, asset));
  console.log('Staged ' + asset);
}

console.log('Yawmi web assets are ready in dist/.');
