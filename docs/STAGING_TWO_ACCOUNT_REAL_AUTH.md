# Yawmi — Real Supabase Auth two-account staging QA

**Scope:** Only isolated staging project `khlfscufeigvykxkwohk`, never production.  
**Workflow:** `.github/workflows/staging-two-account-auth.yml`  
**Runner:** `scripts/qa-staging-auth-real-users.mjs`

## Why this exists

Local PostgreSQL RLS impersonation checks succeeded and a real anonymous PostgREST check succeeded on staging, but those checks alone do **not** exercise Auth login with real JWTs. This manual CI workflow will create and authenticate two disposable test users through Supabase Auth Admin and the regular password-grant endpoint, exercise owner-scoped API access, and clean up the users it created.

The workflow is **manual-only** for its API job. Push events merely run script safety checks, without secrets and without any Supabase API requests.

## One-time setup in the GitHub UI

1. Open the GitHub repository **Settings → Environments** and create `staging-qa`. Use a required reviewer if desired.
2. Under the `staging-qa` environment **Secrets**, add:
   - `YAWMI_STAGING_PUBLISHABLE_KEY` — publishable key from **Supabase → yawmi-staging-security-qa → Project Settings → API Keys**.
   - `YAWMI_STAGING_SERVICE_ROLE_KEY` — **legacy service_role key for the staging project only**, from the same staging project. This is a powerful administrative secret; keep it only in GitHub Encrypted Secrets.
3. **Never** paste either key into a chat, commit it to Git, use the production service-role key, or copy production user records into staging.
4. Open **Actions → Supabase real two-account staging QA (manual) → Run workflow** on the **main** branch. Review the job logs. They print PASS/FAIL, not credentials or raw JWTs.
5. After a successful run, consider rotating/removing the staging service-role key secret and closing the staging environment if no further tests are needed.

### Actual tests

- Create Account A and Account B using staging Auth Admin, with strong random passwords and confirmed fake emails; users exist **only** in staging.
- Sign in with the **ordinary** Auth endpoint and verify each JWT identifies its corresponding user.
- Add independent fake `yawmi_data` rows using each user's own JWT.
- A reads only A; B reads only B.
- A cannot PATCH B; B cannot PATCH A.
- Anonymous role cannot read private `yawmi_data`.
- Anonymous, A and B cannot read the already-locked staging `yawmi_sync` legacy table.
- A second real Auth session for A reads and updates A's data, which is visible in the first A session; B stays unchanged.
- Delete the two **script-created** test Auth users via staging Admin API, so the test's snapshot rows also cascade away.

A failed test attempts to clean up users in a `finally` block and reports any cleanup failure. The script never deletes an account whose ID was not created by that exact CI run.

## Guardrails

- Hard-coded exact staging project ref and URL in script and workflow.
- Hard refusal if production project ref, wrong URL, missing flag, non-GitHub runner, or execution on any branch other than `main`.
- Manual `workflow_dispatch` for network operations; push/PR only validates syntax/safety.
- GitHub Actions token has **contents: read**, no repository write permission.
- The admin key is used **only** to create/delete disposable staging test users. All security assertions and CRUD requests use *regular Auth user JWTs*, so RLS is not bypassed.
- Secrets are never echoed or committed.
- No queries or mutations to production Supabase or production user data.

## Limits of a PASS result

These tests prove real Auth + PostgREST isolation and same-account API propagation. They do **not** prove real Android PWA offline editing, merge/deletion tombstones, background notifications, or safe migration for old sync-code clients. Those require separate device QA and verified backup/compatibility sign-off **before closing the production legacy table or merging the large PR #16**.

## Current state

As of 2026-11-17, the script and safety-only CI are verified; **a full live Auth workflow has not been executed** because staging secrets must be set securely in GitHub first. The earlier RLS tests used database-role impersonation; do not label them as real Auth API tests.
