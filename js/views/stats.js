// 分析：習熟度・学習の記録・苦手ランキング・取り違えやすい組み合わせ

import { el, svg } from '../util.js';
import { masteryBar } from '../ui.js';
import { confusionPairs, dailySeries, overview, weakList } from '../analytics.js';
import { MASTERY, MASTERY_KEYS } from '../srs.js';
import { deckChips, startStudy, topbar } from './common.js';
import { openWordSheet } from './word-sheet.js';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const NICE_MAX = [4, 6, 10, 20, 30, 40, 60, 80, 100, 150, 200, 300, 400, 600, 800, 1000];

export function render(ctx) {
  const { store, params } = ctx;
  let deck = params.deck && store.deck(params.deck) ? params.deck : 'all';
  const body = el('div', { class: 'steps' });

  function update() {
    const words = store.words(deck);
    const ov = overview(words, store.getState, store.data.daily);
    if (!ov.studied) {
      body.replaceChildren(
        el(
          'div',
          { class: 'panel empty' },
          el('p', {}, 'まだ学習の記録がありません。'),
          el('p', { class: 'small' }, 'スワイプやクイズで学習すると、正答率や苦手な単語がここに表示されます。'),
        ),
      );
      return;
    }
    body.replaceChildren(tiles(ov), masterySection(ov), activitySection(store), weakSection(ctx, words, deck, update), pairSection(store, words));
  }

  update();
  return {
    el: el(
      'div',
      { class: 'page' },
      topbar('分析'),
      store.decks.length > 1 &&
        deckChips({
          decks: store.decks,
          value: deck,
          onChange: (id) => {
            deck = id;
            update();
          },
        }),
      body,
    ),
  };
}

function tile(label, value, unit) {
  return el('div', { class: 'panel tile' }, el('span', {}, label), el('b', {}, value, unit && el('small', {}, unit)));
}

function tiles(ov) {
  return el(
    'div',
    { class: 'tiles' },
    tile('学習した単語', ov.studied, ` / ${ov.total}語`),
    tile('正答率', ov.accuracy == null ? '—' : Math.round(ov.accuracy * 100), ov.accuracy == null ? '' : '%'),
    tile('連続学習', ov.streak, '日'),
    tile('今日の回答', ov.today.a || 0, '問'),
  );
}

function masterySection(ov) {
  return el(
    'section',
    { class: 'panel panel-pad section' },
    el('div', { class: 'section-head' }, el('h2', {}, '習熟度'), el('span', { class: 'small muted' }, `全${ov.total}語`)),
    masteryBar(ov.counts, ov.total, { large: true }),
    el(
      'div',
      { class: 'legend' },
      [...MASTERY_KEYS].reverse().map((key) => el('div', {}, el('i', { class: `m-${key}` }), MASTERY[key].label, el('b', {}, ov.counts[key]))),
    ),
    el('p', { class: 'small muted' }, '「定着中」は3日以上、「マスター」は3週間以上あけても覚えていた単語です。'),
  );
}

function formatDay(date, today = false) {
  const label = `${date.getMonth() + 1}/${date.getDate()}`;
  return today ? `今日（${label}）` : `${label}（${WEEKDAYS[date.getDay()]}）`;
}

