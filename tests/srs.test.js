import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAY } from '../js/util.js';
import { isDue, isWeak, mastery, newState, noteConfusion, review, weakReasons, weakness, RELEARN_DELAY } from '../js/srs.js';

const T0 = Date.UTC(2026, 8, 1, 9);

test('初見で正解した単語は3日後', () => {
  const s = review(newState(), true, T0);
  assert.equal(s.interval, 3);
  assert.equal(s.due, T0 + 3 * DAY);
  assert.equal(mastery(s), 'review');
});

test('まちがえると10分後にもう一度、その後の正解で翌日→3日後→伸びていく', () => {
  let s = review(newState(), false, T0);
  assert.equal(s.due, T0 + RELEARN_DELAY);
  assert.equal(mastery(s), 'learning');
  assert.ok(isDue(s, T0 + RELEARN_DELAY));

  s = review(s, true, T0 + RELEARN_DELAY);
  assert.equal(s.interval, 1);
  s = review(s, true, s.due);
  assert.equal(s.interval, 3);
  s = review(s, true, s.due);
  assert.ok(s.interval >= 7, `interval ${s.interval}`);
  let t = s.due;
  for (let i = 0; i < 3; i++) {
    s = review(s, true, t);
    t = s.due;
  }
  assert.equal(mastery(s), 'mastered');
});

test('覚えていた単語を忘れると lapses が増え、間隔がリセットされる', () => {
  let s = review(newState(), true, T0); // 3日
  s = review(s, false, s.due);
  assert.equal(s.lapses, 1);
  assert.equal(s.interval, 0);
  assert.ok(s.ease < 2.5);
});

test('期限前に先取りで正解しても間隔は伸ばさない', () => {
  let s = review(newState(), false, T0);
  s = review(s, true, T0 + DAY);
  s = review(s, true, s.due);
  s = review(s, true, s.due);
  const before = s.interval;
  const early = review(s, true, s.last + DAY);
  assert.equal(early.interval, before);
});

test('苦手度: ミスが多く最近まちがえた単語ほど高い', () => {
  const good = review(review(newState(), true, T0), true, T0 + 3 * DAY);
  let bad = review(newState(), false, T0);
  bad = review(bad, false, T0 + RELEARN_DELAY);
  assert.equal(weakness(newState()), 0);
  assert.ok(weakness(bad) > weakness(good));
  assert.ok(isWeak(bad));
  assert.ok(!isWeak(good));
});

test('一度まちがえても、その後続けて正解すれば苦手から外れる', () => {
  let s = review(newState(), false, T0);
  s = review(s, true, T0 + RELEARN_DELAY);
  s = review(s, true, s.due);
  s = review(s, true, s.due);
  assert.ok(!isWeak(s), `weakness ${weakness(s)}`);
});

test('元の状態は書き換えない', () => {
  const s = newState();
  const next = noteConfusion(review(s, false, T0), 'x');
  assert.equal(s.seen, 0);
  assert.deepEqual(s.conf, {});
  assert.equal(next.conf.x, 1);
});

test('苦手の理由: 混同・つづりが似た単語・連続ミス', () => {
  const words = [
    { id: 'a', term: 'adapt', meaning: '適応させる' },
    { id: 'b', term: 'adopt', meaning: '採用する' },
    { id: 'c', term: 'affect', meaning: '影響する' },
  ];
  const lookup = (id) => words.find((w) => w.id === id);
  let s = review(newState(), false, T0);
  s = review(s, false, T0 + 1);
  const similar = weakReasons(words[0], s, { lookup, neighbors: words }).map((r) => r.kind);
  assert.ok(similar.includes('streak'));
  assert.ok(similar.includes('similar'));

  const confused = weakReasons(words[0], noteConfusion(s, 'c'), { lookup, neighbors: words });
  assert.ok(confused.some((r) => r.kind === 'confused' && r.text.includes('affect')));
});
