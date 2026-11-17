-- Disposable GitHub Actions PostgreSQL 17 ONLY. Never run on production.
-- Creates representative schema and entirely fake test rows (no customer data).
DO $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

CREATE TABLE public.yawmi_sync (
 sync_code text PRIMARY KEY,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.yawmi_sync ENABLE ROW LEVEL SECURITY;
CREATE POLICY yawmi_sync_all ON public.yawmi_sync
 FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT ALL PRIVILEGES ON public.yawmi_sync TO anon, authenticated;
INSERT INTO public.yawmi_sync(sync_code,data) VALUES ('fake-staging-code','{"fixture":true}');

-- Match the ownership pattern of the real yawmi_data table.
CREATE TABLE public.yawmi_data (
 user_id uuid PRIMARY KEY,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.yawmi_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY yawmi_data_select ON public.yawmi_data
 FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY yawmi_data_insert ON public.yawmi_data
 FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY yawmi_data_update ON public.yawmi_data
 FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON public.yawmi_data TO authenticated;
INSERT INTO public.yawmi_data (user_id,data) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','{"owner":"A","tasks":[{"id":"A-1"}]}'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','{"owner":"B","tasks":[{"id":"B-1"}]}');

-- Simulate existing public event-trigger function and its exposed execute grant.
CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog
AS $$ BEGIN NULL; END $$;
CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
 WHEN TAG IN ('CREATE TABLE') EXECUTE FUNCTION public.rls_auto_enable();
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO PUBLIC, anon, authenticated;
