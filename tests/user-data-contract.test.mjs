import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root,'index.html'),'utf8');
const start = html.indexOf('function mergeDay(');
const end = html.indexOf('let syncTimer = null', start);
assert.ok(start >= 0 && end > start, 'Production merge implementation must be located');
const sandbox = {};
vm.runInNewContext(html.slice(start,end)+'\n;globalThis.mergeSnapshot = mergeData;',sandbox,{timeout:1500});
const merge = (local,remote)=>JSON.parse(JSON.stringify(sandbox.mergeSnapshot(local,remote)));

test('first login with blank Android storage must preserve all nine cloud data sections and settings', () => {
  const remote={
    days:{'2026-11-12':{j:'kept'}},
    tasks:[{id:'t1',t:'keep'}],
    exps:[{id:'e1',a:29}],
    obls:[{id:'o1',a:9}],
    revs:{'2026-W46':{answers:{q1:'kept'}}},
    goals:[{id:'g1',projects:[{id:'p1',t:'kept'}]}],
    bhData:{sample:{start:1000,last:1000,relapses:[]}},
    challenges:[{id:'c1',manualLog:{'2026-11-12':true}}],
    notes:[{id:'n1',body:'kept'}],
    settings:{name:'Test account',currency:'EUR',habits:['read']}
  };
  const result=merge({},remote);
  for(const field of Object.keys(remote)) {
    assert.ok(result[field] !== undefined, 'Missing '+field);
  }
  assert.equal(result.notes[0].body,'kept');
  assert.equal(result.challenges[0].id,'c1');
  assert.equal(result.goals[0].projects[0].id,'p1');
  assert.equal(result.bhData.sample.start,1000);
  assert.equal(result.settings.currency,'EUR');
});

test('cross-device merge retains distinct notes, tasks, expenses and obligations',()=>{
  const local={
    tasks:[{id:'task-local',updatedAt:20}],
    notes:[{id:'note-local',updatedAt:20}],
    exps:[{id:'expense-local',updatedAt:20}],
    obls:[{id:'obl-local',updatedAt:20}]
  };
  const remote={
    tasks:[{id:'task-remote',updatedAt:10}],
    notes:[{id:'note-remote',updatedAt:10}],
    exps:[{id:'expense-remote',updatedAt:10}],
    obls:[{id:'obl-remote',updatedAt:10}]
  };
  const result=merge(local,remote);
  for(const [key,prefix] of [['tasks','task'],['notes','note'],['exps','expense'],['obls','obl']]){
    assert.deepEqual(result[key].map(x=>x.id).sort(),[prefix+'-local',prefix+'-remote'].sort(),key);
  }
});

test('deletion of a shared record is not undone by stale offline content',()=>{
  const local={notes:[{id:'n',body:'old content',updatedAt:20}]};
  const remote={notes:[{id:'n',del:true,delAt:200,updatedAt:200}]};
  assert.equal(merge(local,remote).notes[0].del,true);
});

test('cloud reads must fail closed: errors cannot turn on syncReady or upload snapshots',()=>{
  const failure=html.indexOf("if(res.status === 'error' || res.status === 'offline'){");
  const success=html.indexOf("if(res.status === 'ok'",failure);
  assert.ok(failure>=0 && success>failure);
  const branch=html.slice(failure,success);
  assert.match(branch,/syncReady\s*=\s*false/);
  assert.doesNotMatch(branch,/syncPush\s*\(/);
  assert.doesNotMatch(branch,/syncReady\s*=\s*true/);
});

test('old and new JSON exports keep notes and challenges and all local keys',()=>{
  const backupStart=html.indexOf('function doExportJSON(){');
  const backupEnd=html.indexOf('function csvCell(',backupStart);
  const exporter=html.slice(backupStart,backupEnd);
  assert.match(exporter,/notes/);
  assert.match(exporter,/challenges/);
  for(const key of ['yawmi_days','yawmi_tasks','yawmi_exp','yawmi_obl','yawmi_rev','yawmi_goals','yawmi_bhdata','yawmi_settings','yawmi_notes','yawmi_challenges']) {
    assert.ok(html.includes(key),'Missing stable localStorage key '+key);
  }
});
