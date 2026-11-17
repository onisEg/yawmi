import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Yawmi v1 design loads after the existing premium layers',()=>{
 const html=readFileSync('index.html','utf8');
 const premium=html.indexOf('./styles/today-premium.css');
 const unified=html.indexOf('./styles/v1-unified.css');
 assert.ok(premium>0 && unified>premium);
 assert.match(html,/<section id="tab-today"/);
 assert.match(html,/id="focusCard"/);
});
test('v1 visual changes share the same surface and safe modes without altering data',()=>{
 const css=readFileSync('styles/v1-unified.css','utf8');
 assert.match(css,/--v1-surface/);
 assert.match(readFileSync('sw.js','utf8'),/\.\/styles\/v1-unified\.css/);
 assert.match(readFileSync('scripts/build-web.mjs','utf8'),/'v1-unified\.css'/);
 assert.match(css,/#tab-today \.card\.todaycard/);
 assert.match(css,/nav\.bottom/);
 assert.match(css,/prefers-reduced-transparency/);
 assert.match(css,/prefers-reduced-motion/);
 assert.doesNotMatch(css,/localStorage|sessionStorage|supabase|fetch\s*\(/i);
});
