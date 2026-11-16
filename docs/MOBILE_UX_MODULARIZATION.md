# Yawmi mobile UX and modular refactor roadmap

## Current audit (16 November 2026)

- Native Android debug APK opens in emulator. Web/PWA remains deployed from `main`.
- **Safe area:** Native-only CSS spacing and StatusBar plugin are introduced on this branch; Android emulator and physical notch/status-bar tests must pass before merge. The OS may force edge-to-edge layouts on recent Android versions; do not assume `overlay: false` alone solves every device.
- **Notifications:** Current implementation uses `Notification`, `navigator.serviceWorker.ready` and a foreground `setInterval(checkDueReminders, 60000)`. This is not a reliable native background scheduler; **do not advertise reminders as working in the background yet**.
- **Focus timer:** `focusState.remaining--` each second from `setInterval`. WebView background throttling breaks elapsed-time correctness. The habit recovery counter already uses `Date.now() - since`, so it can recalculate elapsed time after reopening.
- **Android top bar / notch:** Android can show an ongoing notification and (on supported devices) system UI. A Google Maps-like ongoing chip is not automatically provided by Capacitor. Foreground Service requires native implementation and compliance with Android foreground-service types, permissions and Play policies. iOS Live Activities / Dynamic Island require a separate native implementation.

## Incremental refactor plan (no user-data migrations yet)

1. **Extract pure domain logic** (tasks, habits, notes, expenses, focus timer) to independent ES modules; add unit tests first.
2. **Introduce adapters** for storage, auth/sync, notifications, app lifecycle, file export and system bars. Keep current storage keys and Supabase payload shape unchanged.
3. **Build an elapsed-time timer:** store `startedAt`, `durationMs`, `pausedElapsedMs` and phase. Derive remaining time from `Date.now()`, never count seconds by trusting background `setInterval`. Persist safely and recalculate on resume.
4. **Schedule actual notifications:** use `@capacitor/local-notifications` for native Android/iOS, permission prompts and schedule IDs, while retaining browser Notification API for web. Test exact alarms and Android 13+ permission requirements; schedule events instead of polling every minute.
5. **Optional ongoing timer UI:** first implement scheduled completion notification and a persistent in-app timer. Only add a foreground service/ongoing Android notification if users genuinely need live progress in the status bar, and validate battery use and store compliance. For iOS, Live Activities is a separate later phase.
6. **UI modules:** split styles into tokens, layout, components, sheets, and native-safe-area styles; keep current selectors and theme variables for visual parity.
7. **Regression and migration:** run web + Android tests against a synthetic Supabase user; export/import backups before switching storage. Never rewrite production records without a tested migration.

## Acceptance tests for native safe area

- Test Android 15 and Android 16, with gesture and 3-button navigation.
- Test a real Android phone with a hole-punch camera/notch and different display cutout settings.
- Status icons are readable in light/dark theme, top header never overlaps clock/battery, bottom nav never overlaps gesture bar.
- Test keyboard, orientation, modals, onboarding, scrolling, and font-size settings.
- Confirm web PWA remains visually unchanged.
- Confirm `StatusBar` plugin sync and Android debug build succeed.

**Release blockers:** native notification scheduling, focus timer elapsed-time logic, background and permission tests, Google OAuth, safe Supabase sync, and account deletion remain pending.