function activitySection(store) {
  const series = dailySeries(store.data.daily, 14);
  const readout = el('p', { class: 'chart-readout', 'aria-live': 'polite' });
  const W = 340;
  const H = 150;
  const pad = { l: 30, r: 4, t: 8, b: 22 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const peak = Math.max(...series.map((d) => d.answers));
  const max = NICE_MAX.find((n) => n >= peak) ?? Math.ceil(peak / 500) * 500;
  const step = plotW / series.length;
  const barW = Math.min(14, step - 4);
  const y = (v) => pad.t + plotH - (v / max) * plotH;

  const chart = svg('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '過去14日間の回答数' });
  for (const v of [0, max / 2, max]) {
    chart.append(
      svg('line', { class: v === 0 ? 'axis' : 'grid', x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v) }),
      svg('text', { class: 'tick', x: pad.l - 6, y: y(v) + 3.5, 'text-anchor': 'end' }, String(v)),
    );
  }

  const bars = [];
  const select = (i) => {
    const d = series[i];
    bars.forEach((b, j) => b?.classList.toggle('is-active', j === i));
    const day = formatDay(d.date, i === series.length - 1);
    readout.replaceChildren(
      el('b', {}, day),
      d.answers ? `　${d.answers}問・正答率 ${Math.round((d.correct / d.answers) * 100)}%` : '　学習なし',
    );
  };

  series.forEach((d, i) => {
    const cx = pad.l + step * i + step / 2;
    const hit = svg('rect', { class: 'bar-hit', x: cx - step / 2, y: pad.t, width: step, height: plotH, tabindex: '0', 'aria-label': formatDay(d.date) });
    hit.addEventListener('pointerenter', () => select(i));
    hit.addEventListener('click', () => select(i));
    hit.addEventListener('focus', () => select(i));
    chart.append(hit);
    if (d.answers > 0) {
      const top = y(d.answers);
      const h = pad.t + plotH - top;
      const r = Math.min(4, h, barW / 2);
      const x0 = cx - barW / 2;
      const x1 = cx + barW / 2;
      const base = pad.t + plotH;
      // 上だけ角丸、下は基準線に接地
      const path = `M${x0},${base}V${top + r}Q${x0},${top} ${x0 + r},${top}H${x1 - r}Q${x1},${top} ${x1},${top + r}V${base}Z`;
      const bar = svg('path', { class: 'bar', d: path });
      bar.style.pointerEvents = 'none';
      chart.append(bar);
      bars[i] = bar;
    }
    const label = i === 0 || i === 7 || i === series.length - 1;
    if (label) {
      chart.append(
        svg('text', { class: 'tick', x: cx, y: H - 6, 'text-anchor': i === series.length - 1 ? 'end' : 'middle' }, i === series.length - 1 ? '今日' : `${d.date.getMonth() + 1}/${d.date.getDate()}`),
      );
    }
  });
  select(series.length - 1);

  const total = series.reduce((n, d) => n + d.answers, 0);
  return el(
    'section',
    { class: 'panel panel-pad section' },
    el('div', { class: 'section-head' }, el('h2', {}, '学習の記録'), el('span', { class: 'small muted num' }, `14日間で${total}問`)),
    readout,
    chart,
  );
}

function weakSection(ctx, words, deck, update) {
  const { store } = ctx;
  const weak = weakList(words, store.getState, { limit: 15, lookup: (id) => store.word(id) });
  const head = el(
    'div',
    { class: 'section-head' },
    el('h2', {}, '苦手ランキング'),
    el('span', { class: 'small muted' }, weak.length ? `${weak.length}語` : ''),
  );
  if (!weak.length) {
    return el('section', { class: 'section' }, head, el('p', { class: 'panel panel-pad small muted' }, '苦手な単語はありません。この調子！'));
  }
  return el(
    'section',
    { class: 'section' },
    head,
    el('p', { class: 'small muted' }, 'ミスの回数、最近の結果、覚えたあとに忘れたかどうかから順位をつけています。'),
    el(
      'ol',
      { class: 'list panel' },
      weak.map(({ word, state, reasons }, i) =>
        el(
          'li',
          {},
          el(
            'button',
            { class: 'row', onclick: () => openWordSheet(store, { wordId: word.id, onChange: update }) },
            el('span', { class: 'row-rank' }, i + 1),
            el(
              'span',
              { class: 'row-main' },
              el('span', { class: 'row-term' }, word.term),
              el('span', { class: 'row-meaning' }, word.meaning),
              reasons.length > 0 &&
                el(
                  'span',
                  { class: 'tags' },
                  reasons.map((r) => el('span', { class: r.kind === 'confused' || r.kind === 'similar' ? 'tag tag-mark' : 'tag tag-again' }, r.text)),
                ),
            ),
            el('span', { class: 'row-side' }, el('span', { class: 'num' }, `正答 ${Math.round((state.correct / state.seen) * 100)}%`), el('span', { class: 'num' }, `${state.correct}/${state.seen}`)),
          ),
        ),
      ),
    ),
    el(
      'div',
      { class: 'btn-row' },
      el('button', { class: 'btn btn-primary', onclick: () => startStudy(ctx, { kind: 'swipe', deck, mode: 'weak' }) }, 'スワイプで復習'),
      el('button', { class: 'btn', onclick: () => startStudy(ctx, { kind: 'quiz', deck, mode: 'weak' }) }, 'クイズで復習'),
    ),
  );
}

function pairSection(store, words) {
  const pairs = confusionPairs(words, store.getState, { limit: 8 });
  if (!pairs.length) return null;
  return el(
    'section',
    { class: 'section' },
    el('div', { class: 'section-head' }, el('h2', {}, '取り違えやすい組み合わせ')),
    el('p', { class: 'small muted' }, 'クイズで、別の単語の意味を選んでしまった組み合わせです。'),
    el(
      'ul',
      { class: 'list panel' },
      pairs.map(({ a, b, count }) =>
        el(
          'li',
          { class: 'pair' },
          el(
            'div',
            { class: 'pair-words' },
            el('div', {}, el('div', { class: 'row-term' }, a.term), el('div', { class: 'row-meaning' }, a.meaning)),
            el('span', { class: 'pair-arrow', 'aria-label': 'と' }, '⇄'),
            el('div', {}, el('div', { class: 'row-term' }, b.term), el('div', { class: 'row-meaning' }, b.meaning)),
          ),
          el('span', { class: 'pair-count' }, `${count}回`),
        ),
      ),
    ),
  );
}
