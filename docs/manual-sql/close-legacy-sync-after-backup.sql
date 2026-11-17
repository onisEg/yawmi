-- PREPARED ONLY: DO NOT EXECUTE AGAINST PRODUCTION WITHOUT VERIFIED BACKUP
-- AND ACCEPTANCE THAT ANY OLD SYNC-CODE CLIENTS WILL LOSE LEGACY SYNC.
--
-- The old table has NO per-user user_id field. Its old RLS policy allowed
-- every anon/authenticated request to read/write EVERY legacy row.
-- New clients use public.yawmi_data with auth.uid() RLS instead.
--
-- Run only under a Supabase database administrator AFTER restoring a backup
-- to a staging project and verifying legacy-client migration strategy.
begin;
  alter table public.yawmi_sync enable row level security;
  drop policy if exists "yawmi_sync_all" on public.yawmi_sync;
  revoke all privileges on table public.yawmi_sync from public, anon, authenticated;
  -- Supabase Security Advisor finding: definer event-trigger function callable
  -- by API roles. REVOKE in staging first; audit event-trigger behavior.
  revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
commit;

-- Postflight verification queries (read-only):
-- select has_table_privilege('anon','public.yawmi_sync','SELECT') as anon_can_read,
--        has_table_privilege('authenticated','public.yawmi_sync','SELECT') as user_can_read;
-- select count(*) as public_legacy_policy_count
--   from pg_policies where schemaname='public' and tablename='yawmi_sync';
-- New authenticated clients must continue to read ONLY their yawmi_data row.
