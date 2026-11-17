import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=path=>readFileSync(path,'utf8');

test('native version comes from Android PackageManager, never a JS hardcoded version',()=>{
  const java=load('android/app/src/main/java/in/yawmi/app/YawmiUpdatesPlugin.java');
  assert.match(java,/@CapacitorPlugin\(name = "YawmiUpdates"\)/);
  assert.match(java,/getLongVersionCode\(\)/);
  assert.match(java,/info\.versionCode/);
  assert.match(java,/packageName/);
  assert.match(load('android/app/src/main/java/in/yawmi/app/MainActivity.java'),/registerPlugin\(YawmiUpdatesPlugin\.class\)/);
});
test('native APK handoff only allows official HTTPS release assets; no silent install or background download',()=>{
  const java=load('android/app/src/main/java/in/yawmi/app/YawmiUpdatesPlugin.java');
  assert.match(java,/Intent\.ACTION_VIEW/);
  assert.match(java,/CATEGORY_BROWSABLE/);
  assert.match(java,/"https"\.equals\(uri\.getScheme\(\)\)/);
  assert.match(java,/"github\.com"\.equals\(uri\.getHost\(\)\)/);
  assert.match(java,/uri\.getQuery\(\) == null/);
  assert.match(java,/uri\.getFragment\(\) == null/);
  assert.match(java,/android-beta-v0/);
  assert.doesNotMatch(java,/REQUEST_INSTALL_PACKAGES|PackageInstaller|ACTION_INSTALL_PACKAGE|DownloadManager/);
});
test('Android bridge exposes verified native update methods and packages them only in APK',()=>{
  const js=load('src/native/bridge.mjs');
  const html=load('index.html');
  assert.match(js,/registerPlugin\('YawmiUpdates'\)/);
  assert.match(js,/Updates\.getInstalledVersion\(\)/);
  assert.match(js,/Updates\.openOfficialApk\(\{ url \}\)/);
  assert.match(html,/function checkNativeForUpdates\(\)/);
  assert.match(html,/isNativeApp\(\)/);
  assert.match(html,/release\.versionCode <= current/);
  assert.match(html,/sessionStorage\.getItem\('yawmi_update_later'\)/);
  assert.match(html,/id="appUpdateNow"/);
  assert.match(html,/id="appUpdateLater"/);
  assert.doesNotMatch(html,/src="\.\/native-bridge\.js"/);
  assert.match(load('scripts/build-web.mjs'),/native-bridge\.js/);
});
