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
  '#installBannerSub':{textContent:''},
  '#installAppBtn':{textContent:''}
 };
 const ctx={
  URL,
  navigator:{userAgent,standalone:opts.standalone||false},
  window:{__YAWMI_NATIVE_BUILD:!!opts.native,matchMedia:()=>({matches:!!opts.installed}),navigator:{standalone:!!opts.standalone}},
  localStorage:{getItem:()=>opts.dismissed?'1':null},
  fetch:opts.fetch||(()=>Promise.reject(new Error('Offline'))),
  setTimeout:()=>1,
  clearTimeout:()=>{},
  mobileInstallTimer:null,
  verifiedAndroidApkUrl:'',
  $:id=>elements[id],
  isStandalone:()=>false,
  document:{querySelectorAll:()=>[]}
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
 assert.match(elements['#installAppBtn'].textContent,/APK/);
});
function evaluatePrimaryInstall(userAgent,url){
 const navigations=[];
 let webPrompts=0;
 const ctx={
  navigator:{userAgent},
  window:{location:{assign:target=>navigations.push(target)}},
  verifiedAndroidApkUrl:url,
  deferredInstallPrompt:{prompt:()=>{webPrompts++;},userChoice:Promise.resolve({outcome:'dismissed'})},
  detectPlatform:()=>/Android/i.test(userAgent)?'android':/iPhone/i.test(userAgent)?'ios':'desktop',
  $:()=>({classList:{add(){}}}),
  toast:()=>{},
  showInstallGuide:()=>{}
 };
 vm.createContext(ctx);
 vm.runInContext(extracted('async function doInstall(){','function showInstallGuide(){'),ctx);
 return {ctx,navigations,getWebPrompts:()=>webPrompts};
}
test('Android primary install action starts the verified APK download instead of PWA',async()=>{
 const a=evaluatePrimaryInstall('Mozilla/5.0 (Linux; Android 16)',good.assets[0].browser_download_url);
 await a.ctx.doInstall();
 assert.deepEqual(a.navigations,[good.assets[0].browser_download_url]);
 assert.equal(a.getWebPrompts(),0);
});
test('without a published APK the primary action still allows the PWA flow',async()=>{
 const a=evaluatePrimaryInstall('Mozilla/5.0 (Linux; Android 16)','');
 await a.ctx.doInstall();
 assert.deepEqual(a.navigations,[]);
 assert.equal(a.getWebPrompts(),1);
});
test('non-Android platforms never navigate to an APK',async()=>{
 const a=evaluatePrimaryInstall('Mozilla/5.0 (iPhone)',good.assets[0].browser_download_url);
 await a.ctx.doInstall();
 assert.deepEqual(a.navigations,[]);
 assert.equal(a.getWebPrompts(),1);
});
test('the explicit web installation button remains PWA-only and APK link is direct',()=>{
 assert.match(source,/\$\('#installBtn'\)\.onclick = \(\)=> doInstallWeb\(\)/);
 assert.match(source,/<a id="installApkBtn" href="#" hidden rel="noopener noreferrer"/);
 assert.doesNotMatch(source,/<a id="installApkBtn"[^>]*target="_blank"/);
});
test('existing PWA installation action and manual guidance remain',()=>{
 assert.match(source,/async function doInstall\(\)/);
 assert.match(source,/function showInstallGuide\(\)/);
 assert.match(source,/deferredInstallPrompt\.prompt\(\)/);
 assert.match(source,/id="installBtn"/);
 assert.match(source,/id="installApkBtn"/);
 assert.match(source,/id="installDismiss"/);
});

test('APK discovery state is initialized before the app first renders',()=>{
 const state=source.indexOf("let verifiedAndroidApkUrl = '';");
 const init=source.indexOf('/* ================= init ================= */');
 const boot=source.indexOf('reloadState();',init);
 assert.ok(state>0 && state<init && init<boot, 'APK state must be initialized before rendering the banner');
 assert.equal(source.split("let verifiedAndroidApkUrl = '';").length,2);
});
