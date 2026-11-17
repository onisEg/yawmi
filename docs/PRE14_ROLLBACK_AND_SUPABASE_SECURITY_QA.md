# Yawmi — Pre-PR14 Beta Rollback & Two-Account Security QA

**Date:** 2026-11-17  
**Status:** Rollback candidate prepared; production security remediation awaiting verified backup, staging and compatibility approval.  
**Source:** `design/today-premium-component-redesign` — previously distributed APK **0.3.1291**, BEFORE the PR #14 reference-preview styling.  
**Candidate:** `release/beta-pre14-stable-security-qa`.  
**Rejected design:** PR #14 `design/today-reference-production-ui` is left in Draft, NOT merged.  
**Public production:** `main` is untouched. Do not imply that `main` needs to be rolled back because PR #14 was never merged.

## A. What "go back" means

1. The new candidate retains the exact app code and storage model from the old pre-#14 **Today Premium** Beta, including the live Focus component and existing tasks, prayer, habits, notes, expenses and cloud sync.
2. It does **not** cherry-pick or apply the reference-preview layout, background artwork or extra visual order adjustments from PR #14.
3. This is a **new Android update build** (same `in.yawmi.app.beta` package and original signing certificate) with a new versionCode GREATER than APK 0.3.1331. Reinstalling the old 0.3.1291 package directly over 0.3.1331 will be rejected as a downgrade. Never uninstall; an uninstall can destroy device-only data.
4. The rollback does **not** revert a remote database migration; there has been no PR #14 database migration. Users should retain their Auth account, cloud snapshots and existing localStorage/IndexedDB data on an in-place signed update.
5. This is a **Beta rollback**, not a production `main` release. Keep all previous Draft PRs unmerged pending release decision.

## B. Confirmed production database risks — read-only audit

Project: `jtldivmllnzktnzgwtsm` (Free plan). Read-only policy/advisor inspection on 2026-11-17:

| Area | Observation | Priority |
| --- | --- | --- |
| `public.yawmi_data` | RLS enabled; SELECT, INSERT, UPDATE policies for `authenticated` require `auth.uid() = user_id` | Positive baseline (not a full two-user API test) |
| `public.yawmi_sync` | RLS enabled but policy `yawmi_sync_all` applies to `anon, authenticated` with `USING(true) WITH CHECK(true)` | **CRITICAL unresolved legacy exposure** |
| `public.rls_auto_enable()` | `SECURITY DEFINER` executable by `anon` and `authenticated`; current security advisors warn | **High priority** |
| Supabase Auth | Leaked password protection is disabled; advisor warning | Review settings |
| Supabase development branches | None available | Staging test cannot yet run |
| Backup | No verified encrypted DB export + restore rehearsal established here | **Blocker to production SQL work** |

**We did not read customer JSON data, create users/rows or modify production SQL, policies, grants or records.** The absence of current `yawmi_sync` usage in contemporary client code does not prove that no old published clients still use legacy sync.

## C. Two-account staging test — ready, NOT yet executed

Script: `scripts/qa-two-account-supabase.mjs`. It uses Node 22 and Supabase Auth plus PostgREST against a **separate disposable project**, authenticating TWO different pre-created QA-only test accounts:

1. Confirm two identities are different; refuse existing `yawmi_data` rows so no customer/previous data can be overwritten.
2. Account A inserts its own tagged fixture task/note snapshot. B inserts a different fixture.
3. Verify A can read only A; B only B.
4. Attempt a cross-owner PATCH from each account and verify owner records remain unmodified.
5. Log into A in a separate second session, read A, update a task, and verify A in the first session sees the update; B stays unaffected.

**Guardrails:** require `ALLOW_STAGING_QA_WRITE=YES_STAGING_ONLY`, an exact staging project HTTPS URL/ref, and dedicated staging credentials. The real production project ref is **hard-blocked before network access**. Refuse accounts with existing data. The test leaves only disposable fixture rows in staging.

### Usage (only after separate staging is provisioned)

