import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('index.html','utf8');
function extracted(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0 && b>a,'Missing Yawmi segment: '+start);
  return source.slice(a,b);
}
const good={
  draft:false,
  prerelease:false,
  tag_name:'android-beta-v0.4.2011',
  assets:[{
    name:'Yawmi-Beta-v0.4.2011.apk',state:'uploaded',
    browser_download_url:'https://github.com/onisEg/yawmi/releases/download/android-beta-v0.4.2011/Yawmi-Beta-v0.4.2011.apk'
  }]
};
function browser(userAgent,opts={}){
  const elements={
    '#installBanner':{classList:{add(){},remove(){}},hidden:true},
    '#installApkBtn':{href:'',hidden:true},
    '#installBannerSub':{textContent:''},
    '#installAppBtn':{textContent:''}
  };
  const ctx={
    URL,
    Number,
    navigator:{userAgent},
    window:{
      __YAWMI_NATIVE_BUILD:!!opts.native,
      matchMedia:()=>({matches:!!opts.installed}),
      navigator:{standalone:false}
    },
    localStorage:{getItem:()=>opts.dismissed?'1':null},
    fetch:opts.fetch||(()=>Promise.reject(new Error('Offline'))),
    setTimeout:()=>1,
    clearTimeout:()=>{},
    mobileInstallTimer:null,
    verifiedAndroidApkUrl:'',
    $:id=>elements[id],
    isStandalone:()=>!!opts.installed,
    document:{querySelectorAll:()=>[]},
    renderBanners:()=>{},
    updateNotifDot:()=>{}
  };
  vm.createContext(ctx);
  vm.runInContext(extracted('function canOfferMobileInstall(){',"window.addEventListener('beforeinstallprompt'"),ctx);
  return {ctx,elements};
}
test('only Android web browsers can get an APK offer; PWA/native/iOS cannot',()=>{
  assert.equal(browser('Mozilla/5.0 (Linux; Android 16)').ctx.canOfferMobileInstall(),true);
  for(const [ua,opts] of [
    ['Mozilla/5.0 (iPhone)',{}],
    ['Mozilla/5.0 (X11; Linux x86_64)',{}],
    ['Mozilla/5.0 (Android 16)',{native:true}],
    ['Mozilla/5.0 (Android 16)',{installed:true}],
    ['Mozilla/5.0 (Android 16)',{dismissed:true}]
  ]) assert.equal(browser(ua,opts).ctx.canOfferMobileInstall(),false);
});
test('published verified official matching APK tag and asset is accepted',()=>{
  const {ctx}=browser('Android 16');
  const item=ctx.validateOfficialAndroidRelease(good);
  assert.equal(item.url,good.assets[0].browser_download_url);
  assert.equal(item.versionCode,2011);
  assert.equal(item.versionName,'0.4.2011');
});
test('v1.0 signed APK is accepted only when release metadata matches the official asset',()=>{
  const versionCode=2042;
  const tag='android-beta-v1.0.'+versionCode;
  const name='Yawmi-Beta-v1.0.'+versionCode+'.apk';
  const release={
    draft:false,prerelease:false,tag_name:tag,
    assets:[{name,state:'uploaded',browser_download_url:'https://github.com/onisEg/yawmi/releases/download/'+tag+'/'+name}]
  };
  const {ctx}=browser('Android 16');
  const item=ctx.validateOfficialAndroidRelease(release);
  assert.equal(item.versionCode,versionCode);
  assert.equal(item.versionName,'1.0.'+versionCode);
  assert.equal(item.url,release.assets[0].browser_download_url);
  assert.equal(ctx.validateOfficialAndroidRelease({...release,tag_name:'android-beta-v1.0.2043'}),null);
  assert.equal(ctx.validateOfficialAndroidRelease({...release,assets:[{...release.assets[0],name:'different.apk'}]}),null);
});
test('draft, missing, mismatched or unofficial APK assets are rejected',()=>{
  const {ctx}=browser('Android 16');
  for(const release of [
    null,
    {...good,draft:true},
    {...good,prerelease:true},
    {...good,tag_name:'android-beta-v0.4.2012'},
    {...good,tag_name:'nightly-debug'},
    {...good,assets:[{...good.assets[0],name:'fake.apk'}]},
    {...good,assets:[{...good.assets[0],state:'new'}]},
    {...good,assets:[{...good.assets[0],browser_download_url:'https://other.example/apk.apk'}]},
    {...good,assets:[{...good.assets[0],browser_download_url:'https://github.com/attacker/yawmi/releases/download/android-beta-v0.4.2011/Yawmi-Beta-v0.4.2011.apk'}]},
    {...good,assets:[{...good.assets[0],browser_download_url:'https://github.com/onisEg/yawmi/releases/download/android-beta-v0.4.2011/Yawmi-Beta-v0.4.2011.apk?token=x'}]}
  ]) assert.equal(ctx.validateOfficialAndroidRelease(release),null);
});
test('no release or offline API keeps APK hidden; it never offers PWA',async()=>{
  const {ctx,elements}=browser('Android 16',{fetch:async()=>({ok:false})});
  await ctx.discoverOfficialAndroidApk();
  assert.equal(ctx.verifiedAndroidApkUrl,'');
  assert.equal(elements['#installApkBtn'].hidden,true);
  assert.equal(source.includes('id="installBtn"'),false);
  assert.doesNotMatch(source,/deferredInstallPrompt\.prompt\(\)/);
});
test('valid published APK enables direct download',async()=>{
  const {ctx,elements}=browser('Android 16',{fetch:async()=>({ok:true,json:async()=>good})});
  await ctx.discoverOfficialAndroidApk();
  assert.equal(ctx.verifiedAndroidApkUrl,good.assets[0].browser_download_url);
  assert.equal(elements['#installApkBtn'].href,good.assets[0].browser_download_url);
  assert.equal(elements['#installApkBtn'].hidden,false);
});
test('primary install action is APK-only: no auto PWA fallback before release',async()=>{
  let redirected='';
  const prompts=[];
  const ctx={
    verifiedAndroidApkUrl:'',
    detectPlatform:()=> 'android',
    window:{location:{assign:url=>{redirected=url;}}},
    toast:msg=>prompts.push(msg)
  };
  vm.createContext(ctx);
  vm.runInContext(extracted('async function doInstall(){','function showInstallGuide(){'),ctx);
  await ctx.doInstall();
  assert.equal(redirected,'');
  assert.match(prompts[0],/APK/);
  ctx.verifiedAndroidApkUrl=good.assets[0].browser_download_url;
  await ctx.doInstall();
  assert.equal(redirected,good.assets[0].browser_download_url);
});
test('new APK user interface does not expose PWA install controls',()=>{
  assert.match(source,/id="installApkBtn"/);
  assert.doesNotMatch(source,/id="installBtn"/);
  assert.match(source,/window\.addEventListener\('beforeinstallprompt', \(e\)=>\{ e\.preventDefault\(\); \}\)/);
  assert.match(source,/id="installAppBtn"/);
  assert.match(source,/verifiedAndroidApkUrl && canOfferMobileInstall\(\)/);
  assert.doesNotMatch(source,/return doInstallWeb\(\)/);
});
test('existing user storage, sync and service worker stay untouched',()=>{
  const sw=readFileSync('sw.js','utf8');
  assert.match(sw,/self\.addEventListener\('fetch'/);
  assert.match(source,/if\(!isStandalone\(\) && 'serviceWorker' in navigator/);
  assert.match(source,/const DATA_TABLE = 'yawmi_data'/);
});
test('version metadata initialized before the first Today render',()=>{
  const state=source.indexOf("let verifiedAndroidApkUrl = '';");
  const init=source.indexOf('/* ================= init ================= */');
  const boot=source.indexOf('reloadState();',init);
  assert.ok(state>0 && state<init && init<boot);
  assert.equal(source.split("let verifiedAndroidApkUrl = '';").length,2);
});
test('native Beta update checker compares installed versionCode, not web-only version',async()=>{
  let openedUrl='',showCount=0;
  const modal={classList:{remove(){showCount++;},add(){}}};
  const nodes={
    '#appUpdateOv':modal,
    '#appUpdateText':{textContent:''},
    '#appUpdateNow':{onclick:null},
    '#appUpdateLater':{onclick:null}
  };
  const callbacks={};
  const ctx={
    URL,Number,
    window:{
      __YAWMI_NATIVE_BUILD:true,
      YawmiNative:{
        getInstalledAppInfo:async()=>({packageName:'in.yawmi.app.beta',versionCode:1391}),
        openOfficialApk:async(url)=>{openedUrl=url;},
      },
      addEventListener:(evt,handler)=>{callbacks[evt]=handler;}
    },
    isNativeApp:()=>true,
    navigator:{userAgent:'Android 16'},
    $:id=>nodes[id],
    sessionStorage:{getItem:()=>null,setItem:()=>{}},
    fetch:async()=>({ok:true,json:async()=>good}),
    validateOfficialAndroidRelease:()=>({url:good.assets[0].browser_download_url,versionCode:2011,versionName:'0.4.2011'}),
    toast:()=>{}
  };
  vm.createContext(ctx);
  vm.runInContext(extracted('// Only the packaged, same-signed Yawmi Beta','// هل التطبيق متثبّت بالفعل؟'),ctx);
  await ctx.checkNativeForUpdates();
  assert.equal(showCount,1);
  assert.match(nodes['#appUpdateText'].textContent,/0\.4\.2011/);
  await nodes['#appUpdateNow'].onclick();
  assert.equal(openedUrl,good.assets[0].browser_download_url);
  assert.equal(typeof callbacks['yawmi-native-ready'],'function');
  assert.equal(typeof callbacks.online,'function');
});
test('update checker does not prompt if installed beta is current',async()=>{
  let fetchCalls=0,showCount=0;
  const ctx={
    window:{
      YawmiNative:{getInstalledAppInfo:async()=>({packageName:'in.yawmi.app.beta',versionCode:2011})},
      addEventListener:()=>{}
    },
    isNativeApp:()=>true,
    $:()=>({classList:{remove(){showCount++;}}}),
    sessionStorage:{getItem:()=>null},
    fetch:async()=>{fetchCalls++;return {ok:true,json:async()=>good}},
    validateOfficialAndroidRelease:()=>({versionCode:2011,url:good.assets[0].browser_download_url})
  };
  vm.createContext(ctx);
  vm.runInContext(extracted('// Only the packaged, same-signed Yawmi Beta','// هل التطبيق متثبّت بالفعل؟'),ctx);
  await ctx.checkNativeForUpdates();
  assert.equal(fetchCalls,1);
  assert.equal(showCount,0);
});
