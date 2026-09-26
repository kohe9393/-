// 24×24 の線アイコン（固定文字列）

const wrap = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  home: wrap('<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>'),
  decks: wrap('<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3h10a3 3 0 0 1 3 3v10"/><circle cx="6.5" cy="10.5" r="1"/>'),
  chart: wrap('<path d="M3 20h18"/><path d="M6 20v-6"/><path d="M11 20V8"/><path d="M16 20v-9"/><path d="M20 20V4"/>'),
  settings: wrap('<path d="M4 7h9"/><path d="M17 7h3"/><circle cx="15" cy="7" r="2"/><path d="M4 17h3"/><path d="M11 17h9"/><circle cx="9" cy="17" r="2"/>'),
  close: wrap('<path d="M6 6l12 12"/><path d="M18 6L6 18"/>'),
  back: wrap('<path d="M15 5l-7 7 7 7"/>'),
  chevron: wrap('<path d="M9 5l7 7-7 7"/>'),
  speaker: wrap('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z"/><path d="M15.5 9a4 4 0 0 1 0 6"/><path d="M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  flip: wrap('<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5"/><path d="M20 4v4.5h-4.5"/><path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5"/><path d="M4 20v-4.5h4.5"/>'),
  check: wrap('<path d="M5 12.5l4.5 4.5L19 7"/>'),
  x: wrap('<path d="M7 7l10 10"/><path d="M17 7L7 17"/>'),
  plus: wrap('<path d="M12 5v14"/><path d="M5 12h14"/>'),
  upload: wrap('<path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M5 15v4h14v-4"/>'),
  download: wrap('<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 19h14"/>'),
  search: wrap('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.3-4.3"/>'),
  trash: wrap('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>'),
  edit: wrap('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
  copy: wrap('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
  swipe: wrap('<rect x="6" y="3" width="12" height="17" rx="2"/><path d="M2 10l2 2-2 2"/><path d="M22 10l-2 2 2 2"/>'),
  quiz: wrap('<circle cx="5" cy="6" r="1.5"/><path d="M9 6h11"/><circle cx="5" cy="12" r="1.5"/><path d="M9 12h11"/><circle cx="5" cy="18" r="1.5"/><path d="M9 18h11"/>'),
  target: wrap('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8"/>'),
  flame: wrap('<path d="M12 3c.8 3.6 5 5 5 10a5 5 0 0 1-10 0c0-2.4 1.3-3.9 2.4-5 .2 1.8 1 2.8 2 3.1C11 8.4 10.8 5.6 12 3z"/>'),
  repeat: wrap('<path d="M17 2l3 3-3 3"/><path d="M20 5H9a5 5 0 0 0-5 5v1"/><path d="M7 22l-3-3 3-3"/><path d="M4 19h11a5 5 0 0 0 5-5v-1"/>'),
};