```sh
# Set these secrets ONLY in a local environment or encrypted CI secrets.
export ALLOW_STAGING_QA_WRITE=YES_STAGING_ONLY
export SUPABASE_QA_PROJECT_REF='<staging-ref>'
export SUPABASE_QA_URL='https://<staging-ref>.supabase.co/'
export SUPABASE_QA_PUBLISHABLE_KEY='<staging-publishable-key>'
export SUPABASE_QA_USER_A_EMAIL='<qa-user-a-email>'
export SUPABASE_QA_USER_A_PASSWORD='<qa-user-a-password>'
export SUPABASE_QA_USER_B_EMAIL='<qa-user-b-email>'
export SUPABASE_QA_USER_B_PASSWORD='<qa-user-b-password>'
node scripts/qa-two-account-supabase.mjs
```

Never commit credentials, paste secrets in a PR, use existing user accounts, or point this runner at the production project.

**What this test does not cover:** actual Android app offline merge strategy, cross-device tombstone conflicts and notification permission handling. Existing local unit tests cover sync merging; after the staging API test, run two actual devices/browser profiles against QA-only auth and inspect ONLY test fixtures for offline→online recovery, sign-out/in, clean install and cross-user isolation.

### Why not executed now?

The connected Supabase project is on **Free** and has no development branch. Creating a managed branch requires a **cost confirmation**; the tool refused branch creation without one. The assistant must quote costs and obtain explicit approval before creating a billable resource. A separate staging project/branch also needs its own QA-only accounts. **Do not use production as a workaround.**

## D. Closing the legacy Supabase exposure safely

The reviewed, unexecuted migration is located at `docs/manual-sql/close-legacy-sync-after-backup.sql`, already present in the pre-#14 beta lineage. It would:

- Keep existing data in place; **no DROP TABLE / DELETE customer rows**.
- Drop the permissive `yawmi_sync_all` policy and revoke table privileges from `public`, `anon` and `authenticated`.
- Revoke API-role execute access to the `public.rls_auto_enable()` SECURITY DEFINER function.
- Leave the newer `yawmi_data` owner-scoped policies untouched.

**Do not apply to production yet.** Its permission revocations can disable any older published client still using sync codes even though no row data is deleted. Before execution:

1. Obtain **encrypted DB export** (schema and data) through trusted Supabase CLI/pg_dump, stored privately off-device, with a restore test on a disposable DB. Do not copy real user rows into chat or GitHub.
2. Inventory older versions and historic API usage of `yawmi_sync`. Explicitly decide whether legacy-code sync must be migrated first or blocked immediately as a security incident.
3. Create a **separate staging** project, seed ONLY fake data, test the migration and verify no access to legacy table from anonymous or authenticated clients.
4. Run the two-account test above and manual app cross-device test; verify `yawmi_data` still works normally.
5. Obtain user approval for disabling legacy sync; apply the reviewed SQL via Supabase migrations during a controlled window.
6. Verify `has_table_privilege('anon','public.yawmi_sync','SELECT')=false`, `authenticated=false`, no permissive legacy policies, advisory findings cleared. Retest current app sync. Track rollback SQL and restore possibility.

Possible **urgent privacy mitigation:** if the owner accepts that obsolete sync-code clients will fail, the revocations can be scheduled promptly *after a backup and compatibility decision*. Do not leave an unrestricted table exposed indefinitely.

## E. Release gate

| Gate | Required result |
| --- | --- |
| CI Node contracts, Playwright desktop/mobile, Android emulator + APK build | All green on **this branch HEAD** |
| APK identity/signing/version | `in.yawmi.app.beta`, same signing certificate, newer versionCode > 1331 |
| Update over currently installed PR14 Beta | Preserves local data; no uninstall or reset |
| QA staging Auth + two-account cross-read/write test | PASS on disposable project (currently pending) |
| Two-device offline resync and logout/login | PASS with disposable accounts (pending) |
| Production legacy exposure and SECURITY DEFINER | Corrected after backup and reviewed migration (pending) |
| Public `main` merge | **DO NOT DO** until independent release approval and risk review |

## Related

- `docs/SUPABASE_SECURITY_QA_2026-11-17.md`
- `docs/LEGACY_SUPABASE_LOCKDOWN_PLAYBOOK.md`
- `docs/manual-sql/close-legacy-sync-after-backup.sql`
- `docs/TODAY_REFERENCE_RELEASE_READINESS_2026-11-17.md` (in PR #14)
- `tests/two-account-qa-guard.test.mjs`

**No merge, deployment, customer-data mutation, production Supabase policy change or backup removal was performed by this rollback preparation.**
