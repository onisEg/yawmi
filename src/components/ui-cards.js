/* Shared DOM components. Set user-generated content with textContent, not HTML.
   Kept independent of storage and application features for reuse in other views. */
(function initYawmiComponents(host) {
  'use strict';

  function createNoteCard(note, { color, dateLabel, onOpen }) {
    const el = document.createElement('div');
    el.className = 'notecard' + (note.pinned ? ' pinned' : '');
    el.style.background = color.bg;
    el.style.borderColor = color.br;
    const title = (note.t || '').trim();
    const body = (note.body || '').trim();
    if (title) {
      const heading = document.createElement('div');
      heading.className = 'nctitle';
      heading.textContent = title;
      el.appendChild(heading);
    }
    if (body) {
      const paragraph = document.createElement('div');
      paragraph.className = 'ncbody';
      paragraph.textContent = body;
      el.appendChild(paragraph);
    }
    const date = document.createElement('div');
    date.className = 'ncdate';
    date.textContent = dateLabel;
    el.appendChild(date);
    el.onclick = () => onOpen(note);
    return el;
  }

  function createEmptyState({ icon, title, description }) {
    const wrapper = document.createElement('div');
    wrapper.className = 'empty-big';
    for (const [className, value] of [['ico',icon], ['ttl',title], ['desc',description]]) {
      const element = document.createElement('div');
      element.className = className;
      element.textContent = value;
      wrapper.appendChild(element);
    }
    // Match the legacy empty state markup: icon is a span, not a div.
    const ico = wrapper.firstChild;
    const span = document.createElement('span');
    span.className = ico.className;
    span.textContent = ico.textContent;
    wrapper.replaceChild(span, ico);
    return wrapper;
  }

  host.YawmiComponents = Object.freeze({ createNoteCard, createEmptyState });
})(typeof window !== 'undefined' ? window : globalThis);
