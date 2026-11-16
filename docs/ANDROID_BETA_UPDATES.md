# Yawmi Android Beta — safe repeatable APK updates

**Do not install unsigned APK artifacts.** The GitHub Actions workflow builds an unsigned APK and makes it available for signing with an existing, private keystore. The key must NEVER be committed to GitHub.

## Stable beta identity and version

- Android application ID: `in.yawmi.app.beta` (fixed across all beta updates).
- Android display name: `يومي Beta`.
- Version code: `1000 + github.run_number * 10 + github.run_attempt` (rises for each build).
- All future beta APKs **must** be signed with the exact same keystore/certificate.
- Keystore stored securely outside the repository; `.gitignore` excludes `*.jks`, `*.keystore`, `*.apk`, and `*.aab`.

## First install versus updates

Android compares the app ID and signing certificate, and checks that the new version code isn't lower than the installed version. Only matching app ID + certificate + higher version code supports replacing an installed APK without deleting its private app data.

Previous CI-built `in.yawmi.app`, `in.yawmi.app.preview` and `in.yawmi.app.qa` debug apps used ephemeral signing keys and CANNOT be assumed to accept an in-place upgrade. A beta with the new ID installs **alongside** them. No automatic localStorage migration exists across different app IDs. Users should keep the old app intact, back up their data using the built-in export or verify Supabase account sync, and only retire the old app when confirmed.

## Future build and sign

1. GitHub Actions `Android updatable beta - unsigned build` runs tests and compiles `app-release-unsigned.apk` with the stable beta application ID and increasing version code.
2. Obtain the original *private* beta keystore from the secure backup — do not generate a fresh key for each update.
3. Sign the unsigned APK using `scripts/sign-beta.sh`, Android SDK `apksigner.jar`, and environment-only secrets; never type passwords in shell history or put them into GitHub source or logs.
4. Verify the signed APK certificate SHA-256 fingerprint matches the previous beta, confirm the new versionCode is higher, then install over the beta.
5. Use a test device for background notifications, focus countdown, cutout/safe area, offline sync, and app restart before distribution.
6. Optionally connect GitHub Actions encrypted repository secrets for unattended signing once the owner explicitly configures a dedicated beta key. **Do not publicly upload a private key or commit it to the repo.**

## Release / security distinction

The beta key should not be the eventual Google Play signing key. Google Play App Signing handles production signing separately. The beta is for app testing, **not production**, until authentication, native notification delivery, restore/migration, Supabase RLS review, account deletion, and physical Android compatibility are verified.

## Public update policy

- Every meaningful feature milestone gets a test APK artifact and a changelog.
- User data is never wiped, silently migrated or re-initialized just to resolve installation conflicts.
- If signing key is lost, same-ID in-place updates cannot be generated reliably. Backup the key and password securely.
- Tests and the stable beta pipeline live on isolated GitHub branches; production `main` is unaffected.
