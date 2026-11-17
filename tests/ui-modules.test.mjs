import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const load = path => readFileSync(join(root, path), 'utf8');
const html = load('index.html');

function namespace(path, property, context = {}) {
  const sandbox = { window: {}, ...context };
  vm.runInNewContext(load(path), sandbox, { timeout: 1000, filename: path });
  assert.ok(sandbox.window[property], property + ' must be initialized');
  return sandbox.window[property];
}
const plain = value => JSON.parse(JSON.stringify(value));

test('tasks are grouped by exact legacy date buckets without mutating stored tasks', () => {
  const model = namespace('src/features/tasks/task-model.js', 'YawmiTaskModel');
  const tasks = [
    { id:1, t:'Too old', due:'2026-11-10', done:false },
    { id:2, t:'Yesterday', due:'2026-11-15', done:false },
    { id:3, t:'Today', due:'2026-11-16', done:false },
    { id:4, t:'Tomorrow', due:'2026-11-17', done:false },
    { id:5, t:'Undated', due:'', done:false },
    { id:6, t:'Completed', due:'2026-11-16', done:true },
    { id:7, t:'Deleted', due:'2026-11-16', done:false, del:true }
  ];
  const before = JSON.stringify(tasks);
  const groups = model.groupTasks(tasks, { today:'2026-11-16', yesterday:'2026-11-15' });
  assert.deepEqual(plain(groups.map(g=>g.items.map(t=>t.id))), [[1],[2],[3],[4],[5],[6]]);
  assert.deepEqual(plain(groups.map(g=>g.name)), [
    'متأخرة (أكتر من يوم)', 'أمس', 'النهارده', 'قادمة', 'من غير تاريخ', 'مكتملة'
  ]);
  assert.equal(JSON.stringify(tasks), before);
});

test('task search is case-insensitive and excludes trash', () => {
  const { groupTasks } = namespace('src/features/tasks/task-model.js', 'YawmiTaskModel');
  const data=[{id:1,t:'Write README',due:''},{id:2,t:'write test',due:''},{id:3,t:'Write trash',del:true}];
  const ids=groupTasks(data,{today:'2026-11-16',yesterday:'2026-11-15',query:'WRITE'})
    .flatMap(g=>g.items.map(t=>t.id));
  assert.deepEqual(plain(ids),[1,2]);
});

test('task manual order, then priority, then most recent ID matches legacy behavior', () => {
  const { sortTasks } = namespace('src/features/tasks/task-model.js', 'YawmiTaskModel');
  const stored=[
    {id:10,t:'one',urgent:true,important:true},
    {id:20,t:'two',important:true},
    {id:30,t:'three',urgent:true,important:true}
  ];
  const sorted=sortTasks([...stored]);
  assert.deepEqual(plain(sorted.map(t=>t.id)),[30,10,20]);
  const manual=sortTasks([{id:1,order:10},{id:2,order:1},{id:3,order:1,urgent:true}]);
  assert.deepEqual(plain(manual.map(t=>t.id)),[3,2,1]);
  assert.deepEqual(stored.map(t=>t.id),[10,20,30]);
});

test('note selectors keep pinned notes first, order newest next, and filter deleted notes', () => {
  const { listVisible } = namespace('src/features/notes/note-model.js', 'YawmiNoteModel');
  const data=[
    {id:'a',t:'old',u:10},
    {id:'b',t:'new',u:30},
    {id:'c',t:'pinned',pinned:true,u:1},
    {id:'d',t:'deleted',del:true,u:500}
  ];
  const result=listVisible(data,'');
  assert.deepEqual(plain(result.map(n=>n.id)),['c','b','a']);
  assert.deepEqual(data.map(n=>n.id),['a','b','c','d']);
});

test('note search checks title and body without changing original notes', () => {
  const { listVisible } = namespace('src/features/notes/note-model.js', 'YawmiNoteModel');
  const notes=[{id:'n1',t:'Garden',body:'Flowers'}, {id:'n2',t:'Read',body:'JAVASCRIPT'}];
  assert.deepEqual(plain(listVisible(notes,' javascript ').map(n=>n.id)),['n2']);
  assert.deepEqual(plain(listVisible(notes,'garden').map(n=>n.id)),['n1']);
});

