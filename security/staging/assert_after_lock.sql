-- Assert the EXACT prepared lockdown migration can safely lock down the
-- legacy table while preserving ownership checks on the active yawmi_data.
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public'
   AND tablename='yawmi_sync' AND policyname='yawmi_sync_all') THEN
   RAISE EXCEPTION 'Legacy permissive RLS policy still present';
 END IF;
 IF has_table_privilege('anon','public.yawmi_sync','SELECT')
 OR has_table_privilege('authenticated','public.yawmi_sync','SELECT')
 OR has_table_privilege('anon','public.yawmi_sync','UPDATE')
 OR has_table_privilege('authenticated','public.yawmi_sync','UPDATE') THEN
   RAISE EXCEPTION 'Legacy table is still API-accessible';
 END IF;
 IF has_function_privilege('anon','public.rls_auto_enable()','EXECUTE')
 OR has_function_privilege('authenticated','public.rls_auto_enable()','EXECUTE') THEN
   RAISE EXCEPTION 'SECURITY DEFINER RPC is still exposed';
 END IF;
 IF (SELECT count(*) FROM public.yawmi_sync) <> 1
 OR (SELECT count(*) FROM public.yawmi_data) <> 2 THEN
   RAISE EXCEPTION 'Migration incorrectly deleted or modified test rows';
 END IF;
 IF NOT has_table_privilege('authenticated','public.yawmi_data','SELECT')
 OR NOT has_table_privilege('authenticated','public.yawmi_data','UPDATE') THEN
   RAISE EXCEPTION 'Current user synchronization permissions were broken';
 END IF;
END $$;

-- Session A (first disposable real Postgres identity)
SET request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE authenticated;
DO $$
DECLARE own_count integer; other_count integer; changed_count integer;
BEGIN
 SELECT count(*) INTO own_count FROM public.yawmi_data
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 SELECT count(*) INTO other_count FROM public.yawmi_data
  WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 IF own_count<>1 OR other_count<>0 THEN
   RAISE EXCEPTION 'User A RLS SELECT isolation failed (own %, other %)',own_count,other_count;
 END IF;
 UPDATE public.yawmi_data SET data='{"unauthorized":true}'::jsonb
  WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 GET DIAGNOSTICS changed_count=ROW_COUNT;
 IF changed_count<>0 THEN RAISE EXCEPTION 'A altered B data'; END IF;
 UPDATE public.yawmi_data SET data='{"owner":"A","tasks":[{"id":"A-1"},{"id":"A-2"}]}'::jsonb
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 GET DIAGNOSTICS changed_count=ROW_COUNT;
 IF changed_count<>1 THEN RAISE EXCEPTION 'A cannot update own data'; END IF;
END $$;
RESET ROLE;

-- Session B has no access to A; its own data is unchanged.
SET request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
SET ROLE authenticated;
DO $$
DECLARE own_count integer; other_count integer; changed_count integer; own_data jsonb;
BEGIN
 SELECT count(*) INTO own_count FROM public.yawmi_data
  WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 SELECT count(*) INTO other_count FROM public.yawmi_data
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 IF own_count<>1 OR other_count<>0 THEN
  RAISE EXCEPTION 'User B RLS SELECT isolation failed';
 END IF;
 UPDATE public.yawmi_data SET data='{"unauthorized":true}'::jsonb
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 GET DIAGNOSTICS changed_count=ROW_COUNT;
 IF changed_count<>0 THEN RAISE EXCEPTION 'B altered A data'; END IF;
 SELECT data INTO own_data FROM public.yawmi_data
  WHERE user_id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 IF own_data->>'owner'<>'B' THEN
  RAISE EXCEPTION 'User B data corrupted';
 END IF;
END $$;
RESET ROLE;
-- Second authenticated session for A: observes A's latest data.
SET request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
SET ROLE authenticated;
DO $$
DECLARE a_data jsonb;
BEGIN
 SELECT data INTO a_data FROM public.yawmi_data
  WHERE user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
 IF jsonb_array_length(a_data->'tasks')<>2 THEN
  RAISE EXCEPTION 'Second A session cannot see updated data';
 END IF;
END $$;
RESET ROLE;

-- Anonymous role must have no TABLE privilege; this test complements the
-- deliberate SELECT attempt performed in the GitHub Actions shell.
DO $$
BEGIN
 IF has_table_privilege('anon','public.yawmi_sync','SELECT') THEN
  RAISE EXCEPTION 'anon can still read legacy table';
 END IF;
 IF has_table_privilege('anon','public.yawmi_data','SELECT') THEN
  RAISE EXCEPTION 'anon can read current user table (grant still present)';
 END IF;
END $$;
