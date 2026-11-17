# Yawmi — Today Premium Redesign (isolated beta)

## Purpose / user decision

The previous `design/liquid-glass-full-app-beta` global CSS-only skin wasn't enough. The goal here is **real per-card experience and presentation improvements**, starting only with the Today screen, while retaining the exact original user data and behavior. This branch is based on `design/light-liquid-glass-beta` (the focus card design the user liked), **not** the rejected global-skin branch.

## Individual component redesigns

| Existing component | New treatment | Existing state preserved |
| --- | --- | --- |
| Greeting & daily date navigator | Editorial header and frosted date plate | Same date navigation, selected day and Hijri date |
| Quote/hero | Featured editorial quote with distinct gold accents | Same slider texts, dots, click behavior |
| Daily score | Large radial score dashboard | Same #scoreNum, #scoreSub, #scoreBonus, algorithm |
| Prayer | Five-step ritual timeline, inset quote and next-prayer highlight | Same #beads, statuses, countdown, details/settings and quote rotation |
| Habits | 2-column tactile selectable tiles | Same #habitChips, add, edit, completion and bad habits |
| Azkar | Distinct warm-toned capsules | Same #azkarChips actions/data |
| Dhikr | Ceremonial tasbih panel with original SVG and real count | Same gestures, count, target and menu controls |
| Quran wird | Large reading dial and tactile +/- | Same #wirdCount/#wirdTarget/step and persisted values |
| Deeds | Calm bonus card | Same #deedsList and conditional visibility |
| Challenges | Dedicated goal progress cards | Same #challengesList, create flow, goals and progress |
| Focus | **Unchanged acclaimed Focus card logic and live state** | Same FOCUS_KEY, notifications, presets and controls |
| Mood / Sleep / Learning / Journal | Distinct colored mini-headlines & expandable journals | Same IDs, inputs, collapse state and saving |
| Today's Tasks | Inset task rows & visible priority badges | Same #todayTasksList events and task data |
| Bottom navigation | Improved floating nav active indication | Same tabs, button dataset, navigation code |

## Guardrails

- Original Today card `data-cid` attributes, classes, drag handles, and ordering remain untouched; user drag-to-reorder stays supported.
- All existing form `id` attributes are preserved. New wrappers, captions and CSS are presentation-only, not a new source of truth.
- **No JavaScript state changes** in this branch (except the inherited Focus card base).
- **No Supabase schema, Auth, RLS, cloud sync, localStorage key, or data migration changes**.
- The production GitHub Pages `main` branch remains untouched. No merge or deployment.
- Only `styles/today-premium.css` is newly introduced; the style sheet follows the previously accepted Liquid Glass focus layer.
- Styles are scoped to `#tab-today`, except the shared floating navigation which is styled consistently with the Today screen.
- Both light (primary) and dark schemes, reduced transparency/motion and narrow screens handled.
- Browser tests guard 15 original card identifiers, functioning original controls, distinct component identities and tab navigation.

## Validation & distribution

Run `npm test`, `npm run test:e2e` (desktop and Android viewport), the Android emulator smoke, and the signed-ready beta APK workflow. A physical-device review is still needed before requesting a merge. New screenshots should be assessed for overflow, legibility, RTL, drag behavior, keyboard and restored data.

**Never uninstall an existing in.yawmi.app.beta install as a workaround**, as this may delete device-only data. Updates require identical signing certificate and a higher Android versionCode.

## Next stages

User approves visual result for Today first; then repeat component-by-component for Tasks, Notes, Expenses, Dashboard and Settings on separate reviewable branches. The previous rejected global skin is not a source for this work.
