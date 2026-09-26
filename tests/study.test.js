import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY, seededRandom } from '../js/util.js';
import { newState, review } from '../js/srs.js';
import { buildQueue, countToday } from '../js/queue.js';
import { Session } from '../js/session.js';
import { buildQuestion, pickDirection } from '../js/quiz.js';

const T0 = Date.UTC(2026, 8, 1, 9);
const words = Array.from({ length: 12 }, (_, i) => ({ id: `w${i}`, term: `word${i}`, meaning: `意味${i}` }));

function statsWith(entries) {
  const map = new Map(entries);
  return (id) => map.get(id) || null;
}

test('おまかせ: 期限の来た単語を優先し、新しい単語は上限まで', () => {
  const dueState = review(newState(), false, T0 - DAY);
  const notDue = review(newState(), true, T0);
  const getState = statsWith([
    ['w0', dueState],
    ['w1', dueState],
    ['w2', notDue],
  ]);
  const q = buildQueue(words, getState, { mode: 'smart', limit: 5, newLimit: 2, now: T0, rng: seededRandom(1) });
  assert.equal(q.length, 4);
  assert.ok(q.includes('w0') && q.includes('w1'));
  assert.ok(!q.includes('w2'));
  // 新しい単語は単語帳の順で選ぶ
  assert.ok(q.includes('w3') && q.includes('w4'));
});

test('おまかせ: やることがなければ次の期限が近い単語を前倒し', () => {
  const getState = (id) => review(newState(), true, T0 + Number(id.slice(1)) * 1000);
  const q = buildQueue(words, getState, { mode: 'smart', limit: 3, now: T0, rng: seededRandom(2) });
  assert.deepEqual([...q].sort(), ['w0', 'w1', 'w2']);
});

test('苦手だけ: 苦手度が閾値以上の単語だけ', () => {
  const weak = review(review(newState(), false, T0), false, T0 + 1);
  const strong = review(newState(), true, T0);
  const getState = statsWith([
    ['w5', weak],
    ['w6', strong],
  ]);
  assert.deepEqual(buildQueue(words, getState, { mode: 'weak', now: T0 }), ['w5']);
});

test('新しい単語 / ランダム', () => {
  const getState = statsWith([['w0', review(newState(), true, T0)]]);
  assert.deepEqual(buildQueue(words, getState, { mode: 'new', limit: 2 }), ['w1', 'w2']);
  const random = buildQueue(words, getState, { mode: 'random', limit: 5, rng: seededRandom(3) });
  assert.equal(new Set(random).size, 5);
});

test('countToday', () => {
  const getState = statsWith([
    ['w0', review(review(newState(), false, T0), false, T0)],
    ['w1', review(newState(), true, T0)],
  ]);
  assert.deepEqual(countToday(words, getState, T0 + DAY), { due: 1, fresh: 10, weak: 1 });
});

test('Session: まちがえた単語は数枚あとに再出題され、正解するまで繰り返す', () => {
  const s = new Session(['a', 'b', 'c', 'd', 'e'], { requeueGap: 2 });
  assert.equal(s.current, 'a');
  assert.equal(s.answer(false).requeued, true);
  assert.deepEqual(s.queue, ['a', 'b', 'c', 'a', 'd', 'e']);
  s.answer(true); // b
  s.answer(true); // c
  assert.equal(s.current, 'a');
  assert.equal(s.isRetry, true);
  s.answer(true); // a（2回目で正解）
  s.answer(true);
  s.answer(true);
  assert.equal(s.done, true);
  const sum = s.summary();
  assert.equal(sum.total, 5);
  assert.equal(sum.firstTry, 4);
  assert.equal(sum.answers, 6);
  assert.deepEqual(sum.missed, [{ id: 'a', misses: 1, recovered: true }]);
});

test('Session: 何度もまちがえたら上限で打ち切る', () => {
  const s = new Session(['a'], { requeueGap: 3, maxRepeats: 2 });
  s.answer(false);
  s.answer(false);
  s.answer(false);
  assert.equal(s.done, true);
  assert.equal(s.cleared, 1);
  assert.deepEqual(s.summary().missed, [{ id: 'a', misses: 3, recovered: false }]);
});

test('Session: 残りが少ないときは最後に回す', () => {
  const s = new Session(['a', 'b'], { requeueGap: 5 });
  s.answer(true);
  s.answer(false);
  assert.equal(s.current, 'b');
});

test('クイズ: 正解1つ + 重複のない選択肢', () => {
  const pool = [
    ...words,
    { id: 'dup', term: 'dup', meaning: '意味1' }, // 同じ意味は選択肢に出さない
  ];
  for (let seed = 1; seed < 20; seed++) {
    const q = buildQuestion(words[1], pool, { rng: seededRandom(seed) });
    assert.equal(q.options.length, 4);
    assert.equal(q.options[q.correctIndex].id, 'w1');
    assert.equal(new Set(q.options.map((o) => o.text)).size, 4);
    assert.equal(q.prompt, 'word1');
  }
});

test('クイズ: 取り違えた単語・つづりが似た単語が選択肢に入りやすい', () => {
  const pool = [
    { id: 'adapt', term: 'adapt', meaning: '適応させる' },
    { id: 'adopt', term: 'adopt', meaning: '採用する' },
    ...words,
  ];
  let similarHits = 0;
  let confusionHits = 0;
  for (let seed = 1; seed <= 50; seed++) {
    const q = buildQuestion(pool[0], pool, { rng: seededRandom(seed) });
    if (q.options.some((o) => o.id === 'adopt')) similarHits += 1;
    const c = buildQuestion(pool[0], pool, { rng: seededRandom(seed), confusions: { w7: 2 } });
    if (c.options.some((o) => o.id === 'w7')) confusionHits += 1;
  }
  assert.equal(confusionHits, 50);
  assert.ok(similarHits >= 45, `similar ${similarHits}`);
});

test('クイズ: 意味→単語の向き、候補が少ないときは選択肢も減る', () => {
  const q = buildQuestion(words[0], words.slice(0, 2), { direction: 'meaning' });
  assert.equal(q.prompt, '意味0');
  assert.equal(q.options.length, 2);
  assert.equal(q.options[q.correctIndex].text, 'word0');
  assert.equal(pickDirection('mix', () => 0.9), 'meaning');
  assert.equal(pickDirection('term'), 'term');
});
