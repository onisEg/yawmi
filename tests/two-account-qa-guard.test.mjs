import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname,join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const script=join(root,'scripts','qa-two-account-supabase.mjs');
const execute=env=>spawnSync(process.execPath,[script],{
  cwd:root,env:{PATH:process.env.PATH,...env},encoding:'utf8',timeout:5000
});
test('two-account QA tool requires an explicit staging-only write gate',()=>{
  const x=execute({});
  assert.notEqual(x.status,0);
  assert.match(x.stderr,/ALLOW_STAGING_QA_WRITE/);
});
test('two-account QA tool refuses the real Yawmi production Supabase project',()=>{
  const x=execute({
    ALLOW_STAGING_QA_WRITE:'YES_STAGING_ONLY',
    SUPABASE_QA_PROJECT_REF:'jtldivmllnzktnzgwtsm',
    SUPABASE_QA_URL:'https://jtldivmllnzktnzgwtsm.supabase.co/',
    SUPABASE_QA_PUBLISHABLE_KEY:'never-use-this-key'
  });
  assert.notEqual(x.status,0);
  assert.match(x.stderr,/Production project explicitly blocked/);
});
test('two-account QA tool refuses mismatching or non-HTTPS staging hosts',()=>{
  const x=execute({
    ALLOW_STAGING_QA_WRITE:'YES_STAGING_ONLY',
    SUPABASE_QA_PROJECT_REF:'disposabletestproject',
    SUPABASE_QA_URL:'http://disposabletestproject.supabase.co/',
    SUPABASE_QA_PUBLISHABLE_KEY:'never-use-this-key'
  });
  assert.notEqual(x.status,0);
  assert.match(x.stderr,/QA URL must be/);
});
