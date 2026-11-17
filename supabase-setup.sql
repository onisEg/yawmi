-- STOP: THIS LEGACY SETUP HAS BEEN PERMANENTLY DISABLED.
--
-- Yawmi no longer authenticates users with a shared sync code. The former
-- yawmi_sync_all policy allowed anon/authenticated clients to READ/UPDATE
-- every legacy row, even if they did not know its code.
--
-- IMPORTANT: This file is intentionally a FAIL-CLOSED stub. It must not
-- CREATE a table, change a policy or re-expose any legacy data. The original
-- historical script remains available through Git history for audit, NOT reuse.
--
-- Current app schema: supabase-auth-setup.sql (auth.uid() = user_id).
-- Existing legacy table lockdown: docs/manual-sql/close-legacy-sync-after-backup.sql
-- Before any production migration: encrypted backup + restore rehearsal,
-- staging tests, old client inventory and explicit owner approval.
--
-- Do not use this script to create or repair the production database.
DO $legacy_sync_disabled$
BEGIN
  RAISE EXCEPTION
    'Unsafe legacy sync-code bootstrap disabled. See docs/PRODUCTION_SECURITY_RELEASE_GATE.md';
END
$legacy_sync_disabled$;
