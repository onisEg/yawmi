// Android/iOS-only bridge. Bundled by esbuild into the Capacitor web assets.
// The deployed PWA never loads this file; no production user data is touched.
import { Capacitor, SystemBars, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const managedMin = 11000;
const managedMax = 11999;
const focusId = 15001;
const FocusLive = registerPlugin('YawmiFocusLive');
const native = Capacitor.isNativePlatform();

function nextDate(day, hhmm) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hhmm || '')) return null;
  const [h, m] = hhmm.split(':').map(Number);
  const at = new Date(day);
  at.setHours(h, m, 0, 0);
  return at;
}
async function permissionGranted() {
  try { return (await LocalNotifications.checkPermissions()).display === 'granted'; }
  catch (e) { console.warn('Yawmi native notification permission check', e); return false; }
}
async function cancelIds(ids) {
  if (!ids.length) return;
  await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
}
async function clearManagedReminders() {
  const pending = (await LocalNotifications.getPending()).notifications || [];
  await cancelIds(pending.filter(n => n.id >= managedMin && n.id <= managedMax).map(n => n.id));
}
async function syncReminders(input = {}) {
  if (!native || !(await permissionGranted())) return false;
  await clearManagedReminders();
  const r = input.rules || {};
  const prayerTimes = input.prayerTimes;
  const obligations = Array.isArray(input.obligations) ? input.obligations : [];
  const now = new Date();
  const notifications = [];
  function put(day, hhmm, title, body) {
    const at = nextDate(day, hhmm);
    if (!at || at <= now || notifications.length >= 56) return;
    notifications.push({
      id: managedMin + notifications.length,
      title, body,
      schedule: { at, allowWhileIdle: true },
      isExactNotification: false,
      autoCancel: true,
      extra: { yawmiReminder: true }
    });
  }
  // Rolling 7-day schedule; refresh whenever the app opens, foregrounds or settings change.
  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const weekday = day.getDay();
    if (r.azkar) put(day, r.azkarTime || '18:00', '📿 وقت الأذكار', 'خد دقيقة لأذكارك النهارده 🤍');
    if (r.wird) put(day, r.wirdTime || '19:30', '📖 ورد القرآن', 'افتكر وردك اليومي من القرآن');
    if (r.review && weekday === 5) put(day, r.reviewTime || '20:00', '✍️ المراجعة الأسبوعية', 'النهارده الجمعة — وقت المراجعة');
    if (r.fast && (weekday === 0 || weekday === 3))
      put(day, r.fastTime || '21:00', '🌙 تذكير الصيام', 'بكرة يوم الاثنين أو الخميس — تنوي الصيام؟');
    // Prayer times are cached by date; never guess future prayer times from today's.
    if (offset === 0 && r.prayer && Array.isArray(prayerTimes) && prayerTimes.length === 5) {
      const names = ['الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء'];
      const before = Math.max(0, Number(r.prayerBefore) || 0);
      prayerTimes.forEach((minutes, i) => {
        if (!Number.isFinite(minutes)) return;
        const t = Math.round(minutes) - before;
        if (t < 0 || t >= 1440) return;
        const hhmm = String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0');
        put(day, hhmm, '🕌 ' + names[i], before ? 'فاضل ' + before + ' دقيقة على الصلاة' : 'دخل وقت ' + names[i]);
      });
    }
    for (const obl of obligations) {
      if (obl.del || !obl.due || obl.paid) continue;
      if (obl.remind && obl.due === localISO(day))
        put(day, obl.remindTime || '10:00', '💰 موعد التزام', 'النهارده موعد "' + (obl.t || 'التزام') + '"');
      if (obl.remindEarly) {
        const early = new Date(obl.due + 'T12:00:00');
        if (Number.isNaN(early.getTime())) continue;
        early.setDate(early.getDate() - (Number(obl.remindDays) || 7));
        if (localISO(early) === localISO(day))
          put(day, obl.remindTime || '10:00', '⏳ موعد التزام قريب', 'قرب موعد "' + (obl.t || 'التزام') + '"');
      }
    }
  }
  if (notifications.length) await LocalNotifications.schedule({ notifications });
  return notifications.length;
}
function localISO(date) {
  return [date.getFullYear(), String(date.getMonth()+1).padStart(2,'0'), String(date.getDate()).padStart(2,'0')].join('-');
}
async function scheduleFocus({ endsAt, phase }) {
  // The native status notification is independent from the end-of-session alert.
  // A countdown can keep rendering in Android while the JS WebView is suspended.
  await cancelIds([focusId]);
  if (!native || !(Number(endsAt) > Date.now())) return false;
  if (!(await permissionGranted())) {
    try { await FocusLive.hide(); } catch(e) { console.warn('Focus notification cleanup', e); }
    return false;
  }
  const results = await Promise.allSettled([
    LocalNotifications.schedule({ notifications: [{
      id: focusId,
      title: phase === 'break' ? '⏰ خلصت الراحة' : '🎉 خلصت جلسة تركيز!',
      body: phase === 'break' ? 'يلا نكمّل تركيز 💪' : 'وقت راحة قصيرة، تستاهل 👏',
      schedule: { at: new Date(Number(endsAt)), allowWhileIdle: true },
      isExactNotification: false, autoCancel: true,
      extra: { yawmiFocus: true }
    }] }),
    FocusLive.show({ endsAt: Number(endsAt), phase })
  ]);
  results.forEach((result, index) => {
    if (result.status === 'rejected') console.warn(
      index === 0 ? 'Focus completion reminder unavailable' : 'Focus live status unavailable',
      result.reason);
  });
  return results.some(result => result.status === 'fulfilled');
}
async function show(title, body) {
  if (!native || !(await permissionGranted())) return false;
  await LocalNotifications.schedule({ notifications: [{
    id: 16000 + (Math.floor(Date.now()/1000) % 1000),
    title, body, autoCancel: true
  }] });
  return true;
}
const api = {
  isNative: native,
  hasPermission: permissionGranted,
  async requestPermission() {
    try { return (await LocalNotifications.requestPermissions()).display === 'granted'; }
    catch (e) { console.error('Yawmi notification permission', e); return false; }
  },
  syncReminders,
  scheduleFocus,
  async cancelFocus() {
    await Promise.allSettled([cancelIds([focusId]), FocusLive.hide()]);
  },
  show,
  async setSystemBarsTheme(theme) {
    try { await SystemBars.setStyle({ style: theme === 'dark' ? 'DARK' : 'LIGHT' }); }
    catch (e) { console.warn('System bars style unavailable', e); }
  }
};
if (native) {
  window.YawmiNative = api;
  window.dispatchEvent(new Event('yawmi-native-ready'));
  api.setSystemBarsTheme(document.documentElement.getAttribute('data-theme')).catch(console.warn);
}
