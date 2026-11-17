# Yawmi Today — approved HTML reference converted to real UI

## Visual decision and base

The user approved the standalone `yawmi-today-concept-preview.html` reference, whose warm cream/teal/gold layout includes a mosque illustration, quote strip, side-by-side prayer + score, prominent workspace Focus, habits + Azkar, compact Quran + mood + diary, and today's tasks.

**This branch starts from `design/light-liquid-glass-beta`**, the accepted live Focus card base, *not* the rejected generic all-app skin or the earlier alternative Today premium design.

## Implementation

- Added `styles/today-reference.css`, reproducing the reference's warm cream surfaces, decorative images and compact dashboard layout, while retaining actual accessible Yawmi components.
- Kept all existing `data-cid`, input/button IDs and interaction handlers; no demo task data or fake timer injected.
- Prayer and Azkar counts are *derived at render time* from the existing day record; actual prayer picker, dhikr gestures, habit completion and daily task logic remain.
- Preserved the live Focus clock and its local notification behavior, without creating a second timer.
- For new installs only, set the preview's visual Today card sequence; existing user reorder preference `yawmi_cards_order` continues to work, even if it lists only some cards.
- Added the stylesheet to the staging build and offline SW asset cache.
- Artwork from the approved prototype is embedded as offline CSS data-URIs; no extra network image requests or external trackers.
- Retained every Today capability not visible in the reference (Dhikr, Challenges, sleep and learning, bad habits, details dialogs). These appear below the main preview-inspired area, rather than being removed.
- Maintained the six original tabs, personalized values, RTL, and existing light/dark theme toggle.

## No data / production change

No schema, Supabase credentials, SQL, RLS, cloud record, task/habit key, migration or Auth changes. No `main` merge, production site deployment or modification to production user data. The app remains a beta on `in.yawmi.app.beta`.

## Verification and release

- `npm test` (including legacy data contract and service worker checks)
- Playwright desktop and Android viewport: existing tasks/notes/focus, original 15 Today cards, real clock state, original tab nav, customized saved card order.
- Android emulator smoke and unsigned release build via GitHub Actions.
- Signed beta APK must use **exact original beta signing keystore** and monotonic versionCode, then verify SHA-256 certificate. Never uninstall the old beta if it has offline-only data.

## Manual acceptance

Check on real device: Today header & art, default card order after an existing install (may differ if user customized it), score/prayer/live state, dark mode, saved order, prayer picker, focus notifications, tabs, smooth scroll and safe-area keyboard behavior.

Do not release to production until design and functionality approved.
