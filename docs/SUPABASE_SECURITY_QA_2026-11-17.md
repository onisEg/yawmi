# Yawmi security and synchronization QA (17 Nov 2026)

## What was actually checked — **read only**

The connected production Supabase project was inspected using read-only SQL with impersonated database roles. No user JSON payloads were read, no test rows/users were inserted and no production policies/schema were changed.

| Test | Result |
|---|---|
| `public.yawmi_data` has row-level security enabled | PASS |
| `yawmi_data`: anonymous role SELECT row count | **0** (PASS) |
| `yawmi_data`: authenticated role with a non-owner test UUID SELECT row count | **0** (PASS; not a full two-user API test) |
| `yawmi_data`: existing SELECT, INSERT and UPDATE policies check `auth.uid() = user_id` | PASS, static/policy-level |
| `public.yawmi_sync` anon SELECT row count | **1** (CRITICAL FAILURE: row exposed) |
| `yawmi_sync` policy `yawmi_sync_all`: `anon,authenticated`, `FOR ALL`, `USING(true) WITH CHECK(true)` | **CRITICAL FAILURE** |
| Legacy table has a user ownership `user_id` field | NO |
| Supabase security advisor flags `public.rls_auto_enable()` SECURITY DEFINER callable by anon/auth | WARN |
| Supabase leaked-password protection | WARN, currently disabled |

**IMPORTANT:** A zero row count for simulated non-owner auth does not replace real tests with two distinct authorized accounts. Those tests need a dedicated disposable Supabase staging project and a controlled test data set. Never perform cross-user write tests against actual customers.

## Why the legacy table is a publication blocker

`yawmi_sync` uses a sync-code-era model with public `SELECT/INSERT/UPDATE/DELETE` style row access. The current website source uses `yawmi_data` instead, but older cached PWA builds or external consumers might still use `yawmi_sync`. An unrelated anonymous user can currently read one row. **Do not claim production Supabase is secure until fixed.**

## Safe remediation plan — NOT EXECUTED

1. Securely export and verify an **encrypted** backup of `yawmi_sync` and dependent schema using a trusted administrator tool; test restoration away from production. Supabase Free does not include automatic daily project backups.
2. Inventory any older client or script relying on legacy sync codes and announce a retirement window. Check against PWA caches, older Android previews, and log patterns. Avoid inspecting user payloads.
3. In a disposable staging database with the same schema, remove `yawmi_sync_all` and all `anon/authenticated` grants to the legacy table, and test that exposed data is no longer visible and old clients fail closed.
4. Prepare a reviewed and reversible migration; only after backups and compatibility sign-off should it run against production. Do not replace `USING(true)` with `auth.uid() = user_id` without adding and populating that column.
5. Review `rls_auto_enable()` privilege exposure and Auth leaked-password configuration. Re-run Supabase advisors and two-user integration tests.

Useful references: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

**No changes to production Supabase made in this task. No production main merge.**
