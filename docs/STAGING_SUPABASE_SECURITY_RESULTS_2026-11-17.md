# Yawmi — Supabase staging security test results

**Date:** 2026-11-17  
**Production Supabase ref (DO NOT use for QA writes):** `jtldivmllnzktnzgwtsm`  
**Isolated staging project:** `khlfscufeigvykxkwohk` (`yawmi-staging-security-qa`, `eu-west-2`)  
**Quoted cost:** $0/month for an additional project in the current organization.  
**Production release PR:** [#16](https://github.com/onisEg/yawmi/pull/16) — still **Draft**, NOT merged.

## Work performed in staging only

1. Created a separate Supabase project with no production user data copied.
2. Applied `supabase-auth-setup.sql` from the pre-PR14 release candidate to create `public.yawmi_data` with owner-scoped SELECT/INSERT/UPDATE RLS.
3. Created two synthetic, passwordless test identities **only in staging** and two fake `yawmi_data` rows with clearly marked `qa:true` data.
4. Executed PostgreSQL SQL sessions with `SET LOCAL ROLE authenticated` and distinct `request.jwt.claim.sub` values, verifying the real `auth.uid()`-based RLS policy.
5. Confirmed A's owner row is visible only to A; B's only to B. Cross-owner UPDATE affected zero rows in both directions. Anonymous `anon` role returned zero private rows.
6. Modified A's fake row in one authenticated SQL session and verified another simulated A session observed the update; B's row remained unchanged.
7. Created an intentionally permissive `yawmi_sync_all` legacy fixture with ONE **fake** row in staging, reproduced the anonymous visibility vulnerability, then applied the **exact prepared** `docs/manual-sql/close-legacy-sync-after-backup.sql` migration to staging.
8. Verified the legacy policy is gone; `anon` and `authenticated` have no SELECT/UPDATE access; the SECURITY DEFINER helper's direct EXECUTE grant is revoked; both `yawmi_data` rows and the one legacy fake row remained intact.
9. Used staging PostgreSQL's HTTP extension to make **real anonymous PostgREST GET requests** to `/rest/v1/yawmi_data` and `/rest/v1/yawmi_sync`: private user-data response was empty and legacy access was denied with HTTP 401/403.
10. Re-ran the staging security advisor. A no-policy INFO for `yawmi_sync` is expected because privileges have been revoked. A mutable search_path warning for staging `yawmi_touch` and leaked-password protection warning remain for separate hardening.

## Verified result summary

| Check | Result | Evidence type |
| --- | --- | --- |
| User A can SELECT own RLS row but not B | PASS | Real staging PostgreSQL impersonated role/claims |
| User B can SELECT own RLS row but not A | PASS | Real staging PostgreSQL impersonated role/claims |
| Cross-owner UPDATE denied both directions | PASS | Real staging PostgreSQL, zero affected rows |
| Anonymous SELECT on current user data denied | PASS | PostgreSQL + real anonymous PostgREST HTTP GET |
| Same owner in second simulated DB session sees update | PASS | PostgreSQL sessions |
| Old legacy policy demonstrably exposed fake data | PASS | PostgreSQL/anon on staging BEFORE lockdown |
| Exact prepared legacy lockdown blocks API access | PASS | Staging migration + grants + real anonymous PostgREST |
| Existing fake rows preserved by the lockdown | PASS | Staging row counts 2 current + 1 legacy before/after |
| **Real Supabase Auth JWT for two users** | **NOT TESTED** | Requires staging-only secret configuration |
| **Live Android/browser two-device offline sync** | **NOT TESTED** | Requires separate app/client QA |
| **Production legacy `yawmi_sync` lockdown** | **NOT APPLIED** | Await verified offsite backup and compatibility decision |

**Do not call role impersonation a two-user Supabase Auth integration test.** SQL impersonation tests `auth.uid()` RLS correctly but bypasses GoTrue login/JWT issuance; a separate real Auth E2E test is required.

## Real Auth E2E now prepared safely

[PR #18](https://github.com/onisEg/yawmi/pull/18) is merged into `main` and adds `scripts/qa-staging-auth-real-users.mjs` and the manual-only `.github/workflows/staging-two-account-auth.yml`. The workflow:
- Is hard-coded to the staging ref and URL and refuses all production references.
- Creates two temporary Auth users via **staging-only** admin credentials held in encrypted GitHub Environment Secrets.
- Signs in using ordinary Auth JWTs and validates cross-account SELECT/UPDATE denial, anonymous access, locked legacy table and cross-session propagation.
- Deletes only those two temporary users after QA.
- Does **not** auto-run the privileged test on pushes.

**Still needed:** A repository owner must enter two values from the **staging project only** into GitHub's `staging-qa` environment secrets: `YAWMI_STAGING_PUBLISHABLE_KEY` and `YAWMI_STAGING_SERVICE_ROLE_KEY` (the latter should be the staging legacy service-role key if required by Auth Admin). Do not send these in chat or commit them. Then manually dispatch the workflow on `main`.

See [staging Auth setup documentation](https://github.com/onisEg/yawmi/blob/main/docs/STAGING_TWO_ACCOUNT_REAL_AUTH.md).

## Production remains protected from unapproved changes

- **Completed production change:** migration `20261117162946_restrict_rls_auto_enable_api_execution_20261117` removed API-role EXECUTE grants on `rls_auto_enable()`; verified both `anon` and `authenticated` cannot call it, while the event trigger remains active. Corresponding Supabase security warnings cleared.
- **Completed GitHub-only change:** PR #17 merged into `main` to disable the unsafe historical `supabase-setup.sql` bootstrap. This is preventive and did not execute a database migration.
- **Unresolved critical finding:** production `public.yawmi_sync` still has a permissive `yawmi_sync_all` policy and ONE persisted legacy row. No production legacy-table permission change, table deletion or user-data migration has been performed.
- No verified **offsite encrypted production backup and restore rehearsal** has been demonstrated. That is a mandatory gate before legacy revoke / public release, along with older-client compatibility.
- PR #16 integrates many inherited features/commits relative to `main`; tests of the current beta lineage are not proof of safe rollout for all production users. Keep it in Draft until real staging Auth, real device update, offline sync and release candidate review pass.

## Required follow-up (no production data experiments)

1. Configure staging-only environment secrets in GitHub and run the **manual** real Auth E2E workflow; document full PASS/FAIL.
2. Verify encrypted database backup and restore (offsite, private; no customer data in chat), and assess old legacy sync-code client impact.
3. Test true app offline/reconnect, deletion tombstones, two devices, sign-out/sign-in on disposable test accounts.
4. Review remaining Supabase Auth leaked-password protection and apply separate hardening where supported.
5. **Only then** approve the final production lockdown and merge/release candidate. Never auto-merge #16 or run the legacy SQL on production solely because staging SQL-level tests passed.
