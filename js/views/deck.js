import { el, downloadText, relativeDays, normalizeText } from '../util.js';
import { icons } from '../icons.js';
import { masteryBar, promptDialog, confirmDialog, toast } from '../ui.js';
import { overview } from '../analytics.js';
import { mastery, isWeak, MASTERY } from '../srs.js';
import { startButtons, topbar } from './common.js';
import { openWordSheet } from './word-sheet.js';
import { exportSheet } from './settings.js';

const FILTERS = [
  { id: 'all', label: 'すべて' },
  { id: 'weak', label: '苦手' },
  { id: 'new', label: '未学習' },
  { id: 'learning', label: '学習中' },
  { id: 'review', label: '定着中' },
  { id: 'mastered', label: 'マスター' },
];
const PAGE = 150;

export function render(ctx) {
  const { store, go, params, refresh } = ctx;
  const deck = store.deck(params.id);
  if (!deck) {
    queueMicrotask(() => go('decks'));
    return { el: el('div') };
  }

  let filter = params.filter || 'all';
  let query = '';
  let shown = PAGE;

  const ov = overview(deck.words, store.getState, store.data.daily);
  const summary = el(
    'section',
    { class: 'panel panel-pad section' },
    masteryBar(ov.counts, ov.total, { large: true }),
    el(
      'div',
      { class: 'deck-meta' },
      el('span', {}, el('b', {}, ov.total), '語'),
      el('span', {}, '復習の時期 ', el('b', {}, ov.due)),
      el('span', {}, '苦手 ', el('b', {}, ov.weak)),
      el('span', {}, 'マスター ', el('b', {}, ov.counts.mastered)),
    ),
    startButtons(ctx, { deck: deck.id, mode: 'smart' }),
  );

  const addRow = el(
    'div',
    { class: 'btn-row' },
    el('button', { class: 'btn', onclick: () => openWordSheet(store, { deckId: deck.id, onChange: refresh }) }, el('span', { html: icons.plus }), '単語を追加'),
    el('button', { class: 'btn', onclick: () => go('import', { deck: deck.id }) }, el('span', { html: icons.upload }), 'まとめて追加'),
  );

  const list = el('ul', { class: 'list panel' });
  const more = el('button', { class: 'btn btn-sm', hidden: true, onclick: () => ((shown += PAGE), renderList()) }, 'もっと見る');
  const countLabel = el('span', { class: 'muted small' });

  const search = el(
    'label',
    { class: 'search' },
    el('span', { html: icons.search }),
    el('input', {
      class: 'input',
      id: 'deck-search',
      type: 'search',
      placeholder: '単語・意味で検索',
      'aria-label': '単語・意味で検索',
      oninput: (e) => {
        query = normalizeText(e.target.value);
        shown = PAGE;
        renderList();
      },
    }),
  );

  const chipButtons = FILTERS.map((f) =>
    el(
      'button',
      {
        class: 'chip',
        type: 'button',
        'aria-pressed': String(f.id === filter),
        onclick: () => {
          filter = f.id;
          shown = PAGE;
          chipButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(FILTERS[i].id === filter)));
          renderList();
        },
      },
      f.label,
    ),
  );

  function matches(word) {
    const s = store.state(word.id);
    if (filter === 'weak' && !isWeak(s)) return false;
    if (filter !== 'all' && filter !== 'weak' && mastery(s) !== filter) return false;
    if (query && !normalizeText(`${word.term} ${word.meaning}`).includes(query)) return false;
    return true;
  }

  function row(word) {
    const s = store.state(word.id);
    const m = mastery(s);
    const side = s?.seen
      ? [el('span', { class: 'num' }, `${s.correct}/${s.seen} 正解`), el('span', {}, `次 ${relativeDays(s.due)}`)]
      : [el('span', {}, '未学習')];
    return el(
      'li',
      {},
      el(
        'button',
        { class: 'row', onclick: () => openWordSheet(store, { wordId: word.id, onChange: refresh }) },
        el('span', { class: 'dot', dataset: { m }, title: MASTERY[m].label }),
        el(
          'span',
          { class: 'row-main' },
          el('span', { class: 'row-term' }, word.term, isWeak(s) ? el('span', { class: 'tag tag-mark', style: { marginLeft: '8px' } }, '苦手') : null),
          el('span', { class: 'row-meaning' }, word.meaning),
        ),
        el('span', { class: 'row-side' }, side),
      ),
    );
  }

  function renderList() {
    const hits = deck.words.filter(matches);
    countLabel.textContent = `${hits.length}語`;
    list.replaceChildren(...(hits.length ? hits.slice(0, shown).map(row) : [el('li', { class: 'empty' }, '該当する単語はありません')]));
    more.hidden = hits.length <= shown;
  }
  renderList();

  const manage = el(
    'section',
    { class: 'section' },
    el('div', { class: 'section-head' }, el('h2', {}, '単語帳の管理')),
    el(
      'div',
      { class: 'btn-row' },
      el('button', { class: 'btn btn-sm', onclick: rename }, el('span', { html: icons.edit }), '名前を変更'),
      el('button', { class: 'btn btn-sm', onclick: exportCSV }, el('span', { html: icons.download }), 'CSVで書き出す'),
      el('button', { class: 'btn btn-sm', onclick: resetStats }, '学習記録をリセット'),
      el('button', { class: 'btn btn-sm btn-danger', onclick: remove }, el('span', { html: icons.trash }), '単語帳を削除'),
    ),
  );

  async function rename() {
    const name = await promptDialog({ title: '単語帳の名前', label: '名前', value: deck.name });
    if (name) {
      store.renameDeck(deck.id, name);
      refresh();
    }
  }

  function exportCSV() {
    const csv = store.exportDeckCSV(deck.id);
    exportSheet({
      title: 'CSVで書き出す',
      text: csv,
      filename: `${deck.name}.csv`,
      type: 'text/csv',
      // Excel で文字化けしないように BOM を付ける
      download: () => downloadText(`${deck.name}.csv`, `﻿${csv}`, 'text/csv'),
    });
  }

  async function resetStats() {
    const ok = await confirmDialog({ title: '学習記録をリセットしますか？', body: `「${deck.name}」の${deck.words.length}語がすべて未学習に戻ります。単語は消えません。`, ok: 'リセット', danger: true });
    if (!ok) return;
    store.resetStats(deck.words.map((w) => w.id));
    toast('学習記録をリセットしました');
    refresh();
  }

  async function remove() {
    const ok = await confirmDialog({ title: `「${deck.name}」を削除しますか？`, body: `${deck.words.length}語と学習記録がすべて消えます。元に戻せません。`, ok: '削除する', danger: true });
    if (!ok) return;
    store.deleteDeck(deck.id);
    toast('単語帳を削除しました');
    go('decks');
  }

  return {
    el: el(
      'div',
      { class: 'page' },
      topbar(deck.name, { back: () => go('decks') }),
      summary,
      addRow,
      el(
        'section',
        { class: 'section' },
        el('div', { class: 'section-head' }, el('h2', {}, '単語一覧'), countLabel),
        search,
        el('div', { class: 'chips', role: 'group', 'aria-label': '絞り込み' }, chipButtons),
        list,
        more,
      ),
      manage,
    ),
  };
}

