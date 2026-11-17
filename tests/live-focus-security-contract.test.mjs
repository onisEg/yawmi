import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const source=path=>readFileSync(join(root,path),'utf8');
const java=source('android/app/src/main/java/in/yawmi/app/FocusLivePlugin.java');
const bridge=source('src/native/bridge.mjs');
const manifest=source('android/app/src/main/AndroidManifest.xml');
const html=source('index.html');

test('Android native countdown has user initiated start, two phase icons, a real system chronometer',()=>{
  assert.match(java, /@CapacitorPlugin\(name = "YawmiFocusLive"\)/);
  assert.match(java,/setUsesChronometer\(true\)/);
  assert.match(java,/setChronometerCountDown\(true\)/);
  assert.match(java,/\.setWhen\(endsAt\)/);
  assert.match(java,/setOngoing\(true\)/);
  assert.match(java,/setTimeoutAfter\(remaining \+ 15000L\)/);
  assert.match(java,/ic_yawmi_break : R\.drawable\.ic_yawmi_focus/);
  assert.match(java,/setRequestPromotedOngoing/);
  assert.match(manifest,/android\.permission\.POST_PROMOTED_NOTIFICATIONS/);
  assert.match(manifest,/android\.permission\.POST_NOTIFICATIONS/);
  assert.ok(source('android/app/src/main/res/drawable/ic_yawmi_focus.xml').includes('<vector'));
  assert.ok(source('android/app/src/main/res/drawable/ic_yawmi_break.xml').includes('<vector'));
});

test('Native plugin validates deadline and phase and does not start a power-hungry service',()=>{
  assert.match(java,/MAX_SESSION_MS/);
  assert.match(java,/Double\.isFinite\(end\)/);
  assert.match(java,/!"work"\.equals\(phase\) && !"break"\.equals\(phase\)/);
  assert.doesNotMatch(manifest,/<service\b/);
  assert.doesNotMatch(java,/startForegroundService|WakeLock|TimerTask|Thread\.sleep/);
});

test('Manual pause cancels the completion alert while natural finish keeps an audible completion',()=>{
  assert.match(bridge,/FocusLive\.show\(\{\s*endsAt:\s*Number\(endsAt\),\s*phase\s*\}\)/);
  assert.match(bridge,/Promise\.allSettled\(\[cancelIds\(\[focusId\]\), FocusLive\.hide\(\)\]\)/);
  assert.match(html,/function pauseFocus\(\)/);
  assert.match(html,/window\.YawmiNative\.cancelFocus\(\)/);
  assert.match(html,/window\.YawmiNative\.completeFocus\(\{/);
  assert.match(html,/window\.YawmiNative\.requestPermission\(\)/);
  assert.match(html,/const FOCUS_KEY = 'yawmi_focus_runtime_v2'/);
});

test('production client uses authenticated yawmi_data and not the unprotected legacy table',()=>{
  assert.match(html,/const DATA_TABLE = 'yawmi_data'/);
  assert.doesNotMatch(html, /['"]yawmi_sync['"]/);
  const sql=source('supabase-auth-setup.sql');
  assert.match(sql,/for select to authenticated using \(auth\.uid\(\) = user_id\)/);
  assert.match(sql,/for update to authenticated using \(auth\.uid\(\) = user_id\) with check \(auth\.uid\(\) = user_id\)/);
});
