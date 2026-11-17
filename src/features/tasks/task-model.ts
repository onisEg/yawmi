/** Pure task grouping/sorting. This TS source compiles to the classic browser script.
 * No access to localStorage, Supabase, the DOM or platform APIs. */
import type { TaskRecord } from '../../types/domain';

interface DateBuckets {
  today: string;
  yesterday: string;
  query?: string;
}
interface TaskGroup<T extends TaskRecord> {
  name: string;
  cls: string;
  items: T[];
}
(function initYawmiTaskModel(host: typeof globalThis) {
  'use strict';

  function groupTasks<T extends TaskRecord>(items: ReadonlyArray<T>, { today, yesterday, query = '' }: DateBuckets): TaskGroup<T>[] {
    const q = String(query).trim().toLowerCase();
    const match = (task: T): boolean => !q || (task.t || '').toLowerCase().includes(q);
    const visible = (task: T): boolean => !task.del && match(task);
    return [
      {name:'متأخرة (أكتر من يوم)', cls:'late', items: items.filter(t => visible(t) && !t.done && t.due && t.due < yesterday)},
      {name:'أمس', cls:'late', items: items.filter(t => visible(t) && !t.done && t.due === yesterday)},
      {name:'النهارده', cls:'', items: items.filter(t => visible(t) && !t.done && t.due === today)},
      {name:'قادمة', cls:'', items: items.filter(t => visible(t) && !t.done && t.due && t.due > today)},
      {name:'من غير تاريخ', cls:'', items: items.filter(t => visible(t) && !t.done && !t.due)},
      {name:'مكتملة', cls:'', items: items.filter(t => visible(t) && t.done)}
    ];
  }

  function sortTasks<T extends TaskRecord>(items: T[]): T[] {
    const priority = (t: T): number => (t.urgent ? 2 : 0) + (t.important ? 1 : 0);
    const added = (t: T): number => typeof t.id === 'number' ? t.id : 0;
    const manual = items.some(t => typeof t.order === 'number');
    // Only the filtered group list is sorted, never the user's persisted tasks array.
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

  interface TaskModel {
    groupTasks: typeof groupTasks;
    sortTasks: typeof sortTasks;
  }

  (host as typeof globalThis & { YawmiTaskModel?: Readonly<TaskModel> })
    .YawmiTaskModel = Object.freeze({ groupTasks, sortTasks });
})(typeof window !== 'undefined' ? window : globalThis);
