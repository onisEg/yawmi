import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=dirname(dirname(fileURLToPath(import.meta.url)));
const read=p=>readFileSync(join(root,p),'utf8');
const html=read('index.html');
const css=read('styles/liquid-glass.css');

test('Liquid Glass is an additive stylesheet loaded last and included offline/native',()=>{
  const links=[...html.matchAll(/<link rel="stylesheet" href="\.\/styles\/([^"]+)">/g)].map(m=>m[1]);
  assert.equal(links.at(-1),'liquid-glass.css');
  assert.ok(read('scripts/build-web.mjs').includes("'liquid-glass.css'"));
  assert.ok(read('sw.js').includes("'./styles/liquid-glass.css'"));
  assert.match(css,/:root\[data-theme="light"\]/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test('focus mini UI shares the existing persisted focus clock, without a second timer',()=>{
  for(const id of ['focusCardTitle','focusCardSub','focusMiniTask','focusMiniTime','focusMiniProgress','focusMiniStatus','focusQuickToggle'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/const FOCUS_KEY = 'yawmi_focus_runtime_v2'/);
  assert.match(html,/function renderFocusCard\(\)[\s\S]*?remainingFromDeadline\(focusState\.endsAt\)/);
  assert.match(html,/function updateFocusUI\(\)[\s\S]*?renderFocusCard\(\)/);
  assert.match(html,/function openFocus\(taskLabel\)[\s\S]*?syncFocusDurationButtons\(\)/);
  const close=html.slice(html.indexOf('function closeFocus(){'),html.indexOf('function syncFocusDurationButtons(){'));
  assert.doesNotMatch(close,/pauseFocus\(|resetFocus\(|cancelFocus\(/);
  assert.match(html,/focusQuickToggle\.onclick = \(\)=> focusState\.running \? pauseFocus\(\) : startFocus\(\)/);
});

test('no content was removed from existing navigation or major modules',()=>{
  for(const screen of ['today','tasks','notes','exp','dash','settings'])
    assert.ok(html.includes('data-tab="'+screen+'"'),screen);
  for(const anchor of ['id="focusOv"','id="tab-today"','id="tab-tasks"','id="tab-exp"','id="tab-notes"','id="tab-dash"','id="tab-settings"'])
    assert.ok(html.includes(anchor),anchor);
  assert.ok(html.includes('function syncFull('),'existing sync logic');
  assert.ok(html.includes('function doExportJSON('),'existing backup exporter');
});
