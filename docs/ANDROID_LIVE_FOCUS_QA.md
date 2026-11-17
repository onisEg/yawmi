# Android focus Live Update — beta QA

## Implementation

- `FocusLivePlugin.java` registered in `MainActivity` posts a standard ongoing Android system notification with `Notification.Builder` and `setChronometerCountDown(true)`.
- Two vector status icons indicate **🎯 focus** and **☕ break**; no background JavaScript polling, wakelocks or foreground service.
- It requests promoted ongoing display through the Android 16.1-compatible optional API when present and declares `POST_PROMOTED_NOTIFICATIONS`. An ordinary ongoing notification is the fallback.
- LocalNotifications schedules a **separate**, inexact end-of-session alert; both channels are canceled when paused/reset/skipped. The ongoing countdown times out shortly after deadline even if WebView is suspended or process dies.
- Notification permission is requested only as the user actively starts a session, not at page load. `yawmi_focus_runtime_v2` is preserved.
- Android OS/OEM owns the upper pill: Realme's island-style presentation is **not guaranteed**. Android 15 emulator can validate an ongoing notification, not Android 16/Realme pill design.

## Acceptance on real device

1. Install the **same-certificate** new Beta over the previous Yawmi Beta — **do not uninstall**.
2. Confirm existing tasks, notes, backups and focus state remain available.
3. Start a 15/25 min focus session and grant the notification permission; lock the screen and switch apps.
4. Check notification shade and status capsule for **target/focus icon** and accurate remaining time. Observe if Realme promotes this into its proprietary mini capsule.
5. Pause/reset and verify ongoing notification disappears.
6. Skip to break, start break, verify **cup/rest icon**, and confirm its progress ends.
7. Let a short session finish with the screen off; expect completion notification, with possible Doze delay.
8. Verify no duplicate notifications after force stop/relaunch, and test offline and after a full device restart.

Google Android docs: https://developer.android.com/develop/ui/views/notifications/live-update and https://developer.android.com/reference/android/app/Notification.Builder

## QA limitations

Android emulator build/launch and static notification contract checks **are not** equivalent to a physical Realme 14 Pro+ test. Promoted Live Updates require device support and eligibility; the user must test the upper capsule and grant permissions. This does not alter iOS or desktop PWA UI.
