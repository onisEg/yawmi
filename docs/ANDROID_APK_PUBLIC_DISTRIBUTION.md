# Yawmi — APK-only Android installation and update notices

## Current Yawmi v1.0 beta release (supersedes older 0.x release instructions)
- Latest signed beta targets Android package in.yawmi.app.beta; launcher: يومي;
  versionName: 1.0.<versionCode>, with strictly increasing versionCode.
- Pin checked-out source to reviewed main commit ca77952e8c5b7622933d5c3b88441f68b59d1329, containing
  the unified Liquid Glass styles and both native/web v1 update validation.
- The owner's three already-saved signing secrets are located under the GitHub
  environment named YAWMI_BETA_KEYSTORE_B64, not android-beta-release.
  The workflow uses that environment label and does not print or publish secrets.
- Official release format: android-beta-v1.0.<versionCode>, with downloadable
  Yawmi-Beta-v1.0.<versionCode>.apk plus SHA256SUMS.txt. The public APK is only
  available AFTER the manual signed-release action completes successfully.
- The verified permanent certificate SHA-256 and package ID stay unchanged
  for future v1 updates. Earlier APKs with a *different* signing certificate
  cannot update in-place; protect their local data before migration.

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
- Existing APKs without this new native bridge cannot acquire it merely by visiting the hosted web page. A NEW APK containing this feature must be built, signed with the new PERMANENT v0.4 key, tested on a real device, and published before native update prompts work. This signing key differs from earlier betas, so an older beta may need a one-time uninstall AFTER safely exporting/syncing its data.

## Release/signing requirements
1. At review time there were **no publicly published GitHub Releases**; do not advertise an APK until there is a real public asset.
2. Native package `in.yawmi.app.beta`, NEW permanent v0.4 certificate SHA-256 `1D57E58AB6B46ECCEBDF4AE4E7EE2DD61BCD2674BD6466AF74F267D66000001D` and strictly increasing `versionCode` are required for updating users in place from the first new signed release onwards.
3. The `publish-signed-android-beta.yml` workflow uses the **pinned reviewed APK-only main commit** `66c16c9f608dc8a430624d562658d0c3325989e5` with the native update checker. Every future build must intentionally re-pin an audited newer source commit. Never use a moving branch with signing secrets.
4. Publish a signed `.apk` plus `SHA256SUMS.txt` as the official latest GitHub Release with tag `android-beta-v0.4.VERSION_CODE` (or `android-beta-v0.3.VERSION_CODE`) and identically named asset `Yawmi-Beta-v0.4.VERSION_CODE.apk` (or `Yawmi-Beta-v0.3.VERSION_CODE.apk`).
5. Old betas signed with a DIFFERENT certificate cannot be updated over the new v0.4 baseline. If you used one, export local-only data or verify cloud sync before a one-time uninstall/reinstall. **From the first new v0.4 release onward, never uninstall to update:** always keep the new signing key and raise `versionCode`. Installed PWAs and APKs do not share the same local storage.
6. The update UX and publishing are distinct from production Supabase `yawmi_sync` RLS work. No database schema, policies, user rows, storage keys, auth or sync protocols changed here.

## Verification checklist
- Node contracts + Playwright browser/mobile + native Gradle compile pass on the final PR SHA.
- Android website offers only real APK downloads (and never the PWA prompt), including when offline / GitHub API returns 404/rate limits.
- New native Beta at versionCode 2000+ only shows an update when a verified official release has a higher versionCode.
- Native update dialog "Later" is dismissible; "Update now" opens the external browser, not a WebView navigation or silent installation.
- Confirm signed APK in-place update, data-preservation, offline mode and native focus/reminders on a physical Android device before broad distribution.

## Owner setup for NEW v0.4 release series
- Download the private PKCS12 signing key and private credential instructions from the current ChatGPT build artifacts; NEVER commit them to GitHub or publish them as a GitHub Release asset.
- Create GitHub Actions environment `android-beta-release` in repository Settings > Environments.
- Add exactly three **Environment secrets** from the private instructions: `YAWMI_BETA_KEYSTORE_B64`, `YAWMI_BETA_KEY_PASSWORD`, `YAWMI_BETA_KEY_ALIAS`. Save an offline backup of the .p12 key AND password; losing either prevents future in-place updates.
- Once CI for the workflow change is green and it is merged to main, use Actions > Publish verified signed Yawmi Android Beta > Run workflow > main.
- The workflow validates the certificate SHA-256, package ID, versionCode, runs app/data tests, then creates the official latest GitHub Release with APK + SHA256SUMS.txt. The site will only display an APK download when this Release actually exists.
