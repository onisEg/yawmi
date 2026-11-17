# Yawmi Beta: audible focus + break completion (17 Nov 2026)

## What went wrong

1. `FocusLivePlugin` displayed the ongoing timer in a LOW-importance notification channel. This channel is purposely silent and should not be used for end-of-session alarms.
2. The old `LocalNotifications` focus reminder had no dedicated audible Android 8+ channel. Sound depends on the **notification channel**, not on the JS notification title.
3. When `tickFocus()` reached zero in the foreground, it immediately called `cancelFocus()`, potentially cancelling the OS-scheduled completion notification before Android could deliver it. This was a real cancellation race.
4. Android's inexact scheduled alarms can be delayed by Doze/battery restrictions. This first audio fix ensures an audible channel but **does not promise second-accurate alerts while the device sleeps**.
5. The Android 16/Realme proprietary mini capsule is not guaranteed by `POST_PROMOTED_NOTIFICATIONS` alone. The device OS and OEM must support/promote the ongoing notification.

## Solution

- Dedicated HIGH-priority, vibration + default notification sound Android channels:
  - `yawmi_focus_work_done_v1`
  - `yawmi_focus_break_done_v1`
- Keep the existing low-priority, silent channel for the ongoing countdown (avoids sounding every time progress is updated).
- `scheduleFocus` creates the audible channels before scheduling the completion.
- `completeFocus` hides the ongoing status without losing the end alert; if Android hasn't shown the scheduled alert yet, it posts one immediately.
- `pauseFocus` and reset/skip still cancel pending completion alarms.
- Separate **test sound** buttons in native focus screen, using a different notification ID from the running timer, so QA doesn't interrupt a live session.
- No Supabase schema, user storage keys, sync policies, session data or production `main` changes.
- Audio respects Android notification volume, user channel overrides, notification permission, Silent/Do Not Disturb, background restrictions and device policies.

## Manual acceptance — Realme

1. Update the **existing Yawmi Beta** in place (same APK package/signing key).
2. Enter Focus. Tap `جرّب صوت التركيز` and `جرّب صوت الراحة`. The test notification should appear and play the system notification sound (if phone isn't muted).
3. Android Settings > Apps > Yawmi Beta > Notifications: ensure both **انتهاء فترة التركيز** and **انتهاء فترة الراحة** channels are enabled and have a sound.
4. Run a 15-min (or custom short) session, leave app in background, check end notification at expected time. Distinguish actual alarm delay from silent-channel issue.
5. Test same in foreground and verify completion phase switches and no duplicate alerts.
6. Test pause, skip and reset: no stale completion alert afterwards.
7. Disable battery optimization for beta if Realme suspends background notifications.
8. Upper mini-capsule appearance may still differ or not show on this Realme firmware. Check normal notification shade even if pill is absent.

## Follow-up

If alerts still arrive late in locked Doze mode, evaluate `SCHEDULE_EXACT_ALARM` + an opt-in **Alarms & reminders** settings flow or an approved alarm-service alternative. Do not silently add `USE_EXACT_ALARM` without Google Play policy review.

Official docs:
- https://capacitorjs.com/docs/apis/local-notifications
- https://developer.android.com/develop/background-work/services/alarms
- https://developer.android.com/develop/ui/views/notifications/live-update
