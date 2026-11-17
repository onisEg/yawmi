import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('index.html','utf8');
function extracted(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a);
 assert.ok(a>=0&&b>a,'Missing Yawmi installation code: '+start);
 return source.slice(a,b);
}
const functions=extracted('function canOfferMobileInstall(){','window.addEventListener(\'beforeinstallprompt\'');
function evaluateWith(userAgent,opts={}){
 const elements={
  '#installBanner':{classList:{add(){},remove(){}},hidden:true},
  '#installApkBtn':{href:'',hidden:true},
  '#installBannerSub':{textContent:''}
 };
 const ctx={
  URL,
  navigator:{userAgent,standalone:opts.standalone||false},
  window:{__YAWMI_NATIVE_BUILD:!!opts.native,matchMedia:()=>({matches:!!opts.installed})},
  localStorage:{getItem:()=>opts.dismissed?'1':null},
  fetch:opts.fetch||(()=>Promise.reject(new Error('Offline'))),
  setTimeout:()=>1,
  clearTimeout:()=>{},
  mobileInstallTimer:null,
  verifiedAndroidApkUrl:'',
  $:id=>elements[id]
 };
 vm.createContext(ctx);
 vm.runInContext(functions,ctx);
 return {ctx,elements};
}
const good={
 draft:false,prerelease:false,assets:[{
  name:'Yawmi-Beta-v0.4.2011.apk',state:'uploaded',
  browser_download_url:'https://github.com/onisEg/yawmi/releases/download/android-beta-v0.4.2011/Yawmi-Beta-v0.4.2011.apk'
 }]
};
test('Android browser gets installation choice without waiting for beforeinstallprompt',()=>{
 assert.equal(evaluateWith('Mozilla/5.0 (Linux; Android 16)').ctx.canOfferMobileInstall(),true);
});
test('iPhone/iPad browsers get PWA install choice but not APK',()=>{
 assert.equal(evaluateWith('Mozilla/5.0 (iPhone; CPU iPhone OS 17)').ctx.canOfferMobileInstall(),true);
});
test('desktop/native/installed/dismissed users do not see an install promotion',()=>{
 for(const [ua,o] of [
  ['Mozilla/5.0 (X11; Linux x86_64)',{}],
  ['Mozilla/5.0 (Linux; Android 16)',{native:true}],
  ['Mozilla/5.0 (Linux; Android 16)',{installed:true}],
  ['Mozilla/5.0 (Linux; Android 16)',{dismissed:true}]
 ]) assert.equal(evaluateWith(ua,o).ctx.canOfferMobileInstall(),false);
});
test('valid official published Android release asset is allowed',()=>{
 const {ctx}=evaluateWith('Android 16');
 assert.equal(ctx.validateOfficialApkAsset(good),good.assets[0].browser_download_url);
});
test('unverified/draft/unofficial/unsigned artifact URL is never promoted',()=>{
 const {ctx}=evaluateWith('Android 16');
 for(const release of [
  {...good,draft:true},
  {...good,prerelease:true},
  {...good,assets:[{...good.assets[0],state:'new'}]},
  {...good,assets:[{...good.assets[0],browser_download_url:'https://example.com/Yawmi.apk'}]},
  {...good,assets:[{...good.assets[0],browser_download_url:'http://github.com/onisEg/yawmi/releases/download/a/test.apk'}]},
  {...good,assets:[{...good.assets[0],browser_download_url:'https://github.com/attacker/yawmi/releases/download/a/test.apk'}]},
  {...good,assets:[{...good.assets[0],browser_download_url:'https://github.com/onisEg/yawmi/releases/download/a/test.apk?token=bad'}]},
  {...good,assets:[{...good.assets[0],name:'README.txt'}]},
  null,
 ]) assert.equal(ctx.validateOfficialApkAsset(release),'');
});
test('unavailable GitHub API keeps PWA choice and hides download button',async()=>{
 const {ctx,elements}=evaluateWith('Android 16',{fetch:async()=>({ok:false})});
 await ctx.discoverOfficialAndroidApk();
 assert.equal(elements['#installApkBtn'].hidden,true);
});
test('valid official API response enables APK link only on Android',async()=>{
 const {ctx,elements}=evaluateWith('Android 16',{fetch:async()=>({ok:true,json:async()=>good})});
 await ctx.discoverOfficialAndroidApk();
 assert.equal(elements['#installApkBtn'].href,good.assets[0].browser_download_url);
 assert.equal(elements['#installApkBtn'].hidden,false);
});
test('existing PWA installation action and manual guidance remain',()=>{
 assert.match(source,/async function doInstall\(\)/);
 assert.match(source,/function showInstallGuide\(\)/);
 assert.match(source,/deferredInstallPrompt\.prompt\(\)/);
 assert.match(source,/id="installBtn"/);
 assert.match(source,/id="installApkBtn"/);
 assert.match(source,/id="installDismiss"/);
});
