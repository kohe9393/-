import { el } from '../util.js';
import { icons } from '../icons.js';
import { startStudy, topbar } from './common.js';
import { openWordSheet } from './word-sheet.js';

export function render(ctx) {
  const { store, go, params, refresh } = ctx;
  const { summary, kind = 'swipe', deck = 'all', mode = 'smart' } = params;
  if (!summary) {
    queueMicrotask(() => go('home'));
    return { el: el('div') };
  }
  const pct = Math.round(summary.accuracy * 100);
  const missed = summary.missed.filter((m) => store.word(m.id));

  const hero = el(
    'section',
    { class: 'panel result-hero' },
    el('p', { class: 'eyebrow' }, '一発正解率'),
    el('p', { class: 'result-score' }, pct, el('small', {}, '%')),
    el('p', { class: 'result-sub' }, `${summary.total}語中 ${summary.firstTry}語を一発で正解`),
    summary.answers > summary.total && el('p', { class: 'small muted' }, `まちがえた単語の再出題を含めて ${summary.answers}回 答えました`),
  );

  const note = el(
    'p',
    { class: 'result-note' },
    missed.length
      ? `まちがえた${missed.length}語は苦手リストに入りました。次回の「おまかせ」で優先して出題され、覚えるまで間隔を短くして繰り返します。`
      : 'すべて一発で正解しました。正解した単語は、忘れかけたころにまた出題されます。',
  );

  const list =
    missed.length > 0 &&
    el(
      'section',
      { class: 'section' },
      el('div', { class: 'section-head' }, el('h2', {}, 'まちがえた単語')),
      el(
        'ul',
        { class: 'list panel' },
        missed.map((m) => {
          const word = store.word(m.id);
          return el(
            'li',
            {},
            el(
              'button',
              { class: 'row', onclick: () => openWordSheet(store, { wordId: word.id, onChange: refresh }) },
              el('span', { class: 'row-main' }, el('span', { class: 'row-term' }, word.term), el('span', { class: 'row-meaning' }, word.meaning)),
              el(
                'span',
                { class: 'row-side' },
                el('span', { class: 'tag tag-again' }, `ミス ${m.misses}回`),
                m.recovered && el('span', { class: 'tag tag-good' }, '最後は正解'),
              ),
            ),
          );
        }),
      ),
    );

  const actions = el(
    'div',
    { class: 'steps' },
    missed.length > 0 &&
      el(
        'button',
        { class: 'btn btn-primary btn-block', onclick: () => startStudy(ctx, { kind, deck, mode, ids: missed.map((m) => m.id) }) },
        el('span', { html: icons.repeat }),
        'まちがえた単語をもう一度',
      ),
    el(
      'div',
      { class: 'btn-row' },
      el('button', { class: `btn${missed.length ? '' : ' btn-primary'}`, onclick: () => startStudy(ctx, { kind, deck, mode }) }, '続けて学習'),
      el('button', { class: 'btn', onclick: () => startStudy(ctx, { kind: kind === 'swipe' ? 'quiz' : 'swipe', deck, mode }) }, kind === 'swipe' ? 'クイズで確認' : 'スワイプで復習'),
    ),
    el('button', { class: 'btn btn-block', onclick: () => go('home') }, 'ホームへ'),
  );

  return {
    el: el('div', { class: 'page' }, topbar('おつかれさまでした', { actions: [el('button', { class: 'icon-btn', 'aria-label': 'ホームへ', onclick: () => go('home'), html: icons.close })] }), hero, note, list, actions),
  };
}
