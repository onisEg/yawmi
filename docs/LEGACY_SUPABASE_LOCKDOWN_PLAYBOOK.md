# Yawmi: safely close legacy Supabase sync exposure

**Status: NOT FIXED IN PRODUCTION.** The connected Supabase project has a legacy `public.yawmi_sync` table with RLS enabled but a `yawmi_sync_all` policy that says `USING (true) WITH CHECK (true)` for `anon` and `authenticated`. A read-only SQL check using `SET LOCAL ROLE anon` counted **one legacy row visible**. The table has no `user_id` column, so do not replace this policy with `auth.uid() = user_id` without a complete ownership migration.

The newer `public.yawmi_data` table is already protected with `auth.uid() = user_id` SELECT/INSERT/UPDATE policies. In read-only tests, anonymous and a synthetic unrelated authenticated identity saw zero rows. That is not full multi-account integration testing, but it is a strong initial check.

## What the app owner needs to do

1. In [Supabase dashboard](https://supabase.com/dashboard/project/jtldivmllnzktnzgwtsm), open **Database > Backups** and determine the available backup method. Supabase Free does **not** include automatic daily backups. Supabase recommends CLI `supabase db dump` for Free projects; use a privileged local machine and store the export in an encrypted, private, off-device backup. Avoid sharing DB URLs, JWTs, private data, passwords or exports through chat or GitHub.
2. Export both **schema and rows** for `yawmi_sync` and `yawmi_data` (or back up the full database). Verify the backup opens and test a restore on a **separate staging project** before considering production changes.
3. Confirm no old Android previews, cached PWA builds, or legacy scripts still depend on `yawmi_sync`. Our current `index.html` and `main` read `yawmi_data`, but older distributed clients may still exist.
4. After the backup and client inventory, use the prepared lockdown SQL `docs/manual-sql/close-legacy-sync-after-backup.sql` first in staging. It removes the permissive legacy policy and revokes API role table access. It also revokes public `EXECUTE` of the definer helper `rls_auto_enable()`, subject to staging review. **Do not run the script in the production SQL Editor yet.**
5. Confirm with a two-account staging test: User A can only read/write A's `yawmi_data`, User B only B's; anonymous access denied; both unable to read/write `yawmi_sync`. Verify app sync from two devices, sign-in/out and offline resume with throwaway data.
6. Review a rollback from the encrypted backup, then apply the reviewed lockdown to production during a short maintenance window. Repeat the SQL privilege tests and Supabase Security Advisor.
7. Enable leaked-password protection if available on your Supabase Auth plan, and review the existing privileged trigger-function grants.

## Why urgency matters

Currently the legacy row is readable to anonymous API clients, and the permissive policy authorizes broader operations. Merely keeping RLS **enabled** does not help if the policy is `true`. This is a privacy/security issue. Prioritize backup and a controlled lockdown rather than waiting for the next UI release.

## Safe operational rule

Never run tests that create a fake customer or modify production user records. CI tests can validate the migration script and policy structure; **real role-level security integration tests must use a disposable staging Supabase instance**.

References:
- https://supabase.com/docs/guides/api/securing-your-api
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/platform/backups
