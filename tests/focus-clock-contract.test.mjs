import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = readFileSync(join(root, 'index.html'), 'utf8');
const clockFile = 'src/features/focus/focus-clock.js';
const clockSource = readFileSync(join(root, clockFile), 'utf8');

function createClock() {
  const sandbox = { Date, window: {} };
  vm.runInNewContext(clockSource, sandbox, { timeout: 1000 });
  assert.ok(sandbox.window.YawmiFocusClock, 'Reusable pure clock must be initialized');
  return sandbox.window.YawmiFocusClock;
}

test('focus clock calculates true elapsed time even if JavaScript ticks were suspended', () => {
  const { remainingFromDeadline } = createClock();
  const endsAt = 1_000_000;
  assert.equal(remainingFromDeadline(endsAt, 950_000), 50);
  assert.equal(remainingFromDeadline(endsAt, 955_500), 45);
  assert.equal(remainingFromDeadline(endsAt, 1_200_000), 0);
});

test('focus clock handles boundary and corrupted timestamps safely', () => {
  const { remainingFromDeadline } = createClock();
  assert.equal(remainingFromDeadline(5_000, 5_000), 0);
  assert.equal(remainingFromDeadline(5_001, 5_000), 1);
  assert.equal(remainingFromDeadline(Number.NaN, 5_000), 0);
  assert.equal(remainingFromDeadline(Infinity, 5_000), 0);
  assert.equal(remainingFromDeadline(5_000, Number.NaN), 0);
});

test('clock module loads before the legacy app script on web and native', () => {
  const linked = '<script src="./src/features/focus/focus-clock.js"></script>';
  const index = src.indexOf(linked);
  const app = src.indexOf('<script>\n/* ================= state');
  assert.ok(index > 0 && app > index, 'Clock loads synchronously before application state');
  assert.match(src, /window\.YawmiFocusClock/);
  assert.match(src, /clock\.remainingFromDeadline\(deadline,now\)/);
  const nativeHTML = readFileSync(join(root, 'dist/index.html'), 'utf8');
  assert.ok(nativeHTML.includes(linked));
  assert.ok(existsSync(join(root, 'dist', clockFile)));
});

test('PWA precaches clock module so the focus timer works offline', () => {
  const worker = readFileSync(join(root, 'sw.js'), 'utf8');
  assert.match(worker, /\.\/src\/features\/focus\/focus-clock\.js/);
  assert.match(worker, /yawmi-v194-v1-unified/);
});

test('the timer keeps the same localStorage persistence key', () => {
  assert.match(src, /const FOCUS_KEY = 'yawmi_focus_runtime_v2'/);
  assert.match(src, /function restoreFocus\(\)/);
  assert.match(src, /function persistFocus\(\)/);
});
