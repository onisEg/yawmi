import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=dirname(dirname(fileURLToPath(import.meta.url)));
const load=p=>readFileSync(join(root,p),'utf8');
const html=load('index.html');
const native=load('src/native/bridge.mjs');
const plugin=load('android/app/src/main/java/in/yawmi/app/FocusLivePlugin.java');

test('audible focus finish has a dedicated Android 8+ channel, sound and vibration',()=>{
  assert.match(plugin,/WORK_DONE_CHANNEL = "yawmi_focus_work_done_v1"/);
  assert.match(plugin,/BREAK_DONE_CHANNEL = "yawmi_focus_break_done_v1"/);
  assert.match(plugin,/NotificationManager\.IMPORTANCE_HIGH/);
  assert.match(plugin,/setSound\(sound, attrs\)/);
  assert.match(plugin,/RingtoneManager\.TYPE_NOTIFICATION/);
  assert.match(plugin,/channel\.enableVibration\(true\)/);
  assert.match(plugin,/prepareCompletionAlerts\(PluginCall call\)/);
  assert.match(plugin,/NotificationManager\.IMPORTANCE_LOW/);
});

test('work and break each choose their own audible completion channel',()=>{
  assert.match(native,/work: 'yawmi_focus_work_done_v1'/);
  assert.match(native,/break: 'yawmi_focus_break_done_v1'/);
  assert.match(native,/channelId:focusDoneChannels\[p\]/);
  assert.match(native,/FocusLive\.prepareCompletionAlerts\(\)/);
  assert.match(native,/await configureFocusSounds\(\);[\s\S]*?LocalNotifications\.schedule/);
});

test('foreground zero cannot cancel the scheduled completion alert before ringing',()=>{
  const a=html.indexOf('function tickFocus(){');
  const b=html.indexOf('function startFocus(){',a);
  assert.ok(a>0 && b>a);
  const tick=html.slice(a,b);
  assert.match(tick,/window\.YawmiNative\.completeFocus\(\{/);
  assert.doesNotMatch(tick,/window\.YawmiNative\.cancelFocus\(/);
  assert.match(native,/getDeliveredNotifications\(\)/);
  assert.match(native,/if\(delivered\.some\(n=>n\.id===focusId\)\) return true/);
  assert.match(native,/await FocusLive\.hide\(\)/);
});

test('manual pause still cancels an upcoming alarm, not an ongoing alert only',()=>{
  const a=html.indexOf('function pauseFocus(){');
  const b=html.indexOf('function resetFocus(){',a);
  assert.ok(a>0&&b>a);
  assert.match(html.slice(a,b),/window\.YawmiNative\.cancelFocus\(\)/);
  assert.match(native,/Promise\.allSettled\(\[cancelIds\(\[focusId\]\), FocusLive\.hide\(\)\]\)/);
});

test('visible Android-only sound tests use separate ID from active timer',()=>{
  assert.match(html,/id="focusTestWorkBtn"/);
  assert.match(html,/id="focusTestBreakBtn"/);
  assert.match(html,/function showNativeFocusSoundButtons/);
  assert.match(html,/tryFocusSound\('work'\)/);
  assert.match(html,/tryFocusSound\('break'\)/);
  assert.match(native,/const focusTestId = 15002/);
  assert.match(native,/id:focusTestId/);
  assert.notEqual(15001,15002);
});
