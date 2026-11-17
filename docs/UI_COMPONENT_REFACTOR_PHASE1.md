# Yawmi UI refactor — phase 1 (CSS, Notes, Tasks, Components)

## Scope of this PR

This is a *behavior-preserving* extraction of a few stable pieces from the ~10k-line inline HTML application. It is intentionally based on `feat/android-updatable-beta-channel`, not the production website's `main` branch.

### What is extracted

```text
styles/
  tokens.css       # design tokens, theme and safe-area variables
  layout.css       # reset, page shell, desktop responsive layout
  features.css     # existing feature-level selectors, preserved order
  components.css   # inputs, task-related and shared component selectors
  overlays.css     # bottom navigation, dialogs, onboarding and overlays

src/
  components/
    ui-cards.js    # accessible DOM building blocks for notes and empty task states
  features/
    focus/focus-clock.js   # existing pure deadline math
    tasks/task-model.js    # pure task grouping and manual/priority sorting
    notes/note-model.js    # pure note filtering, pinning and date ordering
  native/
    bridge.mjs     # existing Capacitor notification and system-bar bridge
```

**Important distinction:** task/note/browser components currently use classic scripts and stable `window.Yawmi*` namespaces to interoperate with the legacy inline app without introducing module-loading races or breaking offline clients. They are separated into files, but this is NOT yet a complete ESM/TypeScript conversion or full SOLID implementation.

### Behavior and data contract

- CSS rules copied byte-for-byte into **five ordered stylesheets**, preserving the original cascade. No intentional restyling in this PR.
- PWA Service Worker cache bumped to `yawmi-v188`; new CSS and scripts are precached so offline startup works after deployment.
- Android web asset staging copies the exact same CSS and classic browser scripts; native bridge remains separate.
- Original task and note `localStorage` keys, object fields, Supabase tables, existing sync/merge code and app installation ID unchanged.
- The renderers still own event handlers, state updates and persistence. The new model files only group/sort/filter records. DOM components use `textContent` for user notes, not raw HTML.
- No database changes, no `main` merge, no public release and no API key/keystore commits.

### Tests required before merge

1. `npm test`: existing focus, sync, backup and safety regressions **plus** new task/note model and DOM component tests.
2. Native `assembleDebug` and signed/unsigned beta build must include all CSS/JS assets.
3. Emulator smoke test must install, launch and relaunch app with nonblank screenshot and no WebView syntax errors.
4. **Still required before production:** browser visual side-by-side QA at desktop/mobile widths, tasks/notes create/edit/delete interaction checks, offline reload and real-device Android regression, using disposable test data.
5. Check merge dependency: this PR requires Android beta + prior feature branches and cannot safely be merged directly to `main` without staging the prerequisites.

### Next bite-sized phases

- **Phase 2 — task UI components:** extract interactive task-row DOM and recurring-task display into a `TaskListView` component, keeping callbacks injected and state updates in the feature service.
- **Phase 3 — note editor components:** split note-card grid, palette and editor with a testable controller; preserve existing storage keys and note format.
- **Phase 4 — storage + sync adapters:** add interfaces for storage and Supabase sync, fixture-driven integration tests and verified backups; do not mutate production until reviewed.
- **Phase 5 — design polish:** after DOM structure is stable, improve responsive layout, text sizing and accessibility without mixing restyling with data migrations.

The rule for each phase: small commit, automated regression, web/Android smoke check, draft PR, optional same-certificate signed beta APK, then manual user acceptance before merge.
