import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, 'dist');
const source = (name) => readFileSync(join(root, name));
const checksum = (buf) => createHash('sha256').update(buf).digest('hex');
const html = source('index.html').toString('utf8');

test('staging copies exactly the public app assets, byte for byte', () => {
  const sourceAssets = ['icon-192.png', 'icon-512.png', 'manifest.json', 'sw.js'];
  const output = [...sourceAssets, 'index.html', 'native-bridge.js'];
  assert.deepEqual(readdirSync(dist).sort(), output.sort());
  for (const name of sourceAssets) {
    assert.equal(checksum(source(name)), checksum(readFileSync(join(dist, name))), name);
  }
  const stagedHTML = readFileSync(join(dist,'index.html'),'utf8');
  assert.ok(stagedHTML.startsWith('<!DOCTYPE html>'));
  assert.match(stagedHTML,/window\\.__YAWMI_NATIVE_BUILD=true/);
  assert.match(stagedHTML,/native-bridge\\.js/);
  assert.ok(readFileSync(join(dist,'native-bridge.js')).length > 100);

});

test('no database SQL, CNAME, credentials or documentation ships in the APK web assets', () => {
  for (const path of ['supabase-setup.sql', 'supabase-auth-setup.sql', 'CNAME', '.env', 'docs', 'package.json']) {
    assert.equal(existsSync(join(dist, path)), false, path);
  }
});

test('manifest keeps the current Arabic RTL Yawmi identity and icon assets', () => {
  const manifest = JSON.parse(source('manifest.json').toString('utf8'));
  assert.equal(manifest.lang, 'ar');
  assert.equal(manifest.dir, 'rtl');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(x => x.sizes === '512x512'));
  assert.match(html, /<html lang="ar" dir="rtl">/);
});

test('Capacitor config uses bundled dist assets, not a remote web URL', () => {
  const config = JSON.parse(source('capacitor.config.json').toString('utf8'));
  assert.equal(config.webDir, 'dist');
  assert.equal(config.server, undefined);
  assert.equal(config.appName, 'يومي');
  assert.match(config.appId, /^[a-z][a-z\d_]*(?:\.[a-z][a-z\d_]*){2,}$/);
});

test('native WebView skips re-registering the PWA service worker', () => {
  assert.match(html, /if\(!isStandalone\(\) && 'serviceWorker' in navigator/);
  assert.match(html, /window\.Capacitor\.isNativePlatform\(\)/);
});
