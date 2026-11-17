import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(join(root, 'index.html'), 'utf8');
const start = html.indexOf('function mergeDay(');
const end = html.indexOf('let syncTimer = null', start);
assert.ok(start >= 0 && end > start, 'the production merge functions must exist');

const sandbox = {};
vm.runInNewContext(
  html.slice(start, end) + '\n;globalThis.mergeDataForTest = mergeData;',
  sandbox,
  { timeout: 1500 }
);
const merge = (a, b) => JSON.parse(JSON.stringify(sandbox.mergeDataForTest(a, b)));

test('first native login on an empty local device preserves remote cloud data', () => {
  const remote = {
    days: { '2026-11-10': { j: 'Older diary', u: 1000 } },
    tasks: [{ id: 'task-1', t: 'Keep this task', updatedAt: 5000 }],
    exps: [{ id: 'expense-1', a: 20, updatedAt: 5000 }],
    notes: [{ id: 'note-1', body: 'private note', updatedAt: 5000 }],
    challenges: [{ id: 'challenge-1', manualLog: { '2026-11-10': true } }],
    settings: { name: 'Test user', currency: 'EUR' }
  };
  const got = merge({}, remote);
  assert.equal(got.days['2026-11-10'].j, 'Older diary');
  assert.equal(got.tasks[0].t, 'Keep this task');
  assert.equal(got.exps[0].a, 20);
  assert.equal(got.notes[0].body, 'private note');
  assert.equal(got.challenges[0].id, 'challenge-1');
  assert.equal(got.settings.name, 'Test user');
});

test('sync merges different items from two devices without deleting either', () => {
  const got = merge(
    { tasks: [{ id: 'local', t: 'Local task', updatedAt: 200 }] },
    { tasks: [{ id: 'remote', t: 'Remote task', updatedAt: 100 }] }
  );
  assert.deepEqual(got.tasks.map(t => t.id).sort(), ['local', 'remote']);
});

test('newer cloud task edit wins over an older local version', () => {
  const got = merge(
    { tasks: [{ id: 'same', t: 'stale local', updatedAt: 100 }] },
    { tasks: [{ id: 'same', t: 'newer cloud', updatedAt: 500 }] }
  );
  assert.equal(got.tasks[0].t, 'newer cloud');
});

test('deletion tombstones remain deleted across devices', () => {
  const got = merge(
    { tasks: [{ id: 'same', t: 'visible', updatedAt: 100 }] },
    { tasks: [{ id: 'same', del: true, delAt: 500, updatedAt: 500 }] }
  );
  assert.equal(got.tasks[0].del, true);
});

test('different daily records survive the merge', () => {
  const got = merge(
    { days: { '2026-11-15': { j: 'Local' } } },
    { days: { '2026-11-16': { j: 'Remote' } } }
  );
  assert.deepEqual(Object.keys(got.days).sort(), ['2026-11-15', '2026-11-16']);
});

test('cloud pull failure cannot enable writes before a successful merge', () => {
  const head = html.indexOf("if(res.status === 'error' || res.status === 'offline'){");
  const tail = html.indexOf("if(res.status === 'ok'", head);
  assert.ok(head > 0 && tail > head, 'cloud failure branch exists');
  const failureBranch = html.slice(head, tail);
  assert.match(failureBranch, /syncReady\s*=\s*false/);
  assert.doesNotMatch(failureBranch, /syncReady\s*=\s*true/);
  assert.match(html, /async function flushSync\(\)\s*\{[\s\S]*?if\(!syncReady\) return/);
  assert.match(html, /async function syncFull\(silent\)\s*\{[\s\S]*?syncReady\s*=\s*false/);
});

test('JSON export covers every data section present in cloud snapshots', () => {
  const exportStart = html.indexOf('function doExportJSON(){');
  const exportEnd = html.indexOf('function csvCell(', exportStart);
  assert.ok(exportStart > 0 && exportEnd > exportStart);
  const exportCode = html.slice(exportStart, exportEnd);
  for (const section of ['days', 'tasks', 'exps', 'obls', 'revs', 'goals', 'bhData', 'settings', 'challenges', 'notes']) {
    assert.match(exportCode, new RegExp('\\b' + section + '\\b'), section);
  }
});

test('backup import restores notes/challenges and keeps old-backup compatibility', () => {
  const start = html.indexOf("$('#importFile').onchange");
  const end = html.indexOf('/* ================= banners', start);
  assert.ok(start > 0 && end > start);
  const importer = html.slice(start, end);
  assert.match(importer, /Array\.isArray\(data\.notes\)/);
  assert.match(importer, /Array\.isArray\(data\.challenges\)/);
});
