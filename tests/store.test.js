import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store, STORAGE_KEY } from '../js/store.js';
import { DAY, dayKey } from '../js/util.js';
import { confusionPairs, dailySeries, overview, streakDays, weakList } from '../js/analytics.js';
import { parseWordList } from '../js/parser.js';

function fakeStorage() {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k), m };
}

const T0 = new Date(2026, 8, 10, 12).getTime();

test('単語帳の作成・重複スキップ・保存と読み込み', () => {
  const storage = fakeStorage();
  const store = new Store(storage);
  const { deck, added, duplicates } = store.createDeck('TOEIC', [
    { term: 'apple', meaning: 'りんご' },
    { term: 'Apple ', meaning: '重複' },
    { term: 'run', meaning: '走る' },
    { term: '', meaning: '空' },
  ]);
  assert.equal(added, 2);
  assert.equal(duplicates, 1);
  assert.equal(store.addEntries(deck.id, [{ term: 'RUN', meaning: 'x' }, { term: 'set', meaning: '置く' }]).added, 1);

  const reloaded = new Store(storage);
  assert.equal(reloaded.decks.length, 1);
  assert.deepEqual(
    reloaded.words(deck.id).map((w) => w.term),
    ['apple', 'run', 'set'],
  );
  assert.equal(reloaded.word(reloaded.words('all')[0].id).term, 'apple');
});

test('回答の記録・日別集計・取り違え', () => {
  const store = new Store(fakeStorage());
  const { deck } = store.createDeck('d', [
    { term: 'affect', meaning: '影響する' },
    { term: 'effect', meaning: '効果' },
    { term: 'apple', meaning: 'りんご' },
  ]);
  const [a, b, c] = store.words(deck.id);
  store.record(a.id, false, { now: T0, confusedWith: b.id });
  store.record(a.id, false, { now: T0 + 1000, confusedWith: b.id });
  store.record(b.id, false, { now: T0, confusedWith: a.id });
  store.record(c.id, true, { now: T0 - DAY });

  assert.equal(store.state(a.id).conf[b.id], 2);
  assert.deepEqual(store.data.daily[dayKey(T0)], { a: 3, c: 0 });

  const words = store.words(deck.id);
  const ov = overview(words, store.getState, store.data.daily, T0);
  assert.equal(ov.studied, 3);
  assert.equal(ov.streak, 2);
  assert.equal(ov.weak, 2);
  assert.equal(ov.counts.learning, 2);

  const pairs = confusionPairs(words, store.getState);
  assert.equal(pairs.length, 1);
  assert.equal(pairs[0].count, 3);

  const weak = weakList(words, store.getState);
  assert.equal(weak[0].word.term, 'affect');
  assert.ok(weak[0].reasons.some((r) => r.kind === 'confused'));
});

test('連続学習日数と日別の系列', () => {
  const daily = {
    [dayKey(T0)]: { a: 5, c: 4 },
    [dayKey(T0 - DAY)]: { a: 2, c: 2 },
    [dayKey(T0 - 3 * DAY)]: { a: 1, c: 0 },
  };
  assert.equal(streakDays(daily, T0), 2);
  // 今日まだ学習していなくても、昨日まで続いていれば数える
  assert.equal(streakDays({ [dayKey(T0 - DAY)]: { a: 1, c: 1 } }, T0), 1);
  const series = dailySeries(daily, 7, T0);
  assert.equal(series.length, 7);
  assert.equal(series[6].answers, 5);
  assert.equal(series[3].answers, 1);
});

test('単語の編集・削除、単語帳の削除で記録も消える', () => {
  const store = new Store(fakeStorage());
  const { deck } = store.createDeck('d', [
    { term: 'a', meaning: 'x' },
    { term: 'b', meaning: 'y' },
  ]);
  const [a, b] = store.words(deck.id);
  store.updateWord(a.id, { meaning: 'エー', example: 'An a.' });
  assert.equal(store.word(a.id).meaning, 'エー');
  store.updateWord(a.id, { term: '  ' }); // 空にはできない
  assert.equal(store.word(a.id).term, 'a');
  store.record(b.id, true);
  store.deleteWord(b.id);
  assert.equal(store.state(b.id), null);
  store.record(a.id, true);
  store.deleteDeck(deck.id);
  assert.equal(store.state(a.id), null);
  assert.equal(store.words('all').length, 0);
});

test('バックアップの書き出しと復元、CSV 書き出し', () => {
  const store = new Store(fakeStorage());
  const { deck } = store.createDeck('英検', [{ term: 'abandon', meaning: '捨てる, 見捨てる', example: 'He abandoned it.' }]);
  store.record(store.words(deck.id)[0].id, true);
  store.setSetting('sessionSize', 30);
  const json = store.exportBackup();

  const other = new Store(fakeStorage());
  const result = other.restoreBackup(json);
  assert.deepEqual(result, { decks: 1, words: 1 });
  assert.equal(other.settings.sessionSize, 30);
  assert.equal(other.state(other.words('all')[0].id).seen, 1);

  assert.throws(() => other.restoreBackup('{"hello":1}'));
  assert.equal(other.words('all').length, 1); // 失敗しても消えない

  const csv = store.exportDeckCSV(deck.id);
  const back = parseWordList(csv);
  assert.equal(back.entries[0].meaning, '捨てる, 見捨てる');
  assert.equal(back.entries[0].example, 'He abandoned it.');
});

test('壊れた保存データは無視して起動する', () => {
  const storage = fakeStorage();
  storage.setItem(STORAGE_KEY, '{broken');
  const store = new Store(storage);
  assert.equal(store.decks.length, 0);
  assert.equal(store.settings.sessionSize, 20);
});

test('保存に失敗したら lastSaveOk が false', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('QuotaExceeded'); }, removeItem() {} };
  const store = new Store(storage);
  store.createDeck('d', [{ term: 'a', meaning: 'b' }]);
  assert.equal(store.lastSaveOk, false);
});
