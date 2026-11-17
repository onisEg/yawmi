# Yawmi — public Android APK distribution

## Browser experience (already merged in PR #19)

Visitors using Android browsers see the installation offer even when `beforeinstallprompt` is unavailable. The existing PWA install option remains.

The **Download APK** button is intentionally hidden until the official repository's **latest published, non-draft, non-prerelease GitHub Release** has an uploaded `.apk` asset. The link points only to `https://github.com/onisEg/yawmi/releases/download/.../*.apk`. An offline browser, unavailable GitHub API, or missing release still offers PWA installation — never a fake APK URL.

Users opening the site from iOS see PWA installation guidance, **not** an Android APK. Installed PWA / native Android applications are not shown an unnecessary promo. Users can dismiss the install offer. The browser PWA and the Android native application have different local data stores: sign into the same Yawmi account and verify sync before uninstalling or switching devices.

## Publish a real, signed APK

The manual workflow `.github/workflows/publish-signed-android-beta.yml` is deliberately **not automatic**. It is dispatched from `main` but checks out the **pinned, previously tested pre-PR14 native commit** `526909193b4696ecd142d385a9bde7f66b9496e9`. This deliberately avoids trying to build the current website-only `main` as an Android project, and does not merge Draft PR #16. It signs with the original private Yawmi Beta key, verifies the certificate and package ID `in.yawmi.app.beta`, then publishes the signed APK and `SHA256SUMS.txt` in an official public GitHub Release.

### Owner setup (one time; never paste secrets into chat)

1. The workflow signs the exact pinned pre-PR14 Android source commit. Confirm this is still the desired stable beta before publishing. **Do not merge Draft PR #16 merely to publish an APK**; the beta release can be independent from a future production web merge. Update the pinned source commit only through a separately tested and reviewed PR.
2. Go to the repository's **Settings → Environments** and create `android-beta-release`. Prefer **required reviewers** so the release cannot happen accidentally.
3. Add these encrypted **environment secrets**:
   - `YAWMI_BETA_KEYSTORE_B64`: the original private PKCS#12 Beta keystore, base64 encoded. Store only in GitHub encrypted secrets, never in repository files, PRs, logs, or chats.
   - `YAWMI_BETA_KEY_PASSWORD`: private password.
   - `YAWMI_BETA_KEY_ALIAS`: alias of the original Yawmi Beta key.
4. Ensure the original Beta signing certificate SHA-256 is the pinned value in the workflow. The expected certificate is `730a84f331a2178819358a8a7e97baa4004c410898717adbe976489c172901d8` (verified from previously signed Beta APK). **Do not relax this check**, or an incompatible update may strand users with local data.
5. Go to **Actions → Publish verified signed Yawmi Android Beta → Run workflow** and select the `main` branch.
6. Confirm the workflow completed successfully and that the resulting **GitHub Release** contains a `.apk` and `SHA256SUMS.txt`. The Android mobile website detects it automatically as the official latest release.

### Critical safeguards

- The signed APK is a **Beta**: same `in.yawmi.app.beta` package and certificate as previously delivered test APKs. It is not a Google Play release.
- The workflow sets an Android `versionCode` greater than the previously distributed `1391` to permit in-place updates.
- **Never uninstall** an existing Beta merely to install a new APK. Back up/export any local-only data and ensure cloud sync works first.
- The workflow signs only in an ephemeral GitHub runner; private key material is deleted when the job ends. The keystore is never uploaded as a release artifact.
- No source files include real signing secrets. If an expected secret is missing or the certificate does not match, the workflow fails and publishes nothing.
- The page treats a GitHub Release asset as official distribution, not cryptographic proof. The signed release pipeline is the security boundary; consumers can independently compare `SHA256SUMS.txt`.

## Current release blockers

As of 2026-11-17:
- The website's browser install UX has been merged separately and tested.
- The repository had **no publicly published GitHub Releases** when the UX was reviewed. The actual APK download option will stay hidden until a verified release exists.
- The pre-PR14 native app is still part of Draft [PR #16](https://github.com/onisEg/yawmi/pull/16), **not `main`**. The signed beta workflow instead builds the pinned pre-PR14 native commit. Real Supabase Auth two-account E2E and in-place device upgrade remain separate release acceptance tests.
- Production `yawmi_sync` legacy RLS remains permissive; a staged fix exists but the live change must wait for a verified backup and old-client compatibility decision. Publishing an APK is **not** permission to change database policies.

**Do not represent the APK as downloadable until the official release asset actually exists.**
