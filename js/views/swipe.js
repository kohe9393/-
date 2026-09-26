// スワイプ学習：カードをめくって、右＝覚えた／左＝まだ

import { el, vibrate } from '../util.js';
import { icons } from '../icons.js';
import { pickDirection } from '../quiz.js';
import { makeSwipeable } from '../swipe.js';
import { canSpeak, speak } from '../speech.js';
import { cardTags, confirmExit, isJapanese, lengthClass, studyHeader } from './common.js';

export function render(ctx) {
  const { store, go, params } = ctx;
  const { session, deck, mode } = params;
  if (!session) {
    queueMicrotask(() => go('home'));
    return { el: el('div') };
  }
  const settings = store.settings;
  const extra = { kind: 'swipe', deck, mode };

  const header = studyHeader(() => confirmExit(ctx, session, extra));
  const stage = el('div', { class: 'stage' });
  const note = el('p', { class: 'retry-toast', hidden: true, role: 'status' }, 'まちがえた単語は、少しあとでもう一度出します');
  let noteTimer = null;
  let current = null;

  const controls = el(
    'div',
    { class: 'swipe-controls' },
    el('button', { class: 'judge judge-again', onclick: () => current?.swiper.fling(-1) }, el('span', { html: icons.x }), 'まだ'),
    el('button', { class: 'flip-btn', 'aria-label': 'めくる', onclick: () => current?.toggle() }, el('span', { html: icons.flip })),
    el('button', { class: 'judge judge-know', onclick: () => current?.swiper.fling(1) }, el('span', { html: icons.check }), '覚えた'),
  );

  function next() {
    while (!session.done && !store.word(session.current)) session.answer(true); // 途中で削除された単語は飛ばす
    header.update(session);
    if (session.done) {
      go('result', { summary: session.summary(), ...extra });
      return;
    }
    const word = store.word(session.current);
    const direction = pickDirection(settings.direction);
    current = buildCard(word, direction);
    stage.replaceChildren(current.el, note);
    if (settings.autoSpeak && direction === 'term') speak(word.term);
  }

  function buildCard(word, direction) {
    const prompt = direction === 'term' ? word.term : word.meaning;
    const answer = direction === 'term' ? word.meaning : word.term;
    const promptEl = el('p', { class: `card-prompt${isJapanese(prompt) ? ' is-jp' : ''}${lengthClass(prompt)}` }, prompt);
    const answerEl = el(
      'div',
      { class: 'card-answer', hidden: true },
      el('p', { class: `card-answer-main${direction === 'meaning' ? ' is-word' : ''}` }, answer),
      word.example && el('p', { class: 'card-example' }, word.example),
      word.note && el('p', { class: 'card-note' }, word.note),
    );
    const tip = el('p', { class: 'card-tip' }, `タップで${direction === 'term' ? '意味' : '単語'}を見る`);
    const speakBtn =
      canSpeak() &&
      el('button', {
        class: 'speak-btn',
        type: 'button',
        'aria-label': '発音を聞く',
        hidden: direction === 'meaning',
        html: icons.speaker,
        onclick: () => speak(word.term),
      });

    const card = el(
      'article',
      { class: 'card', 'aria-label': `単語カード：${prompt}`, 'aria-live': 'polite' },
      el('span', { class: 'card-ring', 'aria-hidden': 'true' }),
      el('div', { class: 'card-top' }, cardTags(store.state(word.id), { retry: session.isRetry }), speakBtn),
      el('div', { class: 'card-body' }, promptEl, answerEl),
      tip,
      el('span', { class: 'stamp stamp-know', 'aria-hidden': 'true' }, '覚えた'),
      el('span', { class: 'stamp stamp-again', 'aria-hidden': 'true' }, 'もう一度'),
    );

    let open = false;
    const toggle = () => {
      open = !open;
      card.classList.toggle('is-open', open);
      answerEl.hidden = !open;
      tip.hidden = open;
      if (speakBtn && open) speakBtn.hidden = false;
    };
    const swiper = makeSwipeable(card, { onTap: toggle, onSwipe: (dir) => judge(word, dir === 'right') });
    return { el: card, toggle, swiper };
  }

  function judge(word, correct) {
    store.record(word.id, correct);
    const { requeued } = session.answer(correct);
    vibrate(correct ? 8 : 24);
    if (requeued) {
      note.hidden = false;
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => (note.hidden = true), 1600);
    }
    next();
  }

  function onKey(e) {
    if (e.target.closest?.('input, textarea, select, dialog')) return;
    if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return;
    if (e.key === 'ArrowRight') current?.swiper.fling(1);
    else if (e.key === 'ArrowLeft') current?.swiper.fling(-1);
    else if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') current?.toggle();
    else return;
    e.preventDefault();
  }
  document.addEventListener('keydown', onKey);

  next();

  return {
    el: el(
      'section',
      { class: 'study', 'aria-label': 'スワイプで学習' },
      header.el,
      stage,
      controls,
      el('p', { class: 'swipe-hint' }, '右へ「覚えた」・左へ「まだ」／タップでめくる'),
    ),
    cleanup: () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(noteTimer);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* 読み上げ非対応 */
      }
    },
  };
}
