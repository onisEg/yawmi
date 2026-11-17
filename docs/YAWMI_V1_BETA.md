# Yawmi v1.0 beta — unified appearance, unchanged user data

Source pinned for signed v1 release: ca77952e8c5b7622933d5c3b88441f68b59d1329.
Signing workflow uses the existing GitHub environment named YAWMI_BETA_KEYSTORE_B64, which contains the three credentials (not committed to code).

This milestone unifies the Liquid Glass visual language across the existing
Today, Tasks, Expenses, Notes, Dashboard and Settings tabs. It preserves all
existing card IDs, layouts, app features, timers, saved data, Supabase schemas,
synchronization contracts, and PWA/offline support.

The Android build should be named **يومي** with versionName **1.0.<versionCode>**.
The Android package **in.yawmi.app.beta** must remain stable across future beta
updates, with increasing versionCodes and the SAME original signing certificate
SHA-256 1D57E58AB6B46ECCEBDF4AE4E7EE2DD61BCD2674BD6466AF74F267D66000001D
for all subsequent v1 releases.

Important: another APK signed with an older/different certificate CANNOT be
upgraded in-place even if its Android package is identical. Back up or verify
cloud sync before any migration; do not tell users to uninstall casually.
A live signed APK is not available merely because CI tests are green.
Only publish a genuine signed APK asset after the release pipeline succeeds.
