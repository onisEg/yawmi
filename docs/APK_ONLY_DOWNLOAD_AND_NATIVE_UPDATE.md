# Yawmi — APK-only website download and consent-based Android updates

## Website

- Keep the existing service worker, cached assets and web manifest for offline access and for existing PWA users. Do not unregister or clear storage.
- No in-app PWA installation UI or Chrome install prompts. Android installation actions are APK-only.
- Only an authentic published GitHub Release APK is surfaced. No public release means no install banner, and the Settings button explains unavailability without falling back to PWA.
- Browser-managed install options may still exist because the web manifest remains.

## Native Android update prompt

- New YawmiAppInfo native plugin reports the actual installed package name, version code and version name.
- Compare the version code with the latest official GitHub Release, using matching Android beta tag and APK filename (e.g., android-beta-v0.4.2055 with Yawmi-Beta-v0.4.2055.apk).
- Check on startup/foreground at most once per six hours; show optional Update now / Later UI only for a genuinely newer beta package.
- Update now opens the verified APK asset in an external browser for Android's user-approved installer. No silent installs or data changes.

## Release gates — required for actual distribution

1. A signed APK must be publicly uploaded as an official GitHub Release. At implementation time, this repository still had zero public releases.
2. Existing signed-publisher workflow pins older native source commit 526909193b4696ecd142d385a9bde7f66b9496e9. It does NOT include this updater. After QA and merge, independently audit and re-pin to an exact approved new main SHA before publishing a new APK. Never sign arbitrary moving branches.
3. The signed APK package must remain in.yawmi.app.beta and use the same original signing certificate SHA256 730a84f331a2178819358a8a7e97baa4004c410898717adbe976489c172901d8, with an increased versionCode matching the release filename. Never ask users to uninstall.
4. Verify actual in-place update on a real phone with local-only and cloud-synced data. Old APKs cannot automatically gain a new native updater: users first need one manual signed update containing this feature.
5. No Supabase schema, policies, or storage keys are changed here. Backend security release gates remain separate.