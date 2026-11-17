// Android/iOS-only bridge. Bundled by esbuild into the Capacitor web assets.
// The deployed PWA never loads this file; no production user data is touched.
import { Capacitor, SystemBars, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const managedMin = 11000;
const managedMax = 11999;
const focusId = 15001;
const focusTestId = 15002;
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
const focusDoneChannels = Object.freeze({
  work: 'yawmi_focus_work_done_v1',
  break: 'yawmi_focus_break_done_v1'
});
const focusDoneMessage = Object.freeze({
  work: { title:'🎉 خلصت جلسة تركيز!', body:'وقت راحة قصيرة، تستاهل 👏' },
  break:{ title:'⏰ خلصت الراحة!', body:'يلا نكمّل تركيز 💪' }
});
function completionPayload(phase) {
  const p = phase === 'break' ? 'break' : 'work';
  return {
    id:focusId,
    title:focusDoneMessage[p].title,
    body:focusDoneMessage[p].body,
    channelId:focusDoneChannels[p],
    smallIcon:p === 'work' ? 'ic_yawmi_focus' : 'ic_yawmi_break',
    autoCancel:true,
    extra:{ yawmiFocus:true, focusPhase:p }
  };
}
async function configureFocusSounds() {
  // Separate audible channels from the silent low-importance Live Focus channel.
  // Android 8+ sound is a property of the channel, not of an individual alert.
  await FocusLive.prepareCompletionAlerts();
}
async function scheduleFocus({ endsAt, phase }) {
  // An explicit new session replaces any previous completion reminder.
  await cancelIds([focusId]);
  if (!native || !(Number(endsAt) > Date.now())) return false;
  if (!(await permissionGranted())) {
    await FocusLive.hide().catch(e=>console.warn('Focus notification cleanup',e));
    return false;
  }
  await configureFocusSounds();
  const notification = {
    ...completionPayload(phase),
    schedule: { at:new Date(Number(endsAt)), allowWhileIdle:true }
  };
  const results = await Promise.allSettled([
    LocalNotifications.schedule({ notifications:[notification] }),
    FocusLive.show({ endsAt:Number(endsAt), phase })
  ]);
  results.forEach((result,index)=>{
    if(result.status==='rejected') console.warn(
      index===0 ? 'Focus audible completion scheduling failed' : 'Focus Live Update unavailable',
      result.reason);
  });
  // The completion reminder, not the ongoing status, is essential.
  return results[0].status==='fulfilled';
}
async function completeFocus({ phase }) {
  // WebView can reach zero ahead of the Android scheduled alarm; don't cancel
  // the pending alert and leave the user with silence. Ensure one audible
  // completion notification immediately when the app is in the foreground.
  await FocusLive.hide().catch(e=>console.warn('Focus live status cleanup',e));
  if (!native || !(await permissionGranted())) return false;
  try {
    const delivered = (await LocalNotifications.getDeliveredNotifications()).notifications || [];
    if(delivered.some(n=>n.id===focusId)) return true; // already rang in background
    await configureFocusSounds();
    await cancelIds([focusId]); // cancel only the pending, not the displayed one
    await LocalNotifications.schedule({notifications:[completionPayload(phase)]});
    return true;
  } catch(e) {
    console.warn('Immediate focus completion alert failed',e);
    return false;
  }
}

async function testFocusSound(phase='work') {
  if(!native || !(await permissionGranted())) return false;
  await configureFocusSounds();
  await LocalNotifications.schedule({ notifications:[
    { ...completionPayload(phase), id:focusTestId }
  ] });
  return true;
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
  completeFocus,
  testFocusSound,
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
