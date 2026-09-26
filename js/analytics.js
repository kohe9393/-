// 学習データの集計（分析画面・ホーム画面で使う）

import { DAY, dayKey } from './util.js';
import { MASTERY_KEYS, mastery, weakness, weakReasons, WEAK_THRESHOLD, isDue } from './srs.js';

export function overview(words, getState, daily = {}, now = Date.now()) {
  const counts = Object.fromEntries(MASTERY_KEYS.map((k) => [k, 0]));
  let correct = 0;
  let answers = 0;
  let due = 0;
  let weak = 0;
  for (const word of words) {
    const s = getState(word.id);
    counts[mastery(s)] += 1;
    if (s?.seen) {
      correct += s.correct;
      answers += s.seen;
      if (isDue(s, now)) due += 1;
      if (weakness(s) >= WEAK_THRESHOLD) weak += 1;
    }
  }
  return {
    total: words.length,
    studied: words.length - counts.new,
    counts,
    answers,
    accuracy: answers ? correct / answers : null,
    due,
    weak,
    streak: streakDays(daily, now),
    today: daily[dayKey(now)] || { a: 0, c: 0 },
  };
}

/** 今日（まだなら昨日）から途切れずに学習した日数 */
export function streakDays(daily = {}, now = Date.now()) {
  let t = now;
  if (!daily[dayKey(t)]?.a) t -= DAY;
  let days = 0;
  while (daily[dayKey(t)]?.a) {
    days += 1;
    t -= DAY;
  }
  return days;
}

export function dailySeries(daily = {}, days = 14, now = Date.now()) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const t = now - i * DAY;
    const key = dayKey(t);
    const d = daily[key] || { a: 0, c: 0 };
    out.push({ key, date: new Date(t), answers: d.a || 0, correct: d.c || 0 });
  }
  return out;
}

export function weakList(words, getState, { limit = 20, lookup } = {}) {
  const byId = lookup || ((id) => words.find((w) => w.id === id));
  return words
    .map((word) => ({ word, state: getState(word.id) }))
    .filter(({ state }) => state?.seen && weakness(state) >= WEAK_THRESHOLD)
    .map((item) => ({ ...item, score: weakness(item.state) }))
    .sort((a, b) => b.score - a.score || b.state.wrong - a.state.wrong)
    .slice(0, limit)
    .map((item) => ({ ...item, reasons: weakReasons(item.word, item.state, { lookup: byId, neighbors: words }) }));
}

/** クイズで取り違えた組み合わせ（A→B と B→A はまとめる） */
export function confusionPairs(words, getState, { limit = 10 } = {}) {
  const ids = new Set(words.map((w) => w.id));
  const byId = new Map(words.map((w) => [w.id, w]));
  const pairs = new Map();
  for (const word of words) {
    const conf = getState(word.id)?.conf || {};
    for (const [otherId, n] of Object.entries(conf)) {
      if (!ids.has(otherId)) continue;
      const key = [word.id, otherId].sort().join('|');
      pairs.set(key, (pairs.get(key) || 0) + n);
    }
  }
  return [...pairs.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split('|');
      return { a: byId.get(a), b: byId.get(b), count };
    })
    .sort((x, y) => y.count - x.count)
    .slice(0, limit);
}
