#!/usr/bin/env node
/**
 * Real two-user Supabase Auth + PostgREST integration test.
 *
 * Runs ONLY when manually triggered with GitHub Actions secrets from the
 * separate Yawmi staging project. NEVER supply a production key/URL here.
 *
 * Creates two disposable Auth users with random credentials, tests RLS and
 * two sessions of the same user, then deletes only the users it created.
 * No customer data, passwords, JWTs or admin keys are logged.
 */
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';

const STAGING_REF = 'khlfscufeigvykxkwohk';
const PRODUCTION_REF = 'jtldivmllnzktnzgwtsm';
const EXPECTED_URL = 'https://' + STAGING_REF + '.supabase.co';
const created = [];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('Missing required staging secret/environment: ' + name);
  return value;
}

function settings() {
  if (process.env.ALLOW_STAGING_QA_WRITE !== 'YES_STAGING_ONLY')
    throw new Error('Test explicitly gated to staging only');
  const ref = required('SUPABASE_QA_PROJECT_REF');
  const url = required('SUPABASE_QA_URL');
  if (ref !== STAGING_REF || ref === PRODUCTION_REF || url !== EXPECTED_URL)
    throw new Error('Wrong project: staging URL and ref must match hard-coded disposable project');
  if (process.env.GITHUB_ACTIONS !== 'true' || process.env.GITHUB_REF !== 'refs/heads/main')
    throw new Error('Only the manually dispatched GitHub Actions job on main is permitted');
  const publishable = required('SUPABASE_QA_PUBLISHABLE_KEY');
  const serviceRole = required('SUPABASE_QA_SERVICE_ROLE_KEY');
  if (publishable === serviceRole) throw new Error('Publishable and service role keys must differ');
  return { url, publishable, serviceRole };
}

async function call(cfg, path, {
  method = 'GET', auth = 'anon', token = null, payload, prefer
} = {}) {
  const key = auth === 'admin' ? cfg.serviceRole : cfg.publishable;
  const headers = { 'apikey': key, 'Accept': 'application/json' };
  if (auth === 'admin') headers.Authorization = 'Bearer ' + cfg.serviceRole;
  else if (token) headers.Authorization = 'Bearer ' + token;
  if (payload !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  let resp;
  try {
    resp = await fetch(cfg.url + path, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(20000)
    });
  } catch (error) {
    throw new Error('Staging API network problem: ' + (error?.name || 'unknown'));
  }
  let body = null;
  try { body = await resp.json(); } catch { /* possible empty response */ }
  return { status: resp.status, body };
}

async function expectSuccess(cfg, path, opts, allowed = [200,201,204]) {
  const r = await call(cfg, path, opts);
  if (!allowed.includes(r.status))
    throw new Error((opts?.method || 'GET') + ' ' + path.split('?')[0] + ' returned HTTP ' + r.status);
  return r.body;
}

async function createStagingUser(cfg, name) {
  const email = 'yawmi-qa-' + randomUUID().replaceAll('-','') + '@example.com';
  const password = 'Qa!' + randomBytes(27).toString('hex') + '9Z';
  const user = await expectSuccess(cfg,'/auth/v1/admin/users',{
    auth:'admin', method:'POST',
    payload:{email,password,email_confirm:true,user_metadata:{staging_qa:true,label:name}}
  },[200,201]);
  assert.match(user?.id ?? '', /^[0-9a-f-]{36}$/i, 'Auth admin did not return a user id');
  created.push({id:user.id,email});
  return {id:user.id,email,password};
}

async function login(cfg, {email,password,id}) {
  const data = await expectSuccess(cfg,'/auth/v1/token?grant_type=password',{
    method:'POST',payload:{email,password}
  },[200]);
  assert.ok(data?.access_token, 'Auth did not provide a user token');
  const who = await expectSuccess(cfg,'/auth/v1/user',{token:data.access_token},[200]);
  assert.equal(who.id,id,'Authenticated JWT belongs to wrong user');
  return {id, token:data.access_token};
}

function select(ownerId) {
  return '/rest/v1/yawmi_data?select=user_id%2Cdata&user_id=eq.' + encodeURIComponent(ownerId);
}

async function readOwner(cfg,viewer,ownerId) {
  return expectSuccess(cfg,select(ownerId),{token:viewer.token},[200]);
}

