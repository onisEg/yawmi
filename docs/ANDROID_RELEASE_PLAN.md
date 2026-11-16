# Yawmi → Android / Google Play — implementation plan

**Status (2026-11-16):** Native Android project tracked, dependency lockfile committed, emulator smoke-tested. **Debug-only, not a Google Play release.**
**Source:** Existing public GitHub Pages PWA. Production site is left unchanged.
**Approach:** Capacitor 8 native Android shell, existing HTML/CSS/JS retained for the first milestone.
**Android app ID (PROVISIONAL):** `in.yawmi.app`; confirm the permanent ID before first Play upload.

## Verified milestone: 2026-11-16

- **Automated JavaScript tests:** 13/13 passed on GitHub Actions. Checks cover original asset integrity, app identity, native PWA guards, merge conflict cases, delete tombstones, failed cloud-pull write protection, and notes/challenges in backup import/export.
- **Android debug build:** Capacitor 8 / compile and target API 36 / min API 24. Gradle `assembleDebug` passed, APK signed with a development key and checked for the signature block.
- **Source control:** Generated `android/` project and exact `package-lock.json` committed to this feature branch only. Yawmi original icon used for native icon/splash generation.
- **Real emulator:** Android 15 API 35 emulator installed the APK, launched and reopened `in.yawmi.app/.MainActivity`. Arabic RTL Yawmi welcome/onboarding UI rendered on both first and second launch after initial WebView warmup; full screenshot evidence is preserved in Actions artifacts. No `AndroidRuntime` fatal exceptions were logged.
- **Known nonfatal console warning:** Capacitor's injected safe-area CSS reports three null-style errors in this emulator. Check layout on physical Android devices.
- **No production impact:** Website `main` not modified; Supabase production data and policies not changed. DB checks were read-only.

GitHub Actions build example: https://github.com/onisEg/yawmi/actions/runs/43931519708  
Emulator evidence: https://github.com/onisEg/yawmi/actions/runs/43931519726

**Next release-blocking work:** test authenticated sync end-to-end with an isolated test account; implement secure native Google OAuth/deep link if retaining Google login; verify native JSON import/export and PDF/CSV sharing; implement genuine Android scheduled notifications; verify Android back navigation, offline restart/persistence, and local data migration UX; review production Supabase security and account deletion/privacy policy; test on a physical device; then build a signed release AAB with a protected keystore.

## 1. Non-negotiable data safeguards

1. Do not edit the production `main` branch or deploy mobile-only work to GitHub Pages before testing.
2. Do not alter Supabase schema, RLS policies, Auth configuration, or existing user rows as part of creating the Android shell.
3. Existing browser/PWA localStorage **will not automatically transfer** to Capacitor's new app origin. Tell local-only users to export a backup before switching devices. Do not uninstall or clear the PWA.
4. Existing signed-in users should sign into the Android version with the **same Supabase account** after verifying that a cloud backup has completed. Use a test account with synthetic data for the first Android tests; do not test migrations on real user records.
5. Freeze and test the initial cloud merge before enabling writes from a production Android release. A failed pull must never be followed by an overwrite of cloud data.
6. Keep rollback options: never delete the website/PWA; retain existing signing keys and backup procedures.

## 2. Initial build — Windows / macOS / Linux

Prerequisites: Node.js 22+, Android Studio compatible with Capacitor 8, Android SDK (API 36 for 2026 Play requirements), a test Android device or emulator. Android Studio should manage the JDK.

```bash
git clone https://github.com/onisEg/yawmi.git
cd yawmi
git fetch origin
git switch feat/android-capacitor-foundation
npm install
npm run build
npm run android:add
npm run android:open
```

- `npm run build` copies only web assets into `dist/`; source remains unchanged.
- `npm run android:add` creates the `android/` native project. Run this **once**.
- `npm run android:sync` updates it after changing web files or Capacitor plugins.
- Use Android Studio's Run button to run on a physical device or emulator.
- After the Android project is generated and verified, commit the `android/` sources and `package-lock.json` on this feature branch. Never commit `android/local.properties`, keystores or secrets.
- Build a **signed AAB** from Android Studio for Play (APK is useful for local testing).

## 3. Known compatibility work BEFORE any public release

| Area | Current issue | Required work |
| --- | --- | --- |
| Cloud data | localStorage is origin-scoped and cloud merge writes a merged snapshot | Backup/export checklist, synthetic-user regression tests, read-before-write safety |
| Google sign-in | `signInWithOAuth` redirects to current web URL | Use system browser + deep link/App Link (or browser-based verified return flow); test Android return with real providers |
| Password reset | Redirect currently points to GitHub Pages | Define and verify Android-safe recovery UX, preserve website reset flow |
| CDN dependencies | `supabase-js` imported from external CDNs | Bundle/pin dependency locally so the UI works offline; keep auth network error handling |
| Notifications | Browser Notification/Service Worker + 60-second foreground timer | Implement Capacitor Local Notifications and Android notification permission; test background delivery |
| PWA install prompt | Browser install banner and `isStandalone()` detection | Hide PWA installation UI in native app, without changing the website experience |
| Export / reports | Object URL downloads, `window.open`, printing | Use Android share/filesystem or suitable export UI; test JSON/CSV/PDF |
| Back navigation | Web dialogs and in-app tabs | Ensure Android back closes overlays/navigates instead of unexpectedly closing the app |
| Storage / PIN | PIN and data stored in web storage | Test lock, hashing compatibility, secure session handling and data recovery |
| Splash, icons, RTL | PWA icons are not final Android assets | Generate adaptive icons, splash screen, dark mode and accessibility checks |
| Privacy / account deletion | Users can sign up | Add in-app account deletion request and a public deletion webpage, plus privacy policy |
| Security | `yawmi_sync` in checked live Supabase currently has an overly broad allow-all RLS policy; a `SECURITY DEFINER` function `rls_auto_enable()` is callable via Data API | Review, snapshot and remediate separately, after approval. Avoid changing DB during shell setup |
| Release | Requires compliance checks | Play data safety form, content rating, support contact, screenshots, test tracks, target API 36 and signed AAB |

## 4. Acceptance checks for the first Android milestone

- App opens and renders every tab in Arabic RTL.
- With airplane mode enabled, locally stored sample data remains visible and editable after relaunch.
- Local test data survives app close/reopen.
- Email+password login works on a **test** account; sign-out doesn't destroy original website data.
- No unintended initial cloud writes during a failed pull.
- Google sign-in, password reset, notification, exports: tracked as **not yet validated** (do not claim release-ready).
- Confirm app ID and Play Console identity before publishing.

## 5. Play publishing requirements (as checked November 2026)

- New apps and updates require Android 16, API 36 target for standard mobile Android apps.
- Use Android App Bundle (**.aab**) for a new Play listing; signed APK is for direct Android testing.
- Personal developer accounts created after November 13, 2023 generally need a closed test with at least 12 opted-in testers for 14 continuous days before production access application.
- Account creation in app means Google Play requires an account deletion path both in-app and from a public web resource.
- Play Console registration fee is currently USD 25 one-time.
- Consult the current Google Play Console requirements before submission.

**References:** https://capacitorjs.com/docs/getting-started ;
https://capacitorjs.com/docs/android ;
https://support.google.com/googleplay/android-developer/answer/11926878 ;
https://support.google.com/googleplay/android-developer/answer/14151465 ;
https://support.google.com/googleplay/android-developer/answer/18265346

**Do not merge this branch into main until native compatibility and data-safety acceptance tests pass.**
