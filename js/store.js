// データの保存（端末の localStorage）。単語帳・学習記録・設定をまとめて1つの JSON で持つ。

import { dayKey, normalizeText, uid } from './util.js';
import { newState, noteConfusion, review } from './srs.js';
import { toCSV } from './parser.js';

export const STORAGE_KEY = 'mekuru.v1';

export const DEFAULT_SETTINGS = {
  sessionSize: 20,
  newPerSession: 10,
  direction: 'term', // term: 単語→意味 / meaning: 意味→単語 / mix
  requeueGap: 3,
  autoSpeak: false,
  autoAdvance: true,
  theme: 'auto',
  deck: 'all',
  mode: 'smart',
};

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    memory: true,
  };
}

export function browserStorage() {
  try {
    const s = globalThis.localStorage;
    s.setItem('__mekuru_probe', '1');
    s.removeItem('__mekuru_probe');
    return s;
  } catch {
    return memoryStorage();
  }
}

function emptyData() {
  return { version: 1, decks: [], stats: {}, daily: {}, settings: { ...DEFAULT_SETTINGS } };
}

function cleanEntry(e) {
  return {
    term: String(e.term ?? '').trim(),
    meaning: String(e.meaning ?? '').trim(),
    example: String(e.example ?? '').trim(),
    note: String(e.note ?? '').trim(),
  };
}

function validate(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.decks)) throw new Error('単語帳のデータが見つかりません');
  const out = emptyData();
  out.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
  out.stats = data.stats && typeof data.stats === 'object' ? data.stats : {};
  out.daily = data.daily && typeof data.daily === 'object' ? data.daily : {};
  out.decks = data.decks.map((d) => ({
    id: String(d.id || uid()),
    name: String(d.name || '単語帳'),
    createdAt: d.createdAt || Date.now(),
    words: (Array.isArray(d.words) ? d.words : [])
      .map((w) => ({ id: String(w.id || uid()), ...cleanEntry(w), createdAt: w.createdAt || Date.now() }))
      .filter((w) => w.term && w.meaning),
  }));
  return out;
}

export class Store {
  constructor(storage = browserStorage()) {
    this.storage = storage;
    this.persistent = !storage.memory;
    this.listeners = new Set();
    this.lastSaveOk = true;
    this.data = this.load();
    this.reindex();
  }

  load() {
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (raw) return validate(JSON.parse(raw));
    } catch {
      /* 壊れたデータは読み捨てる */
    }
    return emptyData();
  }

  save() {
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      this.lastSaveOk = true;
    } catch {
      this.lastSaveOk = false;
    }
    for (const fn of this.listeners) fn(this);
    return this.lastSaveOk;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  reindex() {
    this.index = new Map();
    for (const deck of this.data.decks) for (const word of deck.words) this.index.set(word.id, { word, deck });
  }

  // ---- 設定 ----
  get settings() {
    return this.data.settings;
  }

  setSetting(key, value) {
    this.data.settings[key] = value;
    this.save();
  }

  // ---- 単語帳 ----
  get decks() {
    return this.data.decks;
  }

  deck(id) {
    return this.data.decks.find((d) => d.id === id) || null;
  }

  /** deckId が 'all' ならすべての単語帳の単語 */
  words(deckId = 'all') {
    if (deckId === 'all') return this.data.decks.flatMap((d) => d.words);
    return this.deck(deckId)?.words ?? [];
  }

  word(id) {
    return this.index.get(id)?.word ?? null;
  }

  deckOf(wordId) {
    return this.index.get(wordId)?.deck ?? null;
  }

  createDeck(name, entries = []) {
    const deck = { id: uid(), name: String(name || '').trim() || '新しい単語帳', createdAt: Date.now(), words: [] };
    this.data.decks.push(deck);
    const result = this.addEntries(deck.id, entries, { save: false });
    this.save();
    return { deck, ...result };
  }

  addEntries(deckId, entries, { save = true } = {}) {
    const deck = this.deck(deckId);
    if (!deck) throw new Error('単語帳が見つかりません');
    const existing = new Set(deck.words.map((w) => normalizeText(w.term)));
    let added = 0;
    let duplicates = 0;
    for (const raw of entries) {
      const entry = cleanEntry(raw);
      if (!entry.term || !entry.meaning) continue;
      const key = normalizeText(entry.term);
      if (existing.has(key)) {
        duplicates += 1;
        continue;
      }
      existing.add(key);
      const word = { id: uid() + added.toString(36), ...entry, createdAt: Date.now() };
      deck.words.push(word);
      this.index.set(word.id, { word, deck });
      added += 1;
    }
    if (save) this.save();
    return { added, duplicates };
  }

  renameDeck(id, name) {
    const deck = this.deck(id);
    if (!deck || !String(name).trim()) return;
    deck.name = String(name).trim();
    this.save();
  }

  deleteDeck(id) {
    const deck = this.deck(id);
    if (!deck) return;
    for (const w of deck.words) delete this.data.stats[w.id];
    this.data.decks = this.data.decks.filter((d) => d.id !== id);
    if (this.settings.deck === id) this.settings.deck = 'all';
    this.reindex();
    this.save();
  }

  updateWord(id, patch) {
    const word = this.word(id);
    if (!word) return;
    const next = cleanEntry({ ...word, ...patch });
    if (!next.term || !next.meaning) return;
    Object.assign(word, next);
    this.save();
  }

  deleteWord(id) {
    const deck = this.deckOf(id);
    if (!deck) return;
    deck.words = deck.words.filter((w) => w.id !== id);
    delete this.data.stats[id];
    this.index.delete(id);
    this.save();
  }

  // ---- 学習記録 ----
  state(id) {
    return this.data.stats[id] || null;
  }

  getState = (id) => this.state(id);

  record(id, correct, { now = Date.now(), confusedWith = null } = {}) {
    let s = review(this.state(id) || newState(), correct, now);
    if (!correct && confusedWith && confusedWith !== id) s = noteConfusion(s, confusedWith);
    this.data.stats[id] = s;
    const key = dayKey(now);
    const day = this.data.daily[key] || { a: 0, c: 0 };
    day.a += 1;
    if (correct) day.c += 1;
    this.data.daily[key] = day;
    this.save();
    return s;
  }

  resetStats(ids = null) {
    if (!ids) {
      this.data.stats = {};
      this.data.daily = {};
    } else for (const id of ids) delete this.data.stats[id];
    this.save();
  }

  // ---- バックアップ ----
  exportBackup() {
    return JSON.stringify({ app: 'mekuru', exportedAt: new Date().toISOString(), ...this.data }, null, 1);
  }

  restoreBackup(text) {
    const parsed = typeof text === 'string' ? JSON.parse(text) : text;
    this.data = validate(parsed);
    this.reindex();
    this.save();
    return { decks: this.data.decks.length, words: this.index.size };
  }

  exportDeckCSV(deckId) {
    const deck = this.deck(deckId);
    if (!deck) return '';
    return toCSV([['単語', '意味', '例文', 'メモ'], ...deck.words.map((w) => [w.term, w.meaning, w.example, w.note])]);
  }

  clearAll() {
    this.data = emptyData();
    this.reindex();
    this.save();
  }
}
