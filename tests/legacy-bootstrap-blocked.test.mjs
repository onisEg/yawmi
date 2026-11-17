import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=path=>readFileSync(join(root,path),'utf8');

test('legacy sync bootstrap is disabled before any SQL side effects',()=>{
 const legacy=read('supabase-setup.sql');
 assert.match(legacy,/DO \$legacy_sync_disabled\$[\s\S]*RAISE EXCEPTION/);
 assert.doesNotMatch(legacy,/^\s*create\s+policy\b/im);
 assert.doesNotMatch(legacy,/^\s*drop\s+policy\b/im);
 assert.doesNotMatch(legacy,/^\s*create\s+table\b/im);
 assert.doesNotMatch(legacy,/^\s*(?:insert|update|delete|grant)\s+/im);
});

test('prepared legacy lockdown revokes access without dropping user records',()=>{
 const migration=read('docs/manual-sql/close-legacy-sync-after-backup.sql');
 assert.match(migration,/drop policy if exists "yawmi_sync_all"/i);
 assert.match(migration,/revoke all privileges on table public\.yawmi_sync from public, anon, authenticated/i);
 assert.match(migration,/revoke execute on function public\.rls_auto_enable\(\) from public, anon, authenticated/i);
 const executable=migration.split('\n').filter(x=>!x.trim().startsWith('--')).join('\n');
 assert.doesNotMatch(executable,/\b(drop table|truncate|delete from)\b/i);
 assert.doesNotMatch(executable,/\b(public\.yawmi_data)\b/i);
});

test('sandbox RLS fixture uses only disposable test UUIDs and never production URL',()=>{
 for(const path of [
 'security/staging/prelock_fixtures.sql',
 'security/staging/assert_before_lock.sql',
 'security/staging/assert_after_lock.sql',
 '.github/workflows/security-rls-sandbox.yml'
 ]){
  const text=read(path);
  assert.doesNotMatch(text,/https?:\/\/[a-z0-9-]+\.supabase\.co/);
  assert.doesNotMatch(text,/jtldivmllnzktnzgwtsm/);
 }
});
