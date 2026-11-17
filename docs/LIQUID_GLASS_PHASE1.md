# Yawmi Light Liquid Glass — Phase 1 (draft only)

## User-approved scope

- **Keep the full Yawmi information architecture:** same screens, sections, navigation, user records, settings, and Supabase sync formats.
- Make the **light theme** more premium with a non-destructive, trailing CSS override. Respect the user's existing theme choice and preserve the dark theme.
- **Only focus-card UI is upgraded functionally:** the Today card now exposes the existing focus timer's remaining time, chosen work/break preset, progress, phase, linked task and quick start/pause/resume. The popup remains the settings/control surface.
- This phase does **not** add bespoke sound files, change Android notification channels, rewrite the clock, or change app data persistence.

## Branch and dependency

- Branch: `feat/liquid-glass-light-focus-beta`.
- Base: `fix/focus-audible-completion-and-legacy-security-plan`, the draft auditory focus fix, **not** production `main`.
- Do not merge this PR directly into main before its base PRs, data safety work, platform QA and explicit release sign-off.
- No writes to Supabase, no SQL migrations, no localStorage key renames. Existing `yawmi_focus_runtime_v2` serialized shape is unchanged.

## Changes

1. `styles/liquid-glass.css` adds the skin **after** all existing styles. No default dark-theme override.
2. `index.html` keeps the same pages and existing focus overlay, but updates the internal Today focus card with accessible text, a timer, progress bar and quick action.
3. `renderFocusCard()` reads from the same `focusState` as `updateFocusUI()` and updates the card after each focus tick and control change. No second timer or state source.
4. `openFocus()` selects the saved work/rest preset in the existing popup. Closing the popup does not stop an active session.
5. `scripts/build-web.mjs` packages the new stylesheet for Capacitor, `sw.js` precaches it with a bumped cache name, and regression tests validate the contract.

## Manual acceptance checklist

- Check 360px/390px Android, large text, RTL order, light/dark mode, screen reader labels and reduced-motion setting.
- Open the focus popup; select 50/10. Close it, verify the Today focus card says 50/10 and 50:00.
- Start from the Today card, watch both mini timer and popup agree. Close popup, navigate tabs, lock device, reopen app. Timer must continue from the saved absolute deadline.
- Pause from Today card; the notification must be canceled and elapsed time preserved. Resume from popup and vice versa.
- Check finishing focus shifts to break-ready, ending break shifts to work-ready, and does not double-count sessions.
- Check task labels from different tasks are safe text and truncated rather than injected as HTML.
- Verify existing tasks, finance, notes, religious tracking, card sorting, export/import and cloud data merge are unaffected.
- Verify the Android app and offline PWA include `liquid-glass.css`; compare against production side-by-side in a disposable profile.
- Check low-end phones with transparency reduced or unsupported: readable fallback and no visual jank.
- Test native Android notifications and sign-in/sync with disposable accounts before any user-facing release.

## Known limitations / exclusions

- This is a **prototype branch**. Playwright runs do not prove physical-device appearance.
- Focus work/break values remain the three existing presets. Changing them in the popup currently resets the focus session, as it did before.
- User-selected light mode is not forced; dark theme keeps its existing tokens and gains only minimal focus-card layout support.
- The legacy insecure `yawmi_sync` policy is documented separately and **not modified**.
- The earlier generic HTML Liquid Glass prototype is not connected to this repository; this change reuses Yawmi's current state and UI.
