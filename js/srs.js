// 間隔反復（SM-2 を2択の自己採点向けに簡略化したもの）と苦手度の計算。

import { DAY, MINUTE, looksSimilar } from './util.js';

export const RELEARN_DELAY = 10 * MINUTE;
export const MAX_INTERVAL = 365;
export const WEAK_THRESHOLD = 0.35;

export const MASTERY = {
  new: { label: '未学習', order: 0 },
  learning: { label: '学習中', order: 1 },
  review: { label: '定着中', order: 2 },
  mastered: { label: 'マスター', order: 3 },
};
export const MASTERY_KEYS = ['new', 'learning', 'review', 'mastered'];

export function newState() {
  return {
    seen: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    lapses: 0,
    ease: 2.5,
    interval: 0, // 日
    due: 0,
    last: 0,
    hist: '', // 直近の結果 '1' 正解 / '0' ミス
    conf: {}, // クイズで取り違えた単語 id → 回数
  };
}

/** 1回の回答を反映した新しい状態を返す（元の状態は変更しない） */
export function review(prev, correct, now = Date.now()) {
  const s = { ...newState(), ...prev, conf: { ...(prev?.conf || {}) } };
  const firstTime = s.seen === 0;
  const early = s.due > 0 && now < s.due - DAY / 2;
  s.seen += 1;
  s.last = now;
  s.hist = (s.hist + (correct ? '1' : '0')).slice(-12);

  if (correct) {
    s.correct += 1;
    if (firstTime) {
      // 初見で「知ってる」→ 少し先まで飛ばす
      s.streak = 2;
      s.interval = 3;
    } else {
      s.streak += 1;
      if (s.streak === 1) s.interval = 1;
      else if (s.streak === 2) s.interval = Math.max(3, s.interval);
      else if (!early) s.interval = Math.round(Math.max(1, s.interval) * s.ease);
      s.ease = Math.min(3, s.ease + 0.05);
    }
    s.interval = Math.min(MAX_INTERVAL, s.interval);
    s.due = now + s.interval * DAY;
  } else {
    s.wrong += 1;
    if (s.interval >= 3) s.lapses += 1; // 覚えていたはずの単語を忘れた
    s.streak = 0;
    s.interval = 0;
    s.ease = Math.max(1.3, s.ease - 0.2);
    s.due = now + RELEARN_DELAY;
  }
  return s;
}

export function noteConfusion(state, otherId) {
  const conf = { ...(state.conf || {}) };
  conf[otherId] = (conf[otherId] || 0) + 1;
  return { ...state, conf };
}

export function mastery(s) {
  if (!s || s.seen === 0) return 'new';
  if (s.interval >= 21) return 'mastered';
  if (s.interval >= 3) return 'review';
  return 'learning';
}

export function isDue(s, now = Date.now()) {
  return !!s && s.seen > 0 && s.due <= now;
}

export function accuracy(s) {
  return s && s.seen ? s.correct / s.seen : null;
}

/** 0〜1。高いほど苦手。未学習は 0。 */
export function weakness(s) {
  if (!s || s.seen === 0) return 0;
  const smoothedAccuracy = (s.correct + 1) / (s.seen + 2);
  const recent = s.hist.slice(-5);
  const recentWrong = recent.length ? [...recent].filter((c) => c === '0').length / recent.length : 0;
  const lastWrong = s.hist.endsWith('0') ? 1 : 0;
  const score = 0.4 * (1 - smoothedAccuracy) + 0.3 * recentWrong + 0.15 * lastWrong + 0.15 * Math.min(1, s.lapses / 3);
  return Math.round(score * 1000) / 1000;
}

export function isWeak(s) {
  return weakness(s) >= WEAK_THRESHOLD;
}

/**
 * なぜ苦手なのかを短いラベルで返す。
 * @param lookup id → word。混同相手の表示に使う
 * @param neighbors 同じ単語帳の単語（つづりが似た単語の検出に使う）
 */
export function weakReasons(word, s, { lookup = () => null, neighbors = [] } = {}) {
  const reasons = [];
  if (!s || s.seen === 0) return reasons;
  if (s.hist.endsWith('00')) reasons.push({ kind: 'streak', text: '連続でミス' });
  else if (s.hist.endsWith('0')) reasons.push({ kind: 'recent', text: '前回ミス' });
  if (s.wrong >= 3) reasons.push({ kind: 'count', text: `${s.wrong}回ミス` });
  if (s.lapses >= 1) reasons.push({ kind: 'lapse', text: '覚えたのに忘れた' });
  const topConfusion = Object.entries(s.conf || {}).sort((a, b) => b[1] - a[1])[0];
  const other = topConfusion && lookup(topConfusion[0]);
  if (other) reasons.push({ kind: 'confused', text: `「${other.term}」と混同`, otherId: other.id });
  else {
    const similar = neighbors.find((w) => w.id !== word.id && looksSimilar(w.term, word.term));
    if (similar) reasons.push({ kind: 'similar', text: `つづりが似た語「${similar.term}」`, otherId: similar.id });
  }
  if (s.seen >= 4 && s.correct / s.seen < 0.5) reasons.push({ kind: 'accuracy', text: `正答率${Math.round((s.correct / s.seen) * 100)}%` });
  return reasons;
}
