// Stage only the public web assets for Capacitor's native Android WebView.
// This script does not touch the deployed site, original assets, or Supabase.
import { copyFile, mkdir, rm, readFile, writeFile } from 'node:fs/promises';
import { build as bundle } from 'esbuild';
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

// Keep the pure focus-clock file identical in Web and Capacitor output.
const clockRel = 'src/features/focus/focus-clock.js';
await mkdir(join(webDir, 'src/features/focus'), { recursive: true });
await copyFile(join(root, clockRel), join(webDir, clockRel));
console.log('Staged ' + clockRel);
console.log('Yawmi web assets are ready in dist/.');

// Only Android/iOS copies get the native JavaScript bridge. The hosted PWA
// is not modified and cannot accidentally request native permissions.
const original = await readFile(join(webDir, 'index.html'), 'utf8');
const nativeDocument = original
  .replace('</head>', '<script>window.__YAWMI_NATIVE_BUILD=true;</script></head>')
  .replace(/<\/body>\s*<\/html>\s*$/i, '<script type="module" src="./native-bridge.js"></script></body></html>');
if (nativeDocument === original || !nativeDocument.includes('native-bridge.js')) {
  throw new Error('Could not attach the native bridge to staged HTML');
}
await writeFile(join(webDir, 'index.html'), nativeDocument);
await bundle({
  entryPoints: [join(root, 'src/native/bridge.mjs')],
  outfile: join(webDir, 'native-bridge.js'),
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  bundle: true,
  minify: true
});
console.log('Native Capacitor bridge bundled.');