async function createOwnedRecord(cfg,who,label) {
  const result = await expectSuccess(cfg,'/rest/v1/yawmi_data?on_conflict=user_id',{
    method:'POST',token:who.token,
    prefer:'resolution=merge-duplicates,return=representation',
    payload:{
      user_id:who.id,
      data:{
        qa:true,owner:label,
        tasks:[{id:label+'-task-1',t:'QA task',done:false}],
        notes:[{id:label+'-note-1',t:'Private '+label}]
      }
    }
  },[200,201]);
  assert.equal(result?.length,1,'Own row was not created');
}

async function assertCrossUpdateDenied(cfg,viewer,other) {
  const r = await call(cfg,select(other.id),{
    method:'PATCH',token:viewer.token,
    prefer:'return=representation',
    payload:{data:{qa:true,owner:'UNAUTHORIZED'}}
  });
  if (r.status === 401 || r.status === 403) return;
  assert.equal(r.status,200,'Unexpected cross-account PATCH HTTP status');
  assert.deepEqual(r.body,[],'RLS allowed unauthorized cross-account modification');
}

async function run(cfg) {
  // Only randomly created, dedicated staging accounts can be touched.
  const qaA=await createStagingUser(cfg,'A');
  const qaB=await createStagingUser(cfg,'B');
  const a=await login(cfg,qaA);
  const b=await login(cfg,qaB);
  assert.notEqual(a.id,b.id);

  await createOwnedRecord(cfg,a,'A');
  await createOwnedRecord(cfg,b,'B');

  for (const [actor,other,label] of [[a,b,'A'],[b,a,'B']]) {
    const owned=await readOwner(cfg,actor,actor.id);
    assert.equal(owned.length,1);
    assert.equal(owned[0].data.owner,label);
    assert.deepEqual(await readOwner(cfg,actor,other.id),[],'Cross-account SELECT exposed row');
  }
  console.log('PASS: two real Auth users can only read their own records');

  await assertCrossUpdateDenied(cfg,a,b);
  await assertCrossUpdateDenied(cfg,b,a);
  for (const [actor,label] of [[a,'A'],[b,'B']]) {
    const own=await readOwner(cfg,actor,actor.id);
    assert.equal(own[0].data.owner,label);
  }
  console.log('PASS: cross-account PATCH cannot alter the other user');

  const anon=await expectSuccess(cfg,'/rest/v1/yawmi_data?select=user_id',{auth:'anon'},[200]);
  assert.deepEqual(anon,[],'Anonymous query exposed user data');
  for (const token of [null,a.token,b.token]) {
    const r=await call(cfg,'/rest/v1/yawmi_sync?select=sync_code',{token});
    assert.ok([401,403].includes(r.status),'Legacy table is accessible to API user (HTTP '+r.status+')');
  }
  console.log('PASS: anonymous and legacy-table API access denied');

  // A second login is a second real Auth session, matching two browser profiles.
  const deviceTwo=await login(cfg,qaA);
  const onTwo=await readOwner(cfg,deviceTwo,a.id);
  assert.equal(onTwo[0].data.owner,'A');
  const changed=structuredClone(onTwo[0].data);
  changed.tasks.push({id:'A-task-2',t:'Second device update',done:false});
  const updated=await expectSuccess(cfg,select(a.id),{
    method:'PATCH',token:deviceTwo.token,
    prefer:'return=representation',payload:{data:changed}
  },[200]);
  assert.equal(updated.length,1);
  const onOne=await readOwner(cfg,a,a.id);
  assert.equal(onOne[0].data.tasks.length,2,'First session did not see second session update');
  const unaffected=await readOwner(cfg,b,b.id);
  assert.equal(unaffected[0].data.tasks.length,1,'Data from A leaked into B');
  console.log('PASS: same-account two-session API changes synchronize; B stays isolated');
  console.log('NOTE: Full Android offline/conflict merge still requires separate device testing');
}

async function cleanup(cfg) {
  for (const user of created) {
    // Never allow deletion of a user that wasn't made by this exact job.
    if (!user.email.startsWith('yawmi-qa-') || !user.email.endsWith('@example.com'))
      throw new Error('Refusing to delete unexpected account');
    const r=await call(cfg,'/auth/v1/admin/users/'+encodeURIComponent(user.id),{
      auth:'admin',method:'DELETE'
    });
    if (![200,204].includes(r.status))
      console.error('WARNING: disposable staging test account cleanup returned HTTP '+r.status);
  }
}

async function main() {
  const cfg=settings(); // absolutely NO network access before staging guard
  console.log('Running live Auth+RLS integration on isolated Yawmi staging project only');
  try { await run(cfg); }
  finally { await cleanup(cfg); }
}
main().catch(error=>{
  console.error('STAGING QA FAILURE: '+error.message);
  process.exitCode=1;
});
