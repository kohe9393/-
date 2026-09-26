// 学習セッションの進行。まちがえた単語は数枚あとにもう一度出し、正解するまで繰り返す。

export class Session {
  constructor(ids, { requeueGap = 3, maxRepeats = 3 } = {}) {
    this.queue = [...new Set(ids)];
    this.pos = 0;
    this.total = this.queue.length;
    this.requeueGap = requeueGap;
    this.maxRepeats = maxRepeats;
    this.results = new Map(); // id → { attempts, misses, cleared, firstCorrect }
    this.log = []; // { id, correct }
  }

  get current() {
    return this.queue[this.pos] ?? null;
  }

  get done() {
    return this.pos >= this.queue.length;
  }

  /** 今のカードが再出題かどうか */
  get isRetry() {
    const r = this.results.get(this.current);
    return !!r && r.misses > 0;
  }

  get cleared() {
    let n = 0;
    for (const r of this.results.values()) if (r.cleared) n += 1;
    return n;
  }

  get remaining() {
    return this.queue.length - this.pos;
  }

  answer(correct) {
    const id = this.current;
    if (id == null) return { requeued: false };
    const r = this.results.get(id) ?? { attempts: 0, misses: 0, cleared: false, firstCorrect: null };
    r.attempts += 1;
    if (r.firstCorrect === null) r.firstCorrect = correct;
    let requeued = false;
    if (correct) r.cleared = true;
    else {
      r.misses += 1;
      if (r.misses <= this.maxRepeats) {
        const at = Math.min(this.pos + 1 + this.requeueGap, this.queue.length);
        this.queue.splice(at, 0, id);
        requeued = true;
      } else r.cleared = true; // 何度やってもダメなら次回に回す
    }
    this.results.set(id, r);
    this.log.push({ id, correct });
    this.pos += 1;
    return { requeued };
  }

  summary() {
    const entries = [...this.results.entries()];
    const firstTry = entries.filter(([, r]) => r.firstCorrect).length;
    const missed = entries
      .filter(([, r]) => r.misses > 0)
      .sort((a, b) => b[1].misses - a[1].misses)
      .map(([id, r]) => ({ id, misses: r.misses, recovered: r.cleared && r.attempts > r.misses }));
    return {
      total: entries.length,
      firstTry,
      accuracy: entries.length ? firstTry / entries.length : 0,
      answers: this.log.length,
      missed,
    };
  }
}
