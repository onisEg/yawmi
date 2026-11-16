"use strict";
(() => {
  // src/features/notes/note-model.ts
  (function initYawmiNoteModel(host) {
    "use strict";
    function listVisible(notes, query = "") {
      const q = String(query).trim().toLowerCase();
      const results = notes.filter((n) => !n.del && (!q || ((n.t || "") + " " + (n.body || "")).toLowerCase().includes(q)));
      return results.sort((a, b) => {
        if (!!b.pinned !== !!a.pinned) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
        return (b.u || 0) - (a.u || 0);
      });
    }
    host.YawmiNoteModel = Object.freeze({ listVisible });
  })(typeof window !== "undefined" ? window : globalThis);
})();
