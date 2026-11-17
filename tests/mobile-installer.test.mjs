import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync('mobile-installer.js','utf8');
const index=readFileSync('index.html','utf8');
const sw=readFileSync('sw.js','utf8');
const sandbox={
  window:{},
  navigator:{userAgent:'test-runner'},
  document:{readyState:'loading',addEventListener(){}},
  URL,
};
runInNewContext(source,sandbox,{timeout:2000});
const verify=sandbox.window.YawmiApkReleaseVerifier.getVerifiedApk;
const real={
 tag_name:'yawmi-android-beta-v0.3.1501',published_at:'2026-11-17T00:00:00Z',draft:false,prerelease:true,
 assets:[{name:'yawmi-beta.apk',size:4200000,
  browser_download_url:'https://github.com/onisEg/yawmi/releases/download/yawmi-android-beta-v0.3.1501/yawmi-beta.apk'}]
};
const clone=x=>JSON.parse(JSON.stringify(x));
test('cannot display a guessed APK without a published release',()=>{
 assert.equal(verify([]),null);
 assert.equal(verify(null),null);
 assert.equal(verify([{...real,draft:true}]),null);
 assert.equal(verify([{...real,published_at:null}]),null);
});
test('only official repo tag and exact APK asset name can be offered',()=>{
 const good=verify([real]);
 assert.equal(good.version,'0.3.1501');
 assert.match(good.url,/^https:\/\/github.com\/onisEg\/yawmi\/releases\/download\//);
 assert.equal(verify([{...real,tag_name:'unrelated-release'}]),null);
 const a=clone(real); a.assets[0].name='unverified-debug.apk';
 assert.equal(verify([a]),null);
});
test('rejects unsafe/misleading APK hosts, protocols and tiny files',()=>{
 for (const url of [
  'http://github.com/onisEg/yawmi/releases/download/test/yawmi-beta.apk',
  'https://attacker.invalid/onisEg/yawmi/releases/download/test/yawmi-beta.apk',
  'https://github.com/anotherorg/anotherrepo/releases/download/test/yawmi-beta.apk'
 ]) {
  const fake=clone(real); fake.assets[0].browser_download_url=url;
  assert.equal(verify([fake]),null,url);
 }
 const tiny=clone(real);tiny.assets[0].size=1;
 assert.equal(verify([tiny]),null);
});
test('the install selector is web-only and both assets are PWA cached',()=>{
 assert.match(index,/mobile-installer\.js/);
 assert.match(index,/mobile-installer\.css/);
 assert.match(sw,/mobile-installer\.js/);
 assert.match(sw,/mobile-installer\.css/);
 assert.match(source,/__YAWMI_NATIVE_BUILD/);
 assert.match(source,/display-mode: standalone/);
 assert.match(source,/typeof window\.doInstall/);
});
test('APK install choice warns that PWA local data are not transferred',()=>{
 assert.match(source,/بيانات الموقع المحفوظة/);
 assert.match(source,/مش بتتنقل تلقائيًا/);
 assert.match(source,/تحديث/);
 assert.doesNotMatch(source,/service_role|SUPABASE_KEY|sb_secret_/);
});
