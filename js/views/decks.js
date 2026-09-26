import { el } from '../util.js';
import { icons } from '../icons.js';
import { masteryBar, toast } from '../ui.js';
import { overview } from '../analytics.js';
import { SAMPLE_NAME, SAMPLE_WORDS } from '../sample.js';
import { topbar } from './common.js';

export function render({ store, go }) {
  const importBtn = el('button', { class: 'btn btn-primary btn-sm', onclick: () => go('import') }, el('span', { html: icons.plus }), '読み込む');

  const cards = store.decks.map((deck) => {
    const ov = overview(deck.words, store.getState, store.data.daily);
    return el(
      'button',
      { class: 'deck-card', onclick: () => go('deck', { id: deck.id }) },
      el('h3', {}, deck.name),
      masteryBar(ov.counts, ov.total),
      el(
        'div',
        { class: 'deck-meta' },
        el('span', {}, el('b', {}, ov.total), '語'),
        el('span', {}, '復習 ', el('b', {}, ov.due)),
        el('span', {}, '苦手 ', el('b', {}, ov.weak)),
        el('span', {}, 'マスター ', el('b', {}, ov.counts.mastered)),
      ),
    );
  });

  const hasSample = store.decks.some((d) => d.name === SAMPLE_NAME);
  const addSample = () => {
    store.createDeck(SAMPLE_NAME, SAMPLE_WORDS);
    toast('サンプルの単語帳を追加しました');
    go('decks');
  };

  return {
    el: el(
      'div',
      { class: 'page' },
      topbar('単語帳', { actions: [importBtn] }),
      cards.length
        ? el('div', { class: 'deck-list' }, cards)
        : el(
            'div',
            { class: 'panel empty' },
            el('p', {}, 'まだ単語帳がありません。'),
            el('button', { class: 'btn btn-primary', onclick: () => go('import') }, '単語帳を読み込む'),
          ),
      !hasSample && el('button', { class: 'link-btn', onclick: addSample }, 'サンプルの単語帳を追加する'),
    ),
  };
}
