-- Confirm the mocked legacy configuration is genuinely vulnerable before applying the fix.
DO $$
DECLARE row_count integer;
BEGIN
  IF NOT has_table_privilege('anon','public.yawmi_sync','SELECT') THEN
    RAISE EXCEPTION 'Precondition failed: anon should have vulnerable legacy SELECT access';
  END IF;
  IF NOT has_table_privilege('authenticated','public.yawmi_sync','UPDATE') THEN
    RAISE EXCEPTION 'Precondition failed: authenticated should have vulnerable legacy UPDATE access';
  END IF;
  IF NOT has_function_privilege('anon','public.rls_auto_enable()','EXECUTE') THEN
    RAISE EXCEPTION 'Precondition failed: exposed SECURITY DEFINER should be callable by anon';
  END IF;
  SELECT count(*) INTO row_count FROM public.yawmi_sync;
  IF row_count <> 1 THEN
    RAISE EXCEPTION 'Expected ONE fake legacy row, got %',row_count;
  END IF;
END $$;
SET ROLE anon;
SELECT count(*) AS prelock_exposed_legacy_row_count FROM public.yawmi_sync;
RESET ROLE;
