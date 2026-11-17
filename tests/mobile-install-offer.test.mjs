import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync('index.html','utf8');
function extracted(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0 && b>a,'Missing install/update code: '+start);
  return source.slice(a,b);
}
const code=extracted('function canOfferMobileInstall(){',"window.addEventListener('beforeinstallprompt'");
const good={
  tag_name:'android-beta-v0.4.2055',
  draft:false,
  prerelease:false,
  assets:[{
    name:'Yawmi-Beta-v0.4.2055.apk',
    state:'uploaded',
    browser_download_url:'https://github.com/onisEg/yawmi/releases/download/android-beta-v0.4.2055/Yawmi-Beta-v0.4.2055.apk'
  }]
};
function evaluateWith(userAgent,opts={}){
  const el=()=>({href:'',hidden:true,textContent:'',onclick:null,
    classList:{add(){},remove(){}}});
  const elements={
    '#installBanner':el(),
    '#installApkBtn':el(),
    '#installBannerSub':el(),
    '#installAppBtn':el(),
    '#nativeUpdateOv':el(),
    '#nativeUpdateVersion':el(),
    '#nativeUpdateNow':el(),
    '#nativeUpdateLater':el()
  };
  let opened=[], banners=0;
  const ctx={
    URL,Date,console,
    navigator:{userAgent,standalone:!!opts.standalone},
    window:{
      __YAWMI_NATIVE_BUILD:!!opts.native,
      matchMedia:()=>({matches:!!opts.installed}),
      navigator:{standalone:!!opts.standalone},
      YawmiNative:{
        getInstalledVersion:async()=>({
          packageName:opts.packageName||'in.yawmi.app.beta',
          versionCode:opts.versionCode ?? 1391
        }),
        openUpdateDownload:async ({url})=>{opened.push(url);}
      }
    },
    localStorage:{getItem:()=>opts.dismissed?'1':null},
    document:{hidden:false,querySelectorAll:()=>[]},
    fetch:opts.fetch||(()=>Promise.reject(new Error('Offline'))),
    setTimeout:()=>1,clearTimeout:()=>{},
    mobileInstallTimer:null,verifiedAndroidApkUrl:'',
    nativeUpdateCheckedAt:0,nativeUpdateDismissedCode:0,
    isStandalone:()=>!!(opts.native||opts.installed||opts.standalone),
    isNativeApp:()=>!!opts.native,
    renderBanners:()=>{banners++},
    updateNotifDot:()=>{},
    showAlert:()=>{},
    $:id=>elements[id]
  };
  vm.createContext(ctx);
  vm.runInContext(code,ctx);
  return {ctx,elements,opened,getBanners:()=>banners};
}
test('Android website can offer an APK but iOS, desktop and native app cannot',()=>{
  assert.equal(evaluateWith('Mozilla/5.0 (Linux; Android 16)').ctx.canOfferMobileInstall(),true);
  for(const [ua,opts] of [
    ['Mozilla/5.0 (iPhone)',{}],
    ['Mozilla/5.0 (X11; Linux x86_64)',{}],
    ['Mozilla/5.0 (Linux; Android 16)',{native:true}],
    ['Mozilla/5.0 (Linux; Android 16)',{installed:true}],
    ['Mozilla/5.0 (Linux; Android 16)',{dismissed:true}]
  ]) assert.equal(evaluateWith(ua,opts).ctx.canOfferMobileInstall(),false);
});
test('only official published GitHub APK release assets are used',()=>{
  const {ctx}=evaluateWith('Android 16');
  assert.equal(ctx.validateOfficialApkAsset(good),good.assets[0].browser_download_url);
  for(const x of [
    {...good,draft:true},{...good,prerelease:true},
    {...good,assets:[{...good.assets[0],state:'new'}]},
    {...good,assets:[{...good.assets[0],browser_download_url:'https://example.com/app.apk'}]},
    {...good,assets:[{...good.assets[0],browser_download_url:'https://github.com/attacker/yawmi/releases/download/v1/app.apk'}]},
    {...good,assets:[{...good.assets[0],name:'README.txt'}]},null
  ]) assert.equal(ctx.validateOfficialApkAsset(x),'');
});
test('no public APK means no installation banner, no fake APK link and no PWA fallback',async()=>{
  const {ctx,elements,getBanners}=evaluateWith('Android 16',{fetch:async()=>({ok:false})});
  await ctx.discoverOfficialAndroidApk();
  assert.equal(elements['#installApkBtn'].hidden,true);
  assert.equal(ctx.verifiedAndroidApkUrl,'');
  assert.equal(getBanners(),0);
  assert.match(source,/window\.addEventListener\('beforeinstallprompt', e => \{\s*[\s\S]*?e\.preventDefault\(\)/);
  assert.doesNotMatch(source,/deferredInstallPrompt\.prompt\(/);
  assert.doesNotMatch(source,/id="installBtn"/);
  assert.doesNotMatch(source,/\bdoInstallWeb\(/);
});
test('official APK link enables download button and banner',async()=>{
  const {ctx,elements,getBanners}=evaluateWith('Android 16',{
    fetch:async()=>({ok:true,json:async()=>good})
  });
  await ctx.discoverOfficialAndroidApk();
  assert.equal(elements['#installApkBtn'].href,good.assets[0].browser_download_url);
  assert.equal(elements['#installApkBtn'].hidden,false);
  assert.equal(getBanners(),1);
});
function evaluatePrimaryInstall(userAgent,url){
  let destinations=[],alerts=[];
  const ctx={
    navigator:{userAgent},
    window:{location:{assign:u=>destinations.push(u)}},
    verifiedAndroidApkUrl:url,
    isStandalone:()=>false,
    detectPlatform:()=>/Android/i.test(userAgent)?'android':/iPhone/i.test(userAgent)?'ios':'desktop',
    showAlert:text=>{alerts.push(text)}
  };
  vm.createContext(ctx);
  vm.runInContext(extracted('async function doInstall(){','function showInstallGuide(){'),ctx);
  return {ctx,destinations,alerts};
}
test('primary Android install action downloads only the published APK',async()=>{
  const a=evaluatePrimaryInstall('Android 16',good.assets[0].browser_download_url);
  await a.ctx.doInstall();
  assert.deepEqual(a.destinations,[good.assets[0].browser_download_url]);
  assert.deepEqual(a.alerts,[]);
});
test('without published APK an Android install click explains unavailability, never offers a PWA',async()=>{
  const a=evaluatePrimaryInstall('Android 16','');
  await a.ctx.doInstall();
  assert.deepEqual(a.destinations,[]);
  assert.equal(a.alerts.length,1);
  assert.match(a.alerts[0],/APK/);
});
test('iPhone/desktop never download Android APK',async()=>{
  const a=evaluatePrimaryInstall('iPhone',good.assets[0].browser_download_url);
  await a.ctx.doInstall();
  assert.deepEqual(a.destinations,[]);
  assert.equal(a.alerts.length,1);
});
test('native updater accepts only matching official Beta tag and APK version',()=>{
  const {ctx}=evaluateWith('Android 16',{native:true});
  const url=good.assets[0].browser_download_url;
  assert.equal(ctx.getOfficialBetaUpdate(good,url).versionCode,2055);
  assert.equal(ctx.getOfficialBetaUpdate({...good,tag_name:'android-beta-v0.4.9999'},url),null);
  assert.equal(ctx.getOfficialBetaUpdate({...good,tag_name:'untrusted'},url),null);
  assert.equal(ctx.getOfficialBetaUpdate(good,''),null);
});
test('newer native APK prompts the user and opens external download only on click',async()=>{
  const {ctx,elements,opened}=evaluateWith('Android 16',{
    native:true,versionCode:1391,fetch:async()=>({ok:true,json:async()=>good})
  });
  await ctx.checkAndroidAppUpdate();
  assert.equal(elements['#nativeUpdateOv'].hidden,false);
  assert.match(elements['#nativeUpdateVersion'].textContent,/0\.4\.2055/);
  assert.deepEqual(opened,[]);
  await elements['#nativeUpdateNow'].onclick();
  assert.deepEqual(opened,[good.assets[0].browser_download_url]);
  assert.equal(elements['#nativeUpdateOv'].hidden,true);
});
test('same/older native version, wrong package, or no release never prompts',async()=>{
  for(const config of [
    {versionCode:2055},{versionCode:3000},{packageName:'in.yawmi.app.preview'},
    {fetch:async()=>({ok:false})}
  ]){
    const a=evaluateWith('Android 16',{
      native:true,fetch:async()=>({ok:true,json:async()=>good}),...config
    });
    await a.ctx.checkAndroidAppUpdate();
    assert.equal(a.elements['#nativeUpdateOv'].hidden,true);
    assert.deepEqual(a.opened,[]);
  }
});
test('dismissed native update does not repeatedly prompt in the same session',async()=>{
  const a=evaluateWith('Android 16',{
    native:true,versionCode:1391,fetch:async()=>({ok:true,json:async()=>good})
  });
  await a.ctx.checkAndroidAppUpdate();
  a.elements['#nativeUpdateLater'].onclick();
  a.ctx.nativeUpdateCheckedAt=0;
  await a.ctx.checkAndroidAppUpdate();
  assert.equal(a.elements['#nativeUpdateOv'].hidden,true);
  assert.deepEqual(a.opened,[]);
});
test('public browser has no native installer and offline Service Worker remains',()=>{
  const sw=readFileSync('sw.js','utf8');
  assert.match(sw,/yawmi-v193-apk-only-native-updates/);
  assert.match(source,/navigator\.serviceWorker\.register\('sw\.js'\)/);
  assert.match(source,/id="installAppBtn"/);
  assert.match(source,/id="nativeUpdateNow"/);
  assert.match(source,/id="nativeUpdateLater"/);
  assert.doesNotMatch(source,/<script[^>]+src="\.\/native-bridge\.js"/);
});
