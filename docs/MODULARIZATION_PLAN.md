# Yawmi — safe modularization roadmap (Web / Android / iOS)

## Mobile build verification — 16 November 2026

- Android GitHub Actions build and JavaScript tests: passed — https://github.com/onisEg/yawmi/actions/runs/43942981331
- Android 15 emulator: successfully installed, opened, stopped and reopened `in.yawmi.app.preview`. Screenshot pixel-dispersion validation passed; no WebView JavaScript syntax errors were found — https://github.com/onisEg/yawmi/actions/runs/43942981342
- The debug package uses `applicationIdSuffix ".preview"` so it can coexist with an older installed debug APK. **It has its own local storage; do not uninstall the existing app.**
- Native reminders are implemented and detected by the emulator's Capacitor plugin calls, but **scheduled background delivery has not been physically tested on a real Android device**.
- An actual ongoing status bar countdown / Android foreground service and iPhone Dynamic Island / Live Activities are **not included**.
- The safe-area display is verified on an Android 15 emulator, not on every device notch, cutout, gesture mode or keyboard.

## Current reality
- The production PWA lives in one ~500 KB `index.html` with inlined CSS and JavaScript.
- A single deployed PWA is in production and users have saved data in both localStorage and Supabase.
- Capacitor wraps the same code on mobile; platform APIs must be behind adapters.
- **This branch improves mobile safe areas, notification scheduling and the Pomodoro clock. It does NOT rewrite the app or the Supabase schema.**

## Target structure

```text
src/
  app/                 # bootstrap, navigation, lifecycle
  components/          # toast, sheet, modal, buttons, cards
  features/
    today/             # prayers, daily check-in, dates
    tasks/             # tasks, priorities, trash
    habits/            # habits, dhikr, challenges
    finance/           # expenses, obligations, budgets
    notes/             # journal, notes, search
    focus/             # Pomodoro clock and state
    reminders/         # schedules, preferences, delivery
    profile/           # auth, settings, data export
  services/
    auth/              # Supabase auth wrapper
    sync/              # merge, offline conflict policies
    storage/           # stable storage keys, schema migrations
    prayer-times/      # cached prayer-time API
  platform/
    index.js           # web/native interface
    web/               # PWA notifications, downloads
    native/            # Capacitor notifications, files, system bars
  styles/
    tokens.css
    base.css
    layout.css
    safe-area.css
    components.css
  tests/
    unit/
    integration/
    e2e/
```

## Migration sequence (small reviewable PRs)

1. **Tests before extraction.** Lock down storage formats, cloud merge behavior, exports, key interactions, RTL and navigation. Use fixture accounts, not real users.
2. **CSS extraction.** Move tokens and base styles to separate files without changing computed styles. Keep PWA stylesheet URLs and service worker caching correct.
3. **Pure functions.** Extract date/time math, money formatting, expenses and merge helpers, leaving the browser DOM wiring intact.
4. **Storage + sync adapters.** Keep the existing localStorage key names and Supabase JSON structure. Add schema-versioned migrations, conflict resolution tests and explicit backups.
5. **Feature modules.** Gradually extract focus, reminders, notes, tasks, etc. Each PR should change one feature and demonstrate behavior parity.
6. **Platform adapters.** Refine native notification scheduling, Android file sharing, system bar insets, iOS Live Activities (optional), and browser fallback.
7. **Build standardization.** Add Vite + TypeScript gradually, test web and native outputs, and generate versioned assets in CI. Avoid mass-reformatting core code during functional fixes.

## Data preservation contract

- Never rename, clear, or migrate existing user localStorage keys without a tested backwards-compatible migration.
- No destructive Supabase migration or bulk user update in a mobile UI PR.
- Maintain `yawmi_data` JSON field shape until both web and mobile readers support new versions.
- Build with disposable test users and synthetic data. Verify empty-device logins and cross-device merges.
- Keep PWA and Android releases independent; do not auto-merge Android UI into `main`.
- A release requires an explicit tested rollback path and retained backup file import.
- Audit auth/session storage, pinned dependencies, and RLS separately.

## Native specifics after this milestone

- **Notifications:** Current native bridge schedules **inexact** notifications for enabled daily reminders for up to seven days, cached **today-only** prayer times, and near-term obligations. Android permission is requested. This is not a continuous server push service: reopen the app periodically to refresh future reminders; battery optimization can defer exact delivery. Confirm background delivery on actual hardware.
- **Focus timer:** Calculates remaining time from an absolute deadline and persists local state; schedules a native completion notification if permission is available. It can count accurately across app pause/restart. It does **not** yet expose a persistent Android foreground-service notification or iOS Live Activity/Dynamic Island UI.
- **System bars:** Android 16 edge-to-edge handled via Capacitor SystemBars CSS inset injection, with CSS env() fallback for web/iOS.
- **Physical-device QA:** Test status bar/camera cutout, gesture navigation, display zoom, landscape, keyboard, Android 13 notification permission, battery saver, background timer and restart.
- **Release risks:** Google OAuth native redirect, password reset, offline/online Supabase sync, PDF/file sharing and data protection need dedicated tests before store release.

## Definition of done for the full refactor
- Feature behavior parity verified on Web/PWA + Android.
- Data loss tests fail on intentional regression and pass on actual stable implementation.
- New modules have targeted tests, no circular imports, and named/public boundaries.
- No unsupported assumptions about native background execution or Dynamic Island.
