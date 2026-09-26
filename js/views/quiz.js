// 4択クイズ

import { el, vibrate } from '../util.js';
import { icons } from '../icons.js';
import { buildQuestion, pickDirection } from '../quiz.js';
import { canSpeak, speak } from '../speech.js';
import { cardTags, confirmExit, isJapanese, lengthClass, quizPool, studyHeader } from './common.js';

export function render(ctx) {
  const { store, go, params } = ctx;
  const { session, deck, mode } = params;
  if (!session) {
    queueMicrotask(() => go('home'));
    return { el: el('div') };
  }
  const settings = store.settings;
  const extra = { kind: 'quiz', deck, mode };
  const pool = quizPool(store, deck);

  const header = studyHeader(() => confirmExit(ctx, session, extra));
  const cardSlot = el('div');
  const choices = el('ol', { class: 'choices', 'aria-label': '選択肢' });
  const foot = el('div', { class: 'quiz-foot' });
  const feedback = el('div', { class: 'feedback', hidden: true, role: 'status' });

  let q = null;
  let word = null;
  let answered = false;
  let advanceTimer = null;

  function next() {
    if (q && !answered) return; // 二重に「次へ」が押されても1問だけ進める
    clearTimeout(advanceTimer);
    while (!session.done && !store.word(session.current)) session.answer(true);
    header.update(session);
    if (session.done) {
      go('result', { summary: session.summary(), ...extra });
      return;
    }
    word = store.word(session.current);
    const direction = pickDirection(settings.direction);
    q = buildQuestion(word, pool, { direction, confusions: store.state(word.id)?.conf || {} });
    answered = false;

    cardSlot.replaceChildren(
      el(
        'div',
        { class: 'quiz-card' },
        el('span', { class: 'card-ring', 'aria-hidden': 'true' }),
        canSpeak() && direction === 'term' && el('button', { class: 'speak-btn', type: 'button', 'aria-label': '発音を聞く', html: icons.speaker, onclick: () => speak(word.term) }),
        el('p', { class: 'quiz-ask' }, direction === 'term' ? 'この単語の意味は？' : 'この意味の単語は？'),
        el('p', { class: `quiz-prompt${isJapanese(q.prompt) ? ' is-jp' : ''}${lengthClass(q.prompt)}` }, q.prompt),
        cardTags(store.state(word.id), { retry: session.isRetry }),
      ),
    );
    choices.replaceChildren(
      ...q.options.map((opt, i) =>
        el(
          'li',
          {},
          el(
            'button',
            { class: 'choice', type: 'button', onclick: () => answer(i) },
            el('span', { class: 'choice-key' }, String(i + 1)),
            el('span', { class: `choice-text${direction === 'meaning' ? ' is-word' : ''}` }, opt.text),
          ),
        ),
      ),
    );
    foot.replaceChildren(el('button', { class: 'link-btn', type: 'button', onclick: () => answer(-1) }, 'わからない'));
    foot.hidden = false;
    feedback.hidden = true;
    if (settings.autoSpeak && direction === 'term') speak(word.term);
  }

  function answer(index) {
    if (answered) return;
    answered = true;
    const correct = index === q.correctIndex;
    const chosen = index >= 0 ? q.options[index] : null;
    store.record(word.id, correct, { confusedWith: !correct && chosen ? chosen.id : null });
    const { requeued } = session.answer(correct);
    header.update(session);
    vibrate(correct ? 8 : 24);

    [...choices.querySelectorAll('.choice')].forEach((button, i) => {
      button.disabled = true;
      if (i === q.correctIndex) {
        button.classList.add('is-correct');
        button.append(el('span', { class: 'choice-mark', html: icons.check }));
      } else if (i === index) {
        button.classList.add('is-wrong');
        button.append(el('span', { class: 'choice-mark', html: icons.x }));
        // 選んだ選択肢が本当は何の意味（単語）だったかを見せる
        const other = store.word(q.options[i].id);
        if (other) {
          const pairText = q.direction === 'term' ? `＝ ${other.term} の意味` : `＝ ${other.meaning}`;
          button.querySelector('.choice-text').append(el('span', { class: 'choice-sub' }, pairText));
        }
      } else button.classList.add('is-dim');
    });

    foot.hidden = true;
    if (correct && settings.autoAdvance) {
      advanceTimer = setTimeout(next, 750);
      return;
    }
    feedback.dataset.tone = correct ? 'good' : 'again';
    feedback.replaceChildren(
      el(
        'p',
        { class: 'feedback-title' },
        el('span', { html: correct ? icons.check : icons.x }),
        correct ? '正解！' : index < 0 ? 'わからなかった単語' : '不正解',
      ),
      el(
        'div',
        { class: 'feedback-body' },
        el('p', {}, el('b', {}, word.term), ' … ', word.meaning),
        word.example && el('p', { class: 'example' }, word.example),
        requeued && el('p', { class: 'small muted' }, 'この単語は少しあとでもう一度出します。'),
      ),
      el('button', { class: 'btn btn-primary btn-block', type: 'button', onclick: next }, '次へ', el('span', { html: icons.chevron })),
    );
    feedback.hidden = false;
    feedback.querySelector('.btn')?.focus({ preventScroll: true });
    feedback.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }

  function onKey(e) {
    if (e.target.closest?.('input, textarea, select, dialog')) return;
    if (e.target.closest?.('button') && (e.key === 'Enter' || e.key === ' ')) return; // ボタン自体のクリックに任せる
    if (!answered && /^[1-4]$/.test(e.key) && Number(e.key) <= q.options.length) answer(Number(e.key) - 1);
    else if (answered && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) next();
    else return;
    e.preventDefault();
  }
  document.addEventListener('keydown', onKey);

  next();

  return {
    el: el('section', { class: 'study study-quiz', 'aria-label': '4択クイズ' }, header.el, cardSlot, choices, foot, feedback),
    cleanup: () => {
      clearTimeout(advanceTimer);
      document.removeEventListener('keydown', onKey);
      try {
        window.speechSynthesis?.cancel();
      } catch {
        /* 読み上げ非対応 */
      }
    },
  };
}
