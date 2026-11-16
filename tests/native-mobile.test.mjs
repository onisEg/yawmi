import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const native = readFileSync(join(root,'src/native/bridge.mjs'),'utf8');
const config = JSON.parse(readFileSync(join(root,'capacitor.config.json'),'utf8'));

test('inline Yawmi JavaScript parses, including focus and reminder integrations', () => {
  const scripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g)];
  assert.ok(scripts.length >= 2);
  for(const match of scripts) {
    assert.doesNotThrow(()=>new vm.Script(match[1]), 'Inline JavaScript failed syntax check');
  }
});

test('native status bar is visible and Android safe-area is injected by Capacitor', () => {
  assert.equal(config.plugins.SystemBars.insetsHandling,'css');
  assert.equal(config.plugins.SystemBars.hidden,false);
  assert.match(html,/--yawmi-safe-top: max\\(env\\(safe-area-inset-top/);
  assert.match(html,/padding-top:var\\(--yawmi-safe-top\\)/);
  assert.match(html,/--yawmi-safe-bottom/);
  assert.match(html,/bottom:calc\\(12px \\+ var\\(--yawmi-safe-bottom\\)\\)/);
});

test('focus timer uses wall-clock deadlines rather than decrementing seconds', () => {
  const a=html.indexOf('function remainingFromDeadline(');
  const b=html.indexOf('function tickFocus()',a);
  assert.ok(a>0&&b>a);
  const sandbox={Date};
  vm.runInNewContext(html.slice(a,b)+'\\n;globalThis.remaining=remainingFromDeadline;',sandbox);
  const f=sandbox.remaining;
  assert.equal(f(1_100_000,1_000_000),100);
  assert.equal(f(1_100_000,1_045_100),55);
  assert.equal(f(1_100_000,1_500_000),0);
  assert.match(html,/const FOCUS_KEY = 'yawmi_focus_runtime_v2'/);
  assert.match(html,/function restoreFocus\\(/);
  assert.match(html,/function closeFocus\\(\\)\\{[\\s\\S]*?Closing the sheet does NOT cancel/);
});

test('native plugin schedules OS notifications without WebView minute polling', () => {
  assert.match(native,/import \\{ LocalNotifications \\} from '@capacitor\\/local-notifications'/);
  assert.match(native,/LocalNotifications\\.schedule/);
  assert.match(native,/LocalNotifications\\.requestPermissions/);
  assert.match(native,/LocalNotifications\\.getPending/);
  assert.match(native,/isExactNotification: false/);
  assert.match(html,/if\\(isNativeApp\\(\\)\\) return;[\\s\\S]*?const r = loadReminders\\(\\)/);
  assert.match(html,/if\\(isNativeApp\\(\\)\\)\\{ syncNativeReminders\\(\\); return; \\}/);
});

test('native bridge is bundled only for app builds and never loaded from web source', () => {
  const source=readFileSync(join(root,'index.html'),'utf8');
  const staged=readFileSync(join(root,'dist/index.html'),'utf8');
  assert.doesNotMatch(source,/native-bridge\\.js/);
  assert.match(staged,/native-bridge\\.js/);
  assert.match(staged,/__YAWMI_NATIVE_BUILD=true/);
});
