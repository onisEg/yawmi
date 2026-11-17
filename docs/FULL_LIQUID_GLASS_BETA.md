# Yawmi Liquid Glass — full application beta

Date: 17 November 2026  
Base: `design/light-liquid-glass-beta`  
Branch: `design/liquid-glass-full-app-beta`

## Explicit product decision

This is a **visual skin refresh only**. The order and positions of all six tabs, cards, user fields, task behavior, editable note colors, prayer controls, expenses and budgets, saved reports, analytics, habits, goals, and settings are unchanged. The existing live Focus card and its popup are inherited from the previous beta.

There is **no database schema, Supabase RLS, authentication, sync payload, storage key, user-data migration, or production deployment** change. Do not merge to `main` or publish until acceptance QA.

## Scope covered by `styles/liquid-glass.css`

- **Today:** existing hero, prayer/habit/mood and streak cards, daily navigation, journey summaries, focus card.
- **Tasks:** task rows, priorities, search, quick-add buttons, segments, projects, priority matrix. Red/amber/blue/green quadrant meanings remain distinct.
- **Notes:** list cards, selected custom colors, pinned states, edit sheet, note search.
- **Expenses:** expense and obligations rows, amounts and summaries, paid/late/coming-soon distinctions, charts and month navigation.
- **Dashboard:** stats, charts' containers, calendar cells, day details, review summaries.
- **Settings:** accordion groups, typography settings, forms, buttons and account surfaces.
- **Global components:** bottom navigation, modal sheets, dialogs, overlays, toasts and focus controls.
- **Themes:** Light Liquid Glass is primary. Dark receives a coordinated but subtle frosted visual treatment, with safe contrast and color-state semantics.
- **Accessibility:** visible keyboard focus, reduced transparency/motion, unsupported-backdrop fallback.

The surface system uses translucent backgrounds and soft shadows; expensive blur is restricted to large cards/sheets/navigation rather than every list item.

## Acceptance/rollback

Playwright screenshots and tab navigation checks cover the six tabs for desktop and Android-sized viewports. Emulator build/launch and native unsigned beta APK CI must also succeed. Test on a physical device before release, especially RAM/performance, keyboard, RTL, Android cutouts, dark mode, data restore, notifications and offline startup.

Rollback: revert this branch's `styles/liquid-glass.css` addition. Prior `design/light-liquid-glass-beta` retains the original Focus card treatment. **Never uninstall the Beta APK as a workaround for installation conflicts when it has local user data**.

This PR contains CSS, isolated QA/screenshots and CI branch enablement only.