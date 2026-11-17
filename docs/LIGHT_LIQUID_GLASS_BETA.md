# Yawmi Light Liquid Glass — visual beta (17 November 2026)

## Intent
A light-first premium visual refresh, **not** an information architecture rewrite. Existing pages, order, Arabic RTL labels, settings, prayers, habits, expenses, tasks, notes, goals, navigation, and every user-data format are retained.

## Branch & release safety
- This experiment branches from `fix/focus-audible-completion-and-legacy-security-plan`, **not** from deployed `main`.
- No Supabase SQL, Auth, RLS, user records, keys or cloud payloads were changed.
- Do not merge/deploy to the production GitHub Pages site without user acceptance, data/visual regression tests and a separate promotion decision.
- The historical `yawmi_focus_runtime_v2` localStorage key is unchanged; no second timer state and no storage migration.
- A new last-in-cascade `styles/liquid-glass.css` implements the visual layer; disable the link to revert the styling without changing data.

## What changed
1. Light-only translucent card surfaces, soft gradient background, navigation glass, elevated buttons, and focus sheet visual polish. Dark mode remains substantially the legacy appearance.
2. The original Focus card **stays in the same Today card slot with the same `data-cid="focus"`**, but it now shows remaining time, work/break phase, chosen duration, linked task, completion count and progress.
3. Inline Quick Start / Pause / Resume controls use the existing `startFocus()` and `pauseFocus()`. The existing Focus sheet still opens from a dedicated settings button.
4. Closing the sheet leaves the session running (behavior inherited from the upstream Android beta).
5. When reopening the sheet, selected preset button styling reflects the actual persisted duration, instead of misleadingly showing 25/5.
6. The new stylesheet is shipped by the native staging build and PWA offline precache. Offline cache is beta-scoped and bumped.
7. Browser focus test now covers an alternative duration, sheet closure, browser reload, preset selection and quick pause.

## Acceptance checks
- View every tab in RTL, light and dark mode; check very narrow screens and safe areas.
- Pick 50/10, start focus, close the sheet: the card still shows that configuration, live time and active state. Pause from card, resume, reopen sheet, reload.
- Confirm native scheduled finish notification still cancels on Pause and remains scheduled when closing the sheet.
- Verify all `npm test` and `npm run test:e2e` suites pass on CI; check emulator startup.
- Confirm task create/edit/delete, journal, expenses, prayers, account login, backups and offline operation did not change.
- Confirm original `main` GitHub Pages site and production Supabase have not been touched.

## Explicitly out of scope
- Customized focus/break notification sounds and Android Live Update OEM capsule fixes.
- Free-form duration inputs or changes to focus-state serialization.
- Whole-app React/Vite conversion, new data schema or visual redesign of page hierarchy.
- Play Store release, native signed beta distribution or production deployment.

## Rollback
Remove `styles/liquid-glass.css` link and the `#focusCard` local presentation changes on the beta branch. The saved data and original timer code remain compatible.
