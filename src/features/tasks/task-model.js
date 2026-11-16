/* Pure task selectors. UI, storage, Supabase and notifications live elsewhere.
   Exposed through a browser namespace until the legacy inline app becomes ESM. */
(function initYawmiTaskModel(host) {
  'use strict';

  function groupTasks(items, { today, yesterday, query = '' }) {
    const q = String(query).trim().toLowerCase();
    const match = task => !q || (task.t || '').toLowerCase().includes(q);
    const visible = task => !task.del && match(task);
    return [
      {name:'متأخرة (أكتر من يوم)', cls:'late', items: items.filter(t => visible(t) && !t.done && t.due && t.due < yesterday)},
      {name:'أمس', cls:'late', items: items.filter(t => visible(t) && !t.done && t.due === yesterday)},
      {name:'النهارده', cls:'', items: items.filter(t => visible(t) && !t.done && t.due === today)},
      {name:'قادمة', cls:'', items: items.filter(t => visible(t) && !t.done && t.due && t.due > today)},
      {name:'من غير تاريخ', cls:'', items: items.filter(t => visible(t) && !t.done && !t.due)},
      {name:'مكتملة', cls:'', items: items.filter(t => visible(t) && t.done)}
    ];
  }

  function sortTasks(items) {
    const priority = t => (t.urgent ? 2 : 0) + (t.important ? 1 : 0);
    const added = t => typeof t.id === 'number' ? t.id : 0;
    const manual = items.some(t => typeof t.order === 'number');
    // Sort only the filtered group array; never rewrite the persisted task list.
    return items.sort((a,b) => {
      if (manual) {
        const ao = typeof a.order === 'number' ? a.order : 9999;
        const bo = typeof b.order === 'number' ? b.order : 9999;
        if (ao !== bo) return ao - bo;
      }
      if (priority(b) !== priority(a)) return priority(b) - priority(a);
      return added(b) - added(a);
    });
  }

  host.YawmiTaskModel = Object.freeze({ groupTasks, sortTasks });
})(typeof window !== 'undefined' ? window : globalThis);
