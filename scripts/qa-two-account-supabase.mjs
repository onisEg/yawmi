#!/usr/bin/env node
/**
 * Yawmi staging-only, real two-account API isolation and sync roundtrip.
 *
 * This script MUST NOT run against production or arbitrary user accounts.
 * It refuses to write unless explicitly armed with a *separate* Supabase
 * project ref, two dedicated disposable Auth accounts, and empty data rows.
 *
 * Native fetch requires Node.js >= 20 (project CI uses Node 22).
 * See docs/PRE14_ROLLBACK_AND_SUPABASE_SECURITY_QA.md.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const PROD_REF='jtldivmllnzktnzgwtsm';
const must=(key)=> {
  const value=process.env[key]?.trim();
  if(!value) throw new Error('Missing '+key+' (no network request sent)');
  return value;
};
const guard=()=>{
  if(process.env.ALLOW_STAGING_QA_WRITE!=='YES_STAGING_ONLY')
    throw new Error('Refusing to write: ALLOW_STAGING_QA_WRITE must equal YES_STAGING_ONLY');
  const ref=must('SUPABASE_QA_PROJECT_REF');
  if(ref===PROD_REF) throw new Error('Production project explicitly blocked');
  const url=new URL(must('SUPABASE_QA_URL'));
  if(url.protocol!=='https:' || url.hostname!==ref+'.supabase.co' ||
     url.username || url.password || url.port || url.pathname!=='/' ||
     url.search || url.hash) {
    throw new Error('QA URL must be the exact https://<QA_PROJECT_REF>.supabase.co/');
  }
  const authKey=must('SUPABASE_QA_PUBLISHABLE_KEY');
  const a={email:must('SUPABASE_QA_USER_A_EMAIL'),password:must('SUPABASE_QA_USER_A_PASSWORD')};
  const b={email:must('SUPABASE_QA_USER_B_EMAIL'),password:must('SUPABASE_QA_USER_B_PASSWORD')};
  if(a.email===b.email) throw new Error('Two DIFFERENT disposable staging accounts are required');
  if(a.email.startsWith('admin@')||b.email.startsWith('admin@'))
    throw new Error('Use dedicated QA-only user accounts');
  return {base:url.origin,authKey,a,b};
};
async function request(cfg,path,{token,method='GET',body,extraHeaders={}}={}){
  const headers={'apikey':cfg.authKey,'accept':'application/json',...extraHeaders};
  if(token) headers.authorization='Bearer '+token;
  if(body!==undefined) headers['content-type']='application/json';
  let response;
  try {
    response=await fetch(cfg.base+path,{
      method,headers,body:body===undefined?undefined:JSON.stringify(body),
      signal:AbortSignal.timeout(20000)
    });
  }catch(e){throw new Error('QA network failed ('+e.name+'); details suppressed');}
  let data;
  try{data=await response.json()}catch{data=null}
  if(!response.ok) {
    const err=new Error('QA API status '+response.status+' on '+method+' '+path.split('?')[0]);
    err.status=response.status;
    throw err;
  }
  return data;
}
async function login(cfg,user){
  const session=await request(cfg,'/auth/v1/token?grant_type=password',{
    method:'POST',body:{email:user.email,password:user.password}
  });
  assert.ok(session?.access_token,'Missing access token');
  const account=await request(cfg,'/auth/v1/user',{token:session.access_token});
  assert.match(account?.id??'',/^[0-9a-f-]{36}$/i);
  return {token:session.access_token,id:account.id};
}
const only=(accountId)=>'/rest/v1/yawmi_data?select=user_id%2Cdata&user_id=eq.'+encodeURIComponent(accountId);
const ownerOnly=(accountId)=>'/rest/v1/yawmi_data?select=user_id&user_id=eq.'+encodeURIComponent(accountId);
async function assertNoExistingData(cfg,actor){
  const rows=await request(cfg,ownerOnly(actor.id),{token:actor.token});
  assert.ok(Array.isArray(rows));
  if(rows.length!==0) throw new Error(
    'Aborting: a dedicated QA account already owns a yawmi_data row. NO overwrite allowed.'
  );
}
async function insertOwn(cfg,actor,data){
  const rows=await request(cfg,'/rest/v1/yawmi_data?on_conflict=user_id',{
    token:actor.token,method:'POST',
    extraHeaders:{prefer:'resolution=merge-duplicates,return=representation'},
    body:{user_id:actor.id,data}
  });
  assert.equal(rows?.length,1,'Owner insert must return exactly one row');
}
async function readOwner(cfg,viewer,ownerId){
  return request(cfg,only(ownerId),{token:viewer.token});
}
async function assertDeniedCrossUpdate(cfg,viewer,owner){
  try{
    const rows=await request(cfg,only(owner.id),{
      token:viewer.token,method:'PATCH',
      extraHeaders:{prefer:'return=representation'},
      body:{data:{qa:'unauthorized-overwrite-attempt'}}
    });
    assert.deepEqual(rows,[],'Cross-user PATCH unexpectedly modified or returned a row');
  }catch(e){
    if(e.status!==403 && e.status!==401) throw e;
  }
}
async function main(){
  const cfg=guard(); // NO requests until all guardrails pass
  console.log('Staging project guard passed. No production requests will be made.');
  const first=await login(cfg,cfg.a);
  const second=await login(cfg,cfg.b);
  assert.notEqual(first.id,second.id,'Different auth users required');
  // We never overwrite existing rows, even in staging.
  await assertNoExistingData(cfg,first);
  await assertNoExistingData(cfg,second);
  const run=randomUUID(),mk=(who)=>({
    qa:'yawmi-two-account-staging-only',
    run,
    owner:who,
    tasks:[{id:who+'-task-1',t:'QA task',done:false}],
    notes:[{id:who+'-note-1',t:'QA note',body:'Private staging fixture'}]
  });
  await insertOwn(cfg,first,mk('A'));
  await insertOwn(cfg,second,mk('B'));
  for(const [actor,other,label] of [[first,second,'A'],[second,first,'B']]){
    const own=await readOwner(cfg,actor,actor.id);
    assert.equal(own?.length,1,label+' cannot read own data');
    assert.equal(own[0].data.owner,label);
    const hidden=await readOwner(cfg,actor,other.id);
    assert.deepEqual(hidden,[],label+' read the other account');
  }
  await assertDeniedCrossUpdate(cfg,first,second);
  await assertDeniedCrossUpdate(cfg,second,first);
  for(const [actor,label] of [[first,'A'],[second,'B']]){
    const own=await readOwner(cfg,actor,actor.id);
    assert.equal(own.length,1);
    assert.equal(own[0].data.owner,label,'Cross-write altered data');
    assert.equal(own[0].data.run,run,'Cross-write altered fixture');
  }
  // Two separately authenticated sessions of Account A act as two devices.
  const firstDevice2=await login(cfg,cfg.a);
  assert.equal(firstDevice2.id,first.id);
  const aOnSecondDevice=await readOwner(cfg,firstDevice2,first.id);
  assert.equal(aOnSecondDevice[0].data.owner,'A');
  const updated=structuredClone(aOnSecondDevice[0].data);
  updated.tasks.push({id:'A-task-2',t:'Reconnected device task',done:false});
  const after=await request(cfg,only(first.id),{
    token:firstDevice2.token,method:'PATCH',
    extraHeaders:{prefer:'return=representation'},body:{data:updated}
  });
  assert.equal(after?.length,1,'Device 2 update failed');
  const observedByFirst=await readOwner(cfg,first,first.id);
  assert.equal(observedByFirst[0].data.tasks.length,2,'Device 1 missed device 2 write');
  const bUnaffected=await readOwner(cfg,second,second.id);
  assert.equal(bUnaffected[0].data.tasks.length,1,'Cross-account data bleed');
  console.log('PASS: A/B authenticated owner isolation, cross-user read/write denial, and two-session API sync.');
  console.log('NOTE: This tests staging Auth + RLS + PostgREST, not the full app offline merge UI.');
  console.log('QA fixture rows remain ONLY in the disposable staging project.');
}
main().catch(error=>{console.error('QA FAILED: '+error.message);process.exitCode=1;});
