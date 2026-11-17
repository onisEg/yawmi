# Yawmi — Today Reference UI: Documentation & Merge Readiness

**Review date:** 2026-11-17  
**Repository:** `onisEg/yawmi`  
**Feature branch:** `design/today-reference-production-ui`  
**Pull request:** [#14](https://github.com/onisEg/yawmi/pull/14) (Draft)  
**PR target:** `design/light-liquid-glass-beta` (**NOT** `main`)  
**Reviewed implementation SHA:** `802349d66588b00147303c70b0ffe9f01d15c201`  
**Review conclusion:** **GO for continued isolated beta QA; NO-GO for production `main` merge/release until blockers resolved.**

> This is a point-in-time review, not blanket approval. If the code or PR base changes, rerun CI, review the diff again, and record the resulting SHA. Adding this document itself creates a new commit, so final CI should be checked on the updated head.

## 1. Product scope & design provenance

The user approved an independent interactive concept for the **Today** tab, then requested its implementation against **real Yawmi data** with no lost features. The chosen concept is an editorial cream / teal / soft gold mobile layout, not the previously rejected "add glass to everything" styling attempt.

Implemented appearance:
- Today header, personalized greeting, Gregorian / Hijri date navigator.
- Inspiration quote and original carousel.
- Side-by-side daily score and five-prayer tracking.
- Prominent live Focus card, backed by the existing timer state and notifications.
- Compact habit tiles and Azkar chips, with actual stored completion.
- Mood, diary, Quran reading tracker, Today's Tasks.
- Original Dhikr/tasbih, challenges, sleep, learning and other sections remain accessible below the primary concept-inspired area.
- Global navigation styling adjusted; **the original six routes/tabs still exist**.

**This is not an exact pixel clone of the generated reference.** The real application has variable-length user content, accessibility requirements, prayer statuses and changing data. Visual fidelity requires testing real datasets and mobile screens.

## 2. Changed files and architecture

PR #14 adds approximately 15 commits / 11 changed files relative to its design-only parent.

| File | Purpose | Release impact |
| --- | --- | --- |
| `styles/today-reference.css` | Screen composition and visuals, with embedded offline illustration assets | Most visual impact. Some rules intentionally target **global** `body`, `header.top`, and `nav.bottom`; review all tabs |
| `index.html` | Presentation classes/markup, derived prayer & Azkar summary values, default layout order | Maintains legacy IDs and data records; review DOM assumptions, user-custom ordering, narrow-screen accessibility |
| `scripts/build-web.mjs` | Include new stylesheet in Capacitor staging | Must match actual web asset references |
| `sw.js` | Precache design stylesheet, bump beta cache name | Verify upgrade and offline fallback; no re-registration in native WebView |
| `tests/e2e/tasks-notes.spec.mjs` | Screen, timer, card IDs/order, existing task and note flows | CI coverage, not substitute for cross-account or hardware QA |
| `tests/ui-modules.test.mjs`, `tests/focus-clock-contract.test.mjs` | CSS and PWA packaging contract updates | Correct offline/native bundle |
| `.github/workflows/{playwright-e2e,android-emulator-smoke,android-beta-unsigned}.yml` | Enable CI on isolated branch | Beta-only build; not production deployment |
| `docs/TODAY_REFERENCE_IMPLEMENTATION_BETA.md` | Functional description and safety constraints | Existing implementation notes |

Design-specific data flow:
- Current day values: `getDay(viewDate)` → `renderToday()` → existing live DOM IDs and derivative summaries `#prayerDoneCount`, `#azkarDoneCount`.
- Prayer: current `rec.p` and prayer picker; real prayer time/status and `#prayerTimer` remain. Optional compact details drawer retains alerts; urgent alert opens the drawer.
- Habits/Azkar: `settings.habits`, `settings.azkar`, day record `rec.h` / `rec.z`; original `renderChipList()` and persistence continue.
- Focus: existing `focusState`, `yawmi_focus_runtime_v2`, `startFocus()`, `pauseFocus()`, notification integration — **no second clock**.
- Quran: `rec.qw` and existing user target; original increment/decrement.
- Tasks: original `tasks` collection and `renderTodayTasks()` (no fake task list).
- Card position: existing `yawmi_cards_order` preference is preserved; when absent a new preview-inspired default order applies. Customized orders can yield a different look than the reference.

**No new Supabase schema, SQL migration, localStorage data schema, cloud sync payload or data rewrite is introduced specifically by PR #14.** No live production database operation was performed during implementation.

## 3. Evidence and CI results (implementation SHA above)

| Check | Result | Evidence |
| --- | --- | --- |
| Node contracts and data-sync safety tests | **PASS: 46 tests** | [Browser/contract workflow](https://github.com/onisEg/yawmi/actions/runs/44110864465) |
| Browser E2E — desktop + Android viewport | **PASS: 10 tests** | [Playwright workflow](https://github.com/onisEg/yawmi/actions/runs/44110864465) |
| Android unsigned/staged beta build | **PASS** | [Android beta workflow](https://github.com/onisEg/yawmi/actions/runs/44110864347) |
| Android emulator install / app launch | **PASS** | [Emulator workflow](https://github.com/onisEg/yawmi/actions/runs/44110864328) |
| GitHub PR mergeability into design parent | **PASS technically** (mergeable / clean at review time) | [PR #14](https://github.com/onisEg/yawmi/pull/14) |
| Real device acceptance across multiple Android OEMs | **NOT COMPLETED** | User tried beta; feedback was "reasonably good", not final release sign-off |
| Real two-user Supabase staging integration | **NOT COMPLETED** | Required before production promotion |
| Production backups + verified restore rehearsal | **NOT CONFIRMED** | Required before any risky data/security rollout |
| Long-term offline/cache upgrade and synchronization testing | **PARTIAL / manual pending** | Contract tests cover algorithms, not end-to-end production upgrade |

CI test data are local/disposable and do not authenticate to real Supabase. Emulated Android startup does not validate real notification delivery under all OS battery policies.

## 4. Crucial difference: feature PR vs `main`

1. PR #14 targets `design/light-liquid-glass-beta`; it does **not** directly target production `main`.
2. That parent itself is **Draft PR #11**, based on another feature branch (which itself depends on **Draft PR #9** and earlier unreleased work). PRs #9, #11, #12, #13 and #14 are separate pending branches; #12/#13 are alternatives, **not** prerequisites for the approved reference UI.
3. At this audit, `main...design/today-reference-production-ui` is **158 commits ahead**, 0 behind, with many added Android, build, TypeScript, testing, Focus and sync changes, plus a difference in the checked-in `supabase-setup.sql` file. This is **not a small CSS-only production merge**. The SQL file is not altered in PR #14 against its beta parent, and merely merging a SQL file does not execute it; it still requires separate security review.
4. Promoting this entire branch to `main` without a staged integration plan would couple the UI redesign to unrelated, unapproved architectural changes.

**Merge decision:**
- **Into the experimental design parent:** technically possible after current design/mobile acceptance and CI on final SHA; remains experimental and is not a public release.
- **Directly into `main`: NO-GO.** First isolate intended commits or prepare a new integration/release branch based on the latest `main`; review every dependency and run the complete regression and security gate. Do not rebase blindly or change PR base without reviewing the entire diff.

## 5. Production blocker: pre-existing legacy sync security finding

Existing read-only security QA documented the following **critical production finding**:
- Legacy `public.yawmi_sync` RLS policy `yawmi_sync_all` allows `anon` / `authenticated` access with `USING (true) WITH CHECK (true)`; a row was visible in an anonymous-role read test.
- The newer `public.yawmi_data` has `auth.uid() = user_id` policies and passed static / simulated-role checks, **but no completed two-account staging API test**.
- Review `docs/SUPABASE_SECURITY_QA_2026-11-17.md` and `docs/LEGACY_SUPABASE_LOCKDOWN_PLAYBOOK.md`.

**This vulnerability predates the Today design and PR #14 doesn't create it.** It should be addressed as a separate prioritized security task **before claiming a secure public release**. No production SQL should run solely because the UI is ready.

Safe remediation sequence: encrypted backup → restore test in a separate environment → old-client usage inventory → test legacy policy lockdown in staging → two-account API/sync tests → approved production maintenance and post-change verification.

## 6. Other release blockers and recommended acceptance tests

### Must finish before a production release

- [ ] **Visual acceptance:** user explicitly approves final real-app Today layout, beyond "good to some extent", on the intended Android handset.
- [ ] **RTL, responsive and overflow:** test small and large devices, dynamic content, long habit names, changing score and focus states, long prayer messages, touch target sizes and 200% text scaling.
- [ ] **Light & dark:** test actual dark-mode colors and contrast. Several design rules use hard-coded cream/dark inks; verify child elements, forms and disabled / error states in dark mode.
- [ ] **Global CSS regression:** new stylesheet styles `body`, global header and bottom navigation; verify all other tabs and dialogs still work and are legible. Prefer scoping unrelated rules if needed.
- [ ] **Real-world function pass:** prayer picker / countdown / urgent alert drawer; 5 prayers; habits + bad-habit control; Azkar; Dhikr gestures; Quran target; live Focus pause/resume and distinct completion sounds; edit Notes; tasks; expenses; export/import.
- [ ] **Real device beta update:** install signed APK **over** the previous Beta with the same package ID and certificate; ensure the versionCode is higher. Do not uninstall, reset app data or assume a debug emulator install proves upgrade data retention.
- [ ] **Data integrity & cross-device QA:** on a disposable staging project with two test users, verify account separation, first login without overwriting cloud records, offline edit/reconnect, stale deletion tombstones, restore/backup and sign-out/sign-in.
- [ ] **Offline/PWA upgrade:** first-run online, cached update, restart offline, old cache invalidation and no blank screen on lost network.
- [ ] **Security remediation:** resolve/contain the legacy Supabase exposure separately; rerun privilege and policy tests.
- [ ] **Production integration:** make and review a clean `main`-based release PR with ONLY approved changes (and necessary dependencies), then CI/manual regression on that actual release SHA.

### Useful, not blocking a small closed beta

- [ ] Visual regression screenshots and representative real data fixtures for empty/populated states.
- [ ] Accessibility audit of RTL heading order, screen reader labels, keyboard focus and reduced motion/transparency.
- [ ] Android battery/performance/blur profiling on low-end devices and OEM battery restriction test.
- [ ] Release notes, user-facing change notice, rollback owner and staged rollout cohort.

## 7. Safe release process (when approved)

1. **Freeze and review** branch SHA and design sign-off, especially mobile screenshots and empty/full card states.
2. **Prepare a separate release branch based on the current `main`**. Audit or cherry-pick only approved features; handle prerequisites and conflicts explicitly.
3. **Keep Supabase read-only during the UI merge.** Work on the legacy security issue using a separate approved staging/backup procedure.
4. **Test the actual release candidate**: full Node/browser suite, Android emulator and real installed update; two staging accounts and offline synchronization.
5. **Prepare rollback**: repository release/tag, previous signed native version available, verified data backup, reversion commit or forward hotfix and a deliberate PWA cache bump. Android downgrade might be blocked; have a higher versionCode rollback build ready.
6. **Obtain explicit user authorization** before merging/deploying to `main` or making any production DB changes. Confirm the target (beta parent vs public production) to avoid accidental release.
7. **Monitor after rollout**: crash, sync errors, missing data reports, notification failures and layout regressions; halt or revert if needed.

### Final gate

- `design/today-reference-production-ui` → `design/light-liquid-glass-beta`: **CONDITIONALLY ACCEPTABLE**, beta only, after remaining manual QA.
- `design/today-reference-production-ui` → `main`: **NOT READY** as a direct merge.
- **No actual merge or deployment was done during this documentation/review.**
