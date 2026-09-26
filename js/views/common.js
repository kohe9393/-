// 複数の画面で使う部品

import { el } from '../util.js';
import { icons } from '../icons.js';
import { toast, confirmDialog } from '../ui.js';
import { buildQueue } from '../queue.js';
import { Session } from '../session.js';
import { isWeak, mastery, MASTERY } from '../srs.js';

const EMPTY_MESSAGES = {
  smart: 'この単語帳にはまだ単語がありません',
  weak: '苦手な単語はまだありません。まずは「おまかせ」で学習しましょう',
  new: '新しい単語はもうありません。すべて一度は学習済みです',
  random: 'この単語帳にはまだ単語がありません',
};

export function isJapanese(text) {
  return /[぀-ヿ一-鿿ｦ-ﾟ]/.test(String(text));
}

/** 全角は2、半角は1として数えた長さ */
export function visualLength(text) {
  let n = 0;
  for (const ch of String(text)) n += ch.charCodeAt(0) > 0xff ? 2 : 1;
  return n;
}

export function lengthClass(text) {
  const n = visualLength(text);
  if (n > 44) return ' is-very-long';
  if (n > 18) return ' is-long';
  return '';
}

export function quizPool(store, deck) {
  const own = store.words(deck);
  return own.length >= 4 ? own : store.words('all');
}

export function previewCount(store, deck, mode) {
  const s = store.settings;
  return buildQueue(store.words(deck), store.getState, { mode, limit: s.sessionSize, newLimit: s.newPerSession }).length;
}

export function startStudy({ store, go }, { kind, deck = 'all', mode = 'smart', ids = null }) {
  const s = store.settings;
  const queue = ids
    ? ids.filter((id) => store.word(id))
    : buildQueue(store.words(deck), store.getState, { mode, limit: s.sessionSize, newLimit: s.newPerSession });
  if (!queue.length) {
    toast(EMPTY_MESSAGES[mode] || '出題できる単語がありません');
    return false;
  }
  if (kind === 'quiz' && quizPool(store, deck).length < 2) {
    toast('4択クイズには2語以上必要です。スワイプで始めます');
    kind = 'swipe';
  }
  go(kind, { session: new Session(queue, { requeueGap: s.requeueGap }), deck, mode });
  return true;
}

export function studyHeader(onClose) {
  const fill = el('span');
  const count = el('span', { class: 'study-count' });
  const progress = el('div', { class: 'progress', role: 'progressbar', 'aria-label': '覚えた数', 'aria-valuemin': '0' }, fill);
  const node = el(
    'div',
    { class: 'study-head' },
    el('button', { class: 'icon-btn', 'aria-label': '学習をやめる', onclick: onClose, html: icons.close }),
    progress,
    count,
  );
  return {
    el: node,
    update(session) {
      const pct = session.total ? (session.cleared / session.total) * 100 : 0;
      fill.style.width = `${pct}%`;
      progress.setAttribute('aria-valuemax', String(session.total));
      progress.setAttribute('aria-valuenow', String(session.cleared));
      count.textContent = `${session.cleared} / ${session.total}`;
    },
  };
}

export async function confirmExit(ctx, session, extra) {
  if (!session.log.length) {
    ctx.go('home');
    return;
  }
  const ok = await confirmDialog({
    title: '学習を終わりますか？',
    body: 'ここまでの回答は記録されています。',
    ok: '終わる',
    cancel: '続ける',
  });
  if (ok) ctx.go('result', { summary: session.summary(), ...extra });
}

/** カードやクイズの上に出す小さなラベル */
export function cardTags(state, { retry = false } = {}) {
  const tags = [];
  if (retry) tags.push(el('span', { class: 'tag tag-again' }, 'もう一度'));
  else if (!state?.seen) tags.push(el('span', { class: 'tag' }, 'はじめて'));
  else if (isWeak(state)) tags.push(el('span', { class: 'tag tag-mark' }, '苦手'));
  else tags.push(el('span', { class: 'tag' }, MASTERY[mastery(state)].label));
  return el('div', { class: 'tags' }, tags);
}

export function startButtons(ctx, { deck, mode, counts }) {
  const n = counts ?? previewCount(ctx.store, deck, mode);
  const swipe = el(
    'button',
    { class: 'start start-swipe', disabled: !n, onclick: () => startStudy(ctx, { kind: 'swipe', deck, mode }) },
    el('span', { html: icons.swipe }),
    el('b', {}, 'スワイプ'),
    el('span', {}, n ? `${n}語をめくる` : '出題できる単語なし'),
  );
  const quiz = el(
    'button',
    { class: 'start start-quiz', disabled: !n, onclick: () => startStudy(ctx, { kind: 'quiz', deck, mode }) },
    el('span', { html: icons.quiz }),
    el('b', {}, '4択クイズ'),
    el('span', {}, n ? `${n}問` : '出題できる単語なし'),
  );
  return el('div', { class: 'start-buttons' }, swipe, quiz);
}

export function topbar(title, { back, actions = [] } = {}) {
  return el(
    'header',
    { class: 'topbar' },
    back && el('button', { class: 'icon-btn', 'aria-label': '戻る', onclick: back, html: icons.back }),
    el('h1', {}, title),
    ...actions,
  );
}

export function deckChips({ decks, value, onChange, includeAll = true }) {
  const options = [...(includeAll ? [{ id: 'all', name: 'すべて' }] : []), ...decks];
  const buttons = options.map((d) =>
    el(
      'button',
      {
        class: 'chip',
        type: 'button',
        'aria-pressed': String(d.id === value),
        onclick: () => {
          buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].id === d.id)));
          onChange(d.id);
        },
      },
      d.name,
    ),
  );
  return el('div', { class: 'chips', role: 'group', 'aria-label': '単語帳を選ぶ' }, buttons);
}
