# Yawmi — APK-only Android installation and update notices

## Website experience (new UX)
- The Android website no longer offers an in-app **PWA install** button, browser PWA prompt, or a PWA fallback when the APK is not available.
- On Android, **Download Yawmi (APK)** always means a real official .apk. The download CTA stays hidden until the latest, non-draft, non-prerelease GitHub Release contains a verified-format `Yawmi-Beta-v0.x.versionCode.apk` asset matching the release tag.
- The Settings download action explicitly says APK. If no release is published, it says that the APK is unavailable instead of silently installing a web shortcut.
- Browser users on iOS or desktop are not offered an Android APK installer.
- The service worker, manifest and existing PWA installations are NOT removed. They still support offline operation, and existing PWA users may have valuable local data. This change only disables Yawmi's first-party PWA installation promotions.

## Native Android Beta updates
- New signed Android Beta builds bundle `YawmiUpdatesPlugin`. It reads the ACTUAL installed Android `versionCode` and package name using PackageManager.
- On app launch (and when reconnecting online), the app reads the latest official GitHub release and validates the signed-release metadata and APK URL. Only a newer `versionCode` for installed `in.yawmi.app.beta` opens the "Update available" dialog.
- **Update now** opens the verified HTTPS GitHub APK asset in an external Android browser. Android handles download and asks for user confirmation to install. No silent installs or broad install permission.
- **Later** defers the prompt for the current app session; the app remains usable without Internet.
- Existing APKs without this new native bridge cannot acquire it merely by visiting the hosted web page. A NEW APK containing this feature must be built, signed with the ORIGINAL Beta key, tested as an in-place update on a real device, and published before update prompts become available to existing native users.

## Release/signing requirements
1. The repository had **no public GitHub Releases** at the time this branch was prepared; do not advertise an APK until there is a real public asset.
2. Native package `in.yawmi.app.beta`, original certificate SHA-256 `730A84F331A2178819358A8A7E97BAA4004C410898717ADBE976489C172901D8` and strictly increasing `versionCode` are required for updating users in place.
3. The existing `publish-signed-android-beta.yml` workflow is intentionally pinned to the audited old source commit. It will NOT include this native update checker until the exact tested source commit is reviewed and intentionally re-pinned. Do not remove the pin or use an unreviewed moving branch with signing secrets.
4. Publish a signed `.apk` plus `SHA256SUMS.txt` as the official latest GitHub Release with tag `android-beta-v0.4.VERSION_CODE` (or `android-beta-v0.3.VERSION_CODE`) and identically named asset `Yawmi-Beta-v0.4.VERSION_CODE.apk` (or `Yawmi-Beta-v0.3.VERSION_CODE.apk`).
5. Back up/export local-only user data; **never uninstall** an existing APK to work around a signature/version problem. Existing installed PWAs and APKs do not share the same local storage. Sign-in/cloud-sync or export/import must be verified before switching.
6. The update UX and publishing are distinct from production Supabase `yawmi_sync` RLS work. No database schema, policies, user rows, storage keys, auth or sync protocols changed here.

## Verification checklist
- Node contracts + Playwright browser/mobile + native Gradle compile pass on the final PR SHA.
- Android website offers only real APK downloads (and never the PWA prompt), including when offline / GitHub API returns 404/rate limits.
- Native Beta at versionCode 1391 only shows an update when a verified official release has a higher versionCode.
- Native update dialog "Later" is dismissible; "Update now" opens the external browser, not a WebView navigation or silent installation.
- Confirm signed APK in-place update, data-preservation, offline mode and native focus/reminders on a physical Android device before broad distribution.
