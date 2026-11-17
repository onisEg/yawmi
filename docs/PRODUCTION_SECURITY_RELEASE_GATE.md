# Yawmi pre-PR14 production integration — security release gate

**Review date:** 2026-11-17
**Candidate:** `release/pre14-main-security-candidate`
**Target:** `main`
**Approved visual baseline:** pre-PR14 Today Premium code, including PR #15 rollback/security QA preparation.
**Excluded:** PR #14 ("approved-reference concept" experiment) and other rejected full-app generic skin.
**Status:** **NOT APPROVED FOR PRODUCTION RELEASE** until this release gate is satisfied.

## Why the candidate cannot safely be merged directly

The pre-PR14 beta lineage is not a small styling patch on top of `main`. The latest comparison showed over 160 commits and numerous changes to the Android app, native bridge, app bootstrap, JavaScript modules, auth/synchronization, CSS, and test infrastructure. A successful `main` branch PR mergeability check only means Git can combine the trees; it does not prove deployed users' data will survive the release.

The production Yawmi web app already has real user data. No user-facing deployment, `main` merge, production database migration, or cross-account write test should be performed solely because unit tests are green.

## Current production Supabase security findings (read-only)

Project: `jtldivmllnzktnzgwtsm`, Free organization. At review:
- The public legacy table `public.yawmi_sync` has one persisted row; its RLS policy `yawmi_sync_all` applies to `anon` and `authenticated` with `USING(true)` and `WITH CHECK(true)`.
- Anonymous API-role SELECT and authenticated UPDATE privileges are granted. Treat legacy data as vulnerable until locked down.
- The current `public.yawmi_data` table has RLS enabled and owner checks `auth.uid()=user_id` for SELECT, INSERT and UPDATE. A test with a second real Auth account has NOT yet been performed against staging.
- `public.rls_auto_enable()` is a SECURITY DEFINER event-trigger function `ensure_rls`, but its EXECUTE permission is unnecessarily exposed to API roles. Do not drop the event trigger; revoke only API role EXECUTE after rehearsal.
- Supabase advisor flags leaked password protection disabled. Enable through Auth configuration after separate settings review.
- There is no Supabase development branch currently connected. A managed staging branch may incur extra charges.

**No customer JSON payloads were read or exported, and no production SQL grants, policies, data, migrations or schema were changed in the review.**

## What was implemented safely

The candidate adds an **ephemeral PostgreSQL 17 CI sandbox**:
- `security/staging/prelock_fixtures.sql`: fake user A and B records + an intentionally insecure legacy table and function.
- `security/staging/assert_before_lock.sql`: prove the old legacy policy exposes the fake row.
- `.github/workflows/security-rls-sandbox.yml`: run the migration in local CI PostgreSQL, never against production.
- `security/staging/assert_after_lock.sql`: assert old API access is denied, the existing user rows remain, Account A cannot read/write Account B, and Account A can still sync in a second simulated session.
- `docs/manual-sql/close-legacy-sync-after-backup.sql`: exact existing prepared lockdown used in the sandbox; this file **must not be executed in production** before the gates below.
- `scripts/qa-two-account-supabase.mjs` (in the approved beta lineage): staging-only real Supabase Auth/API test, hard-blocks the production project ID.

The sandbox gives **real PostgreSQL RLS evidence** with disposable identities, but is not a substitute for real Supabase Auth + PostgREST, offline mobile app sync, or an offsite database backup.

## Required before production Supabase permission change

1. [ ] Owner confirms staging organization and accepts any nonzero project/branch cost.
2. [ ] Obtain an **encrypted, offsite backup**, including legacy sync contents and `yawmi_data`, without pasting customer data or credentials into chat or GitHub.
3. [ ] Restore that backup onto a separate protected disposable environment and verify correct row counts/schema.
4. [ ] Inventory legacy sync-code clients. The current source uses `yawmi_data`, but older cached PWA versions / APKs could depend on `yawmi_sync`. Review version support and available API usage; a 24-hour log view does not establish lifetime inactivity.
5. [ ] Run the exact lockdown in staging; verify legacy `anon`/ `authenticated` API access denied and Auth-owned `yawmi_data` unaffected.
6. [ ] Run the **real two-account** Auth/PostgREST staging test (script above) and separate two-device/app offline re-sync, edits, deletes, and sign-in/out, without using existing customers.
7. [ ] Confirm rollback/recovery window and that disabling old sync-code clients is acceptable.
8. [ ] Apply a separately approved minimal production migration (no DROP TABLE or DELETE), then re-run Supabase security advisor and permission audits.

## Required before merging to `main`

1. [ ] Confirm exact source/target SHA and exclude PR #14.
2. [ ] GitHub Actions: Node contracts, Playwright on mobile/desktop, Android build + emulator, and disposable RLS sandbox **all pass on final candidate SHA**.
3. [ ] Verify screenshots, RTL/dark mode, long content, all six tabs, prayer, timer sounds, tasks, notes, expenses, Quran/Dhikr and user-configured card order.
4. [ ] Test *in-place signed APK update* on real device with prior data, without uninstall.
5. [ ] Run real staging two-account sync, first login, offline recovery and tombstone/conflict behavior.
6. [ ] Review deployment/config, PWA service-worker cache and rollback path (Android downgrades require higher versionCode).
7. [ ] Obtain and record approval of the actual PR to `main`. Merge only when verified production-safety conditions are satisfied.

## Safe failure conditions

If a staging project cannot be provisioned because billing/user approval is missing, **stop**. Do not use production identities/data as QA fixtures.

If a backup/restore test cannot be performed, **stop**. Do not revoke a live legacy client's access based on conjecture.

If production needs a security emergency shutdown, separately notify the app owner of likely legacy-sync disruption, preserve what is safe to back up, and schedule an approved controlled change.

## Useful references

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Database linter: anonymous SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Database linter: authenticated SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Supabase backups](https://supabase.com/docs/guides/platform/backups)
- [Supabase leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
