# Yawmi v1 — unified Liquid Glass beta candidate

## Scope
This is a **beta-only preview** of the existing Yawmi app with the full-app Liquid Glass visual treatment reused from `design/liquid-glass-full-app-beta`.
- One consistent visual style for Today, tasks, expenses, notes, settings, navigation, forms, dialogs and shared cards.
- Keep the current focus timer, prayer, habits, goals, tracking and native code exactly as in the source baseline.
- No app state schema, Supabase, SQL, auth, service worker, sync data, user content, or localStorage migration changes.
- Do NOT auto-merge this branch to the deployed GitHub Pages main without explicit release approval and visual QA.
- Existing APK signed with certificate SHA-256 `730a84f331a2178819358a8a7e97baa4004c410898717adbe976489c172901d8` cannot be updated in-place by the new v1 key SHA-256 `1d57e58ab6b46eccebdf4ae4e7ee2dd61bcd2674bd6466af74f267d66000001d`. This is an Android security rule. Preserve local-only data by exporting or verifying Supabase sync before switching installations.
- Naming this candidate v1 is a product milestone; a **signed v1 APK has NOT been published** merely by creating this branch.

## Before publishing a v1 APK
1. Run `npm test` and UI tests for light/dark RTL (including 320px widths) and focus timer.
2. Set Android `versionName` to 1.0.x and monotonic `versionCode` in the signed build pipeline.
3. Sign future versions with the same new keystore and verify its public fingerprint (never commit the private key).
4. Produce a signed APK and install on a test device; verify user-data restore and notifications.
5. Publish only after checking the official release file and in-app download/update paths.
