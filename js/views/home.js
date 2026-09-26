import { el } from '../util.js';
import { icons } from '../icons.js';
import { segmented, toast } from '../ui.js';
import { countToday, STUDY_MODES } from '../queue.js';
import { streakDays, weakList } from '../analytics.js';
import { SAMPLE_NAME, SAMPLE_WORDS } from '../sample.js';
import { deckChips, startButtons } from './common.js';
import { openWordSheet } from './word-sheet.js';

export function render(ctx) {
  const { store, go } = ctx;
  if (!store.decks.length) return { el: welcome(ctx) };

  const settings = store.settings;
  let deck = store.deck(settings.deck) ? settings.deck : 'all';
  let mode = STUDY_MODES[settings.mode] ? settings.mode : 'smart';

  const streak = streakDays(store.data.daily);
  const header = el(
    'header',
    { class: 'topbar' },
    el('h1', { class: 'brand' }, 'めくる単語帳'),
    streak > 0 && el('span', { class: 'streak', title: '連続学習日数' }, el('span', { html: icons.flame }), `${streak}日連続`),
  );

  const counts = el('div', { class: 'today-counts' });
  const buttonsSlot = el('div');
  const hint = el('p', { class: 'mode-hint' });
  const weakSlot = el('div', { class: 'section' });

  const today = el(
    'section',
    { class: 'panel today', 'aria-label': '今日の学習' },
    el('p', { class: 'eyebrow' }, '今日の学習'),
    counts,
    store.decks.length > 1 &&
      deckChips({
        decks: store.decks,
        value: deck,
        onChange: (id) => {
          deck = id;
          store.setSetting('deck', id);
          update();
        },
      }),
    segmented({
      label: '出題のしかた',
      value: mode,
      options: Object.entries(STUDY_MODES).map(([value, m]) => ({ value, label: m.label })),
      onChange: (v) => {
        mode = v;
        store.setSetting('mode', v);
        update();
      },
    }),
    hint,
    buttonsSlot,
  );

  function count(label, n, tone) {
    return el('div', { class: 'count', dataset: tone ? { tone } : {} }, el('b', {}, n, el('small', {}, '語')), el('span', {}, label));
  }

  function update() {
    const words = store.words(deck);
    const c = countToday(words, store.getState);
    counts.replaceChildren(count('復習', c.due, 'accent'), count('苦手', c.weak, 'again'), count('未学習', c.fresh));
    hint.textContent = STUDY_MODES[mode].hint;
    buttonsSlot.replaceChildren(startButtons(ctx, { deck, mode }));
    renderWeak(words);
  }

  function renderWeak(words) {
    const weak = weakList(words, store.getState, { limit: 5 });
    const head = el(
      'div',
      { class: 'section-head' },
      el('h2', {}, '苦手な単語'),
      el('button', { class: 'link-btn', onclick: () => go('stats') }, '分析を見る'),
    );
    if (!weak.length) {
      weakSlot.replaceChildren(head, el('p', { class: 'panel panel-pad muted small' }, 'まだ苦手な単語はありません。学習してまちがえた単語がここに集まります。'));
      return;
    }
    const list = el(
      'ul',
      { class: 'list panel' },
      weak.map(({ word, reasons }) =>
        el(
          'li',
          {},
          el(
            'button',
            { class: 'row', onclick: () => openWordSheet(store, { wordId: word.id, onChange: update }) },
            el(
              'div',
              { class: 'row-main' },
              el('span', { class: 'row-term' }, word.term),
              el('span', { class: 'row-meaning' }, word.meaning),
              el('div', { class: 'tags' }, reasons.slice(0, 2).map((r) => el('span', { class: r.kind === 'confused' || r.kind === 'similar' ? 'tag tag-mark' : 'tag tag-again' }, r.text))),
            ),
            el('span', { class: 'chev', html: icons.chevron }),
          ),
        ),
      ),
    );
    weakSlot.replaceChildren(head, list);
  }

  update();
  return { el: el('div', { class: 'page' }, header, today, weakSlot) };
}

function welcome({ store, go }) {
  return el(
    'div',
    { class: 'page' },
    el('header', { class: 'topbar' }, el('h1', { class: 'brand' }, 'めくる単語帳')),
    el(
      'section',
      { class: 'panel welcome' },
      el('p', { class: 'eyebrow' }, 'はじめに'),
      el('h2', {}, '自分の単語帳で、めくって覚える'),
      el('p', { class: 'muted' }, 'Excel やメモアプリにある単語リストを貼り付けるだけで始められます。'),
      el(
        'ol',
        {},
        el('li', {}, '単語帳を読み込む（CSV・テキスト・貼り付け）'),
        el('li', {}, 'スワイプか4択クイズで学習する'),
        el('li', {}, 'まちがえた単語は分析して、覚えるまで何度も出題'),
      ),
      el(
        'div',
        { class: 'btn-row' },
        el('button', { class: 'btn btn-primary', onclick: () => go('import') }, el('span', { html: icons.upload }), '単語帳を読み込む'),
        el(
          'button',
          {
            class: 'btn',
            onclick: () => {
              store.createDeck(SAMPLE_NAME, SAMPLE_WORDS);
              toast('サンプルの単語帳を追加しました');
              go('home');
            },
          },
          'サンプルで試す',
        ),
      ),
    ),
  );
}
