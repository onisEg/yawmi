/* Yawmi mobile installer: honest PWA + verified public Android APK.
 * Browser-only; never requests production user data or modifies app storage.
 * Do not put a guessed/temporary APK URL in the page: the download is shown
 * only when GitHub returns an actual official, published release asset.
 */
(function () {
  'use strict';

  const RELEASES_API = 'https://api.github.com/repos/onisEg/yawmi/releases?per_page=10';
  const ASSET_NAME = 'yawmi-beta.apk';
  const TAG_PREFIX = 'yawmi-android-beta-v';
  const DISMISS_KEY = 'yawmi_mobile_install_dismissed_session';

  function platform() {
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
    return 'other';
  }
  function alreadyInstalled() {
    try {
      return window.__YAWMI_NATIVE_BUILD === true ||
        !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
        !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;
    } catch (_) { return false; }
  }

  function getVerifiedApk(releases) {
    if (!Array.isArray(releases)) return null;
    for (const release of releases) {
      if (!release || release.draft || typeof release.tag_name !== 'string' ||
          !release.tag_name.startsWith(TAG_PREFIX) || !release.published_at) continue;
      const asset = Array.isArray(release.assets) && release.assets.find(item =>
        item && item.name === ASSET_NAME &&
        Number.isFinite(item.size) && item.size > 500000 && item.size < 150000000 &&
        typeof item.browser_download_url === 'string'
      );
      if (!asset) continue;
      try {
        const download = new URL(asset.browser_download_url);
        if (download.protocol !== 'https:' || download.hostname !== 'github.com' ||
            !download.pathname.startsWith('/onisEg/yawmi/releases/download/')) continue;
        return {url:download.href, version:release.tag_name.replace(TAG_PREFIX, '')};
      } catch (_) {}
    }
    return null;
  }

  async function checkOfficialRelease() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch(RELEASES_API, {
        headers: {Accept:'application/vnd.github+json'}, signal:controller.signal,
        cache:'no-store'
      });
      if (!response.ok) return null;
      return getVerifiedApk(await response.json());
    } catch (_) { return null; }
    finally { clearTimeout(timeout); }
  }

  function mount() {
    if (platform() === 'other' || alreadyInstalled() || document.getElementById('yawmiMobileInstaller')) return;
    try { if (sessionStorage.getItem(DISMISS_KEY) === '1') return; } catch (_) {}
    // Existing PWA install prompt remains available in app settings. Suppress
    // the legacy one-button mobile banner so users aren't shown two popups.
    const oldBanner = document.getElementById('installBanner');
    if (oldBanner) oldBanner.style.display = 'none';

    const card = document.createElement('aside');
    card.id = 'yawmiMobileInstaller';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', 'تثبيت تطبيق يومي');
    card.setAttribute('dir', 'rtl');
    card.innerHTML =
      '<button type="button" class="ymi-close" aria-label="إغلاق اقتراح التثبيت">×</button>' +
      '<div class="ymi-title">📲 ثبّت يومي على موبايلك</div>' +
      '<p class="ymi-subtitle">تقدر تستخدم يومي من الشاشة الرئيسية بدون ما تفتح المتصفح كل مرة.</p>' +
      '<div class="ymi-actions">' +
        '<button type="button" class="ymi-pwa">تثبيت من المتصفح</button>' +
        '<a class="ymi-apk" hidden rel="noopener noreferrer">تحميل APK لأندرويد</a>' +
      '</div>' +
      '<p class="ymi-status" role="status"></p>' +
      '<p class="ymi-warning" hidden>الـ APK نسخة Beta منفصلة. بيانات الموقع المحفوظة على الموبايل مش بتتنقل تلقائيًا للتطبيق؛ سجّل دخولك للمزامنة أو صدّر نسخة احتياطية قبل الانتقال. لو عندك نسخة Beta، حدّثها من غير ما تحذفها.</p>';

    const close = card.querySelector('.ymi-close');
    close.addEventListener('click', () => {
      card.remove();
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
    });
    const pwa = card.querySelector('.ymi-pwa');
    pwa.addEventListener('click', () => {
      if (typeof window.doInstall === 'function') {
        window.doInstall();
        return;
      }
      if (platform() === 'ios') {
        card.querySelector('.ymi-status').textContent = 'في Safari: مشاركة ← إضافة إلى الشاشة الرئيسية.';
      } else {
        card.querySelector('.ymi-status').textContent = 'افتح قائمة Chrome ⋮ واختار «تثبيت التطبيق».';
      }
    });

    if (platform() === 'ios') {
      card.querySelector('.ymi-subtitle').textContent = 'في Safari تقدر تضيف يومي للشاشة الرئيسية. ملفات APK للأندرويد فقط.';
      pwa.textContent = 'طريقة التثبيت على iPhone';
    } else {
      card.querySelector('.ymi-status').textContent = 'بنتأكد من توفر APK رسمية…';
      checkOfficialRelease().then(apk => {
        if (!card.isConnected) return;
        const status = card.querySelector('.ymi-status');
        if (!apk) {
          status.textContent = 'الـ APK مش منشورة للتحميل العام حاليًا. تقدر تثبّت يومي من المتصفح.';
          return;
        }
        const anchor = card.querySelector('.ymi-apk');
        anchor.href = apk.url;
        anchor.removeAttribute('hidden');
        anchor.textContent = 'تحميل APK — Beta';
        card.querySelector('.ymi-warning').removeAttribute('hidden');
        status.textContent = 'نسخة Android Beta منشورة رسميًا على GitHub (' + apk.version + ').';
      });
    }
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('ymi-open'));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(mount, 1300), {once:true});
  else setTimeout(mount, 1300);
  // Only expose the pure verifier for deterministic test coverage.
  window.YawmiApkReleaseVerifier = {getVerifiedApk};
})();