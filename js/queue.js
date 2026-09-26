// 1回の学習で出す単語を選ぶ。

import { shuffle } from './util.js';
import { isDue, weakness, WEAK_THRESHOLD } from './srs.js';

export const STUDY_MODES = {
  smart: { label: 'おまかせ', hint: '復習が必要な単語と苦手な単語を優先して、新しい単語を少しずつ足します' },
  weak: { label: '苦手だけ', hint: 'ミスが多い単語・最近まちがえた単語だけを集中して出します' },
  new: { label: '未学習', hint: 'まだ一度も学習していない単語を、単語帳の順に出します' },
  random: { label: 'ランダム', hint: '学習の状況に関係なく、単語帳からランダムに出します' },
};

/**
 * @param words 単語の配列（{id, ...}）
 * @param getState id → 学習状態
 * @returns 出題する単語 id の配列
 */
export function buildQueue(words, getState, { mode = 'smart', limit = 20, newLimit = 10, now = Date.now(), rng = Math.random } = {}) {
  const items = words.map((word) => ({ word, state: getState(word.id) }));
  const ids = (list) => list.map((item) => item.word.id);

  if (mode === 'weak') {
    const weak = items
      .map((item) => ({ ...item, score: weakness(item.state) }))
      .filter((item) => item.score >= WEAK_THRESHOLD || (item.state?.seen && item.state.hist.endsWith('0')))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return ids(shuffle(weak, rng));
  }

  if (mode === 'new') {
    return ids(items.filter((item) => !item.state?.seen).slice(0, limit));
  }

  if (mode === 'random') {
    return ids(shuffle(items, rng).slice(0, limit));
  }

  // おまかせ: 期限が来た単語（苦手・期限切れが長いものほど先）→ 新しい単語
  const due = items
    .filter((item) => isDue(item.state, now))
    .map((item) => ({ ...item, priority: weakness(item.state) + Math.min(1, (now - item.state.due) / (7 * 86400000)) * 0.3 }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
  const room = Math.max(0, Math.min(newLimit, limit - due.length));
  const fresh = items.filter((item) => !item.state?.seen).slice(0, room);
  let picked = [...due, ...fresh];

  if (!picked.length) {
    // 今日やることが終わっていても練習できるように、次に期限が来る単語を前倒しで出す
    picked = items
      .filter((item) => item.state?.seen)
      .sort((a, b) => a.state.due - b.state.due)
      .slice(0, limit);
  }
  return ids(shuffle(picked, rng));
}

export function countToday(words, getState, now = Date.now()) {
  let due = 0;
  let fresh = 0;
  let weak = 0;
  for (const word of words) {
    const s = getState(word.id);
    if (!s?.seen) fresh += 1;
    else {
      if (isDue(s, now)) due += 1;
      if (weakness(s) >= WEAK_THRESHOLD) weak += 1;
    }
  }
  return { due, fresh, weak };
}