class TestElement {
  constructor(tag) { this.tagName=tag; this.children=[]; this.style={}; this.className=''; this.textContent=''; this.onclick=null; }
  appendChild(child) { this.children.push(child); return child; }
  get firstChild() { return this.children[0]; }
  replaceChild(replacement,previous) {
    const index=this.children.indexOf(previous);
    assert.ok(index>=0);
    this.children[index]=replacement;
  }
}
test('note-card component renders user text as textContent, not HTML injection', () => {
  const component=namespace('src/components/ui-cards.js','YawmiComponents',{
    document:{ createElement: tag=>new TestElement(tag) }
  });
  let clicked=null;
  const note={id:'n',t:'<img src=x onerror=alert(1)>',body:'<script>bad</script>',pinned:true};
  const card=component.createNoteCard(note,{color:{bg:'#fff',br:'#aaa'},dateLabel:'النهارده',onOpen:n=>{clicked=n;}});
  assert.equal(card.className,'notecard pinned');
  assert.deepEqual(card.children.map(n=>n.className),['nctitle','ncbody','ncdate']);
  assert.equal(card.children[0].textContent,note.t);
  assert.equal(card.children[1].textContent,note.body);
  card.onclick();
  assert.equal(clicked,note);
});

test('empty-state component preserves legacy CSS classes and Arabic labels', () => {
  const ui=namespace('src/components/ui-cards.js','YawmiComponents',{
    document:{ createElement: tag=>new TestElement(tag) }
  });
  const node=ui.createEmptyState({icon:'📝',title:'مفيش مهام دلوقتي',description:'ضيف أول مهمة'});
  assert.equal(node.className,'empty-big');
  assert.equal(node.children[0].tagName,'span');
  assert.deepEqual(node.children.map(x=>x.className),['ico','ttl','desc']);
});

test('all stylesheets are linked in cascade order and packaged unchanged', () => {
  const styles=['tokens','layout','features','components','overlays','liquid-glass','today-premium'];
  const head=html.split('</head>')[0];
  assert.doesNotMatch(head,/<style>/);
  let lastIndex=-1;
  for(const name of styles) {
    const url='./styles/'+name+'.css';
    const markup='<link rel="stylesheet" href="'+url+'">';
    const index=head.indexOf(markup);
    assert.ok(index>lastIndex,'CSS order mismatch for '+name);
    lastIndex=index;
    assert.ok(existsSync(join(root,url)));
    assert.equal(load('styles/'+name+'.css'),load('dist/styles/'+name+'.css'));
  }
});

test('classic task/note/component scripts load before legacy inline app and are included offline', () => {
  const appPos=html.indexOf('<script>\n/* ================= state ================= */');
  assert.ok(appPos>0);
  const assets=[
    'src/features/focus/focus-clock.js',
    'src/features/tasks/task-model.js',
    'src/features/notes/note-model.js',
    'src/components/ui-cards.js',
    ...['tokens','layout','features','components','overlays','liquid-glass','today-premium'].map(n=>'styles/'+n+'.css')
  ];
  const serviceWorker=load('sw.js');
  assert.match(serviceWorker,/yawmi-v193-apk-only-native-updates/);
  for(const asset of assets) {
    assert.ok(html.includes('./'+asset), 'HTML missing '+asset);
    if(asset.endsWith('.js')) {
      assert.ok(html.indexOf('./'+asset)<appPos, 'Legacy app ran before '+asset);
    }
    assert.ok(existsSync(join(root,'dist',asset)), 'Android missing '+asset);
    assert.ok(serviceWorker.includes('./'+asset), 'PWA precache missing '+asset);
  }
});

test('habits have a premium progress surface without changing stored habit controls', () => {
  const css=load('styles/today-premium.css');
  assert.match(html,/class="card todaycard premium-habits" data-cid="habits"/);
  for(const id of ['habitChips','badHabitWrap','habitProgressTrack','habitProgressText','habitProgressFill']) {
    assert.ok(html.includes('id="'+id+'"'),'Missing stable habit visual '+id);
  }
  assert.match(html,/settings\.habits\.filter\(name => !!rec\.h\[name\]\)\.length/);
  assert.match(html,/setAttribute\('aria-valuenow', String\(habitPct\)\)/);
  assert.match(css,/\.premium-habits #habitChips \.chip\.on::before/);
  assert.match(css,/\.premium-habits \.premium-habit-progress-track/);
  assert.match(css,/:root\[data-theme="dark"\] #tab-today \.premium-habits/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
