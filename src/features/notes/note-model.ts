/** Pure note filtering/sorting: no mutation, storage calls or DOM side effects. */
import type { NoteRecord } from '../../types/domain';

interface NoteModel {
  listVisible: typeof listVisible;
}

(function initYawmiNoteModel(host: typeof globalThis) {
  'use strict';

  function listVisible<T extends NoteRecord>(notes: ReadonlyArray<T>, query = ''): T[] {
    const q = String(query).trim().toLowerCase();
    const results = notes.filter(n => !n.del && (!q || ((n.t || '') + ' ' + (n.body || '')).toLowerCase().includes(q)));
    return results.sort((a,b) => {
      if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return (b.u || 0) - (a.u || 0);
    });
  }

  (host as typeof globalThis & { YawmiNoteModel?: Readonly<NoteModel> })
    .YawmiNoteModel = Object.freeze({ listVisible });
})(typeof window !== 'undefined' ? window : globalThis);
