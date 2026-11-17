# Yawmi Android Beta — safe repeatable APK updates

**Do not install unsigned APK artifacts.** The manual GitHub Actions publisher builds, signs and verifies the APK with a NEW permanent private v0.4 key. Never commit or share the keystore. Starting a fresh beta signing identity means older APKs signed with another key will not accept a same-ID in-place update.

## Stable beta identity and version

- Android application ID: `in.yawmi.app.beta` (fixed across all beta updates).
- Android display name: `يومي Beta`.
- Version code: `2000 + github.run_number` (strictly increases for fresh workflow runs; keep the same signing certificate for every later release).
- All future beta APKs **must** be signed with the exact same keystore/certificate.
- Expected public beta signing certificate **SHA-256** fingerprint: `1D57E58AB6B46ECCEBDF4AE4E7EE2DD61BCD2674BD6466AF74F267D66000001D`. Compare with `apksigner verify --print-certs`; if it differs, **do not install an update**.
- Keystore stored securely outside the repository; `.gitignore` excludes `*.jks`, `*.keystore`, `*.apk`, and `*.aab`.

## First install versus updates

Android compares the app ID and signing certificate, and checks that the new version code isn't lower than the installed version. Only matching app ID + certificate + higher version code supports replacing an installed APK without deleting its private app data.

Existing Android APKs signed with an older certificate, including previous `in.yawmi.app.beta` experiments, **cannot** be updated in place with this newly signed v0.4 baseline. If installed, back up/export local-only data or verify Supabase sync first, then migrate once. Older APKs with different package IDs may install alongside the new beta, but each Android app ID has separate local storage. All future v0.4 releases should be compatible in-place with this first new signed release.

## Future build and sign

1. GitHub Actions `Publish verified signed Yawmi Android Beta` (manual run on main) checks out the reviewed pinned source, runs tests and builds `app-release-unsigned.apk` with stable beta application ID and increasing version code.
2. Use the new permanent v0.4 PKCS12 keystore from its secure offline backup. Generate this key ONLY ONCE; never rotate it per release.
3. Store `YAWMI_BETA_KEYSTORE_B64`, `YAWMI_BETA_KEY_PASSWORD`, `YAWMI_BETA_KEY_ALIAS` in the private GitHub Actions `android-beta-release` environment. The publisher uses Android SDK `apksigner` and verifies the expected certificate SHA-256. Never put passwords in logs, source, issues or pull requests.
4. Verify the signed APK certificate SHA-256 fingerprint matches the previous beta, confirm the new versionCode is higher, then install over the beta.
5. Use a test device for background notifications, focus countdown, cutout/safe area, offline sync, and app restart before distribution.
6. After merging the safely pinned workflow to main, run the manual action; it publishes a public latest GitHub Release containing only the signed APK and SHA256SUMS.txt. **Never publicly upload the private key or commit it to the repo.**

## Release / security distinction

The beta key should not be the eventual Google Play signing key. Google Play App Signing handles production signing separately. The beta is for app testing, **not production**, until authentication, native notification delivery, restore/migration, Supabase RLS review, account deletion, and physical Android compatibility are verified.

## Public update policy

- Every meaningful feature milestone gets a test APK artifact and a changelog.
- User data is never wiped, silently migrated or re-initialized just to resolve installation conflicts.
- If signing key is lost, same-ID in-place updates cannot be generated reliably. Backup the key and password securely.
- The reviewed pinned source lives on main, and publishing is strictly manual. Updating the site/install button does not erase any data. Future release builds must pin new tested SHAs explicitly.
