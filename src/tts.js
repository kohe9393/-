/**
 * Speech engines for the shadowing tool.
 *
 * Two implementations share one interface so the player does not care which
 * is active:
 *
 *   engine.ready              Promise, resolves once the engine can speak
 *   engine.voices             [{ id, label, group, badge, note }]
 *   engine.prepare(text,opt)  Promise<clip>  (may be a no-op)
 *   engine.play(clip,opt)     Playback { pause, resume, stop, setRate, duration }
 *
 * KokoroEngine runs a neural model in a worker and hands back real audio, so
 * clips can be synthesised ahead of time while the previous sentence plays.
 * SystemEngine wraps the browser's built-in speech synthesis; it cannot
 * pre-render, but it needs no download and works while the model is still
 * being fetched.
 */

const GRADE_POINTS = { A: 4, B: 3, C: 2, D: 1, F: 0 };

function gradeScore(grade) {
  if (!grade) return -1;
  const base = GRADE_POINTS[grade[0].toUpperCase()];
  if (base === undefined) return -1;
  const modifier = grade.includes("+") ? 0.3 : grade.includes("-") ? -0.3 : 0;
  return base + modifier;
}

/** Encode mono float samples as 16-bit PCM WAV (decodable everywhere). */
function encodeWav16(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const ascii = (offset, text) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  ascii(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Playback of a rendered audio clip. */
class ClipPlayback {
  constructor(clip, { rate = 1, onended, onerror } = {}) {
    this.duration = clip.duration / rate;
    this._stopped = false;
    const audio = new Audio(clip.url);
    // Time-stretch without the chipmunk effect when slowing down.
    audio.preservesPitch = true;
    audio.mozPreservesPitch = true;
    audio.webkitPreservesPitch = true;
    audio.playbackRate = rate;
    audio.addEventListener("ended", () => {
      if (!this._stopped && onended) onended();
    });
    audio.addEventListener("error", () => {
      if (!this._stopped && onerror) onerror(new Error("audio playback failed"));
    });
    this._audio = audio;
  }

  play() {
    return this._audio.play();
  }

  pause() {
    this._audio.pause();
  }

  resume() {
    return this._audio.play().catch(() => {});
  }

  setRate(rate) {
    this._audio.playbackRate = rate;
  }

  stop() {
    this._stopped = true;
    this._audio.pause();
    this._audio.removeAttribute("src");
    this._audio.load();
  }
}

export class KokoroEngine {
  static id = "kokoro";

  /**
   * @param {object} options
   * @param {string} options.workerUrl  URL of tts-worker.js
   * @param {string} options.libUrl     URL of the vendored kokoro.web.js
   * @param {string} options.modelBase  directory holding config.json / onnx/ / voices/
   * @param {string} options.ortPath    directory holding the ORT wasm files
   * @param {"fp32"|"fp16"|"q8"|"q4"|"q4f16"} options.dtype
   * @param {"auto"|"webgpu"|"wasm"} options.device
   * @param {(info:object)=>void} [options.onProgress]
   */
  constructor(options) {
    this.id = KokoroEngine.id;
    this.label = "Kokoro";
    this.canPrefetch = true;
    this.options = options;
    this.device = null;
    this.voices = [];
    this._cache = new Map();
    this._pending = new Map();
    this._nextId = 1;
    this._maxCached = 60;

    this._worker = new Worker(options.workerUrl, { type: "module" });
    this._worker.addEventListener("message", (event) => this._onMessage(event));
    this._worker.addEventListener("error", (event) => {
      this._rejectReady(new Error(event.message || "worker failed to start"));
    });

    this.ready = new Promise((resolve, reject) => {
      this._resolveReady = resolve;
      this._rejectReady = reject;
    });

    const requested = options.device === "auto" ? this._autoDevice() : options.device;
    this._worker.postMessage({
      type: "init",
      libUrl: options.libUrl,
      modelBase: options.modelBase,
      ortPath: options.ortPath,
      dtype: options.dtype,
      device: requested,
    });
  }

  _autoDevice() {
    // WebGPU is dramatically faster, but quantised weights are unreliable on
    // it, so only take that path when a float model was downloaded.
    const floatModel = this.options.dtype === "fp32" || this.options.dtype === "fp16";
    return "gpu" in navigator && floatModel ? "webgpu" : "wasm";
  }

  _onMessage(event) {
    const data = event.data || {};
    if (data.type === "ready") {
      this.device = data.device;
      this.voices = this._buildVoiceList(data.voices);
      this._resolveReady(this);
      return;
    }
    if (data.type === "init-error") {
      this._rejectReady(new Error(data.message));
      return;
    }
    if (data.type === "progress") {
      if (this.options.onProgress) this.options.onProgress(data);
      return;
    }

    const entry = this._pending.get(data.id);
    if (!entry) return;
    this._pending.delete(data.id);
    if (data.type === "audio") {
      const blob = encodeWav16(data.pcm, data.sampleRate);
      entry.resolve({
        url: URL.createObjectURL(blob),
        duration: data.pcm.length / data.sampleRate,
      });
    } else {
      entry.reject(new Error(data.message || "synthesis failed"));
    }
  }

  /** English voices only, best-graded first. */
  _buildVoiceList(table) {
    return Object.entries(table || {})
      .filter(([, meta]) => String(meta.language || "").toLowerCase().startsWith("en"))
      .map(([id, meta]) => ({
        id,
        label: meta.traits ? `${meta.name} ${meta.traits}` : meta.name,
        group: meta.language === "en-gb" ? "British English" : "American English",
        badge: meta.overallGrade || "",
        note: meta.gender || "",
        score: gradeScore(meta.overallGrade),
      }))
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }

  _cacheKey(text, voice, speed) {
    return `${voice} ${speed} ${text}`;
  }

  /** Synthesise (or return a cached clip). Safe to call ahead of playback. */
  prepare(text, { voice, speed = 1 } = {}) {
    const key = this._cacheKey(text, voice, speed);
    const cached = this._cache.get(key);
    if (cached) {
      // Refresh recency for the eviction below.
      this._cache.delete(key);
      this._cache.set(key, cached);
      return cached;
    }

    const id = this._nextId++;
    const promise = new Promise((resolve, reject) => {
      this._pending.set(id, { resolve, reject });
      this._worker.postMessage({ type: "generate", id, text, voice, speed });
    }).catch((error) => {
      this._cache.delete(key);
      throw error;
    });

    this._cache.set(key, promise);
    this._evict();
    return promise;
  }

  _evict() {
    while (this._cache.size > this._maxCached) {
      const oldestKey = this._cache.keys().next().value;
      const oldest = this._cache.get(oldestKey);
      this._cache.delete(oldestKey);
      Promise.resolve(oldest)
        .then((clip) => clip && URL.revokeObjectURL(clip.url))
        .catch(() => {});
    }
  }

  clearCache() {
    for (const entry of this._cache.values()) {
      Promise.resolve(entry)
        .then((clip) => clip && URL.revokeObjectURL(clip.url))
        .catch(() => {});
    }
    this._cache.clear();
  }

  play(clip, options) {
    const playback = new ClipPlayback(clip, options);
    playback.play().catch((error) => {
      if (options && options.onerror) options.onerror(error);
    });
    return playback;
  }

  dispose() {
    this.clearCache();
    this._worker.terminate();
  }
}

/** Playback backed by the browser's speech synthesis. */
class UtterancePlayback {
  constructor(text, { voice, rate, onended, onerror }) {
    this.duration = null; // not knowable up front
    this._stopped = false;
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.lang = voice ? voice.lang : "en-US";
    utterance.addEventListener("end", () => {
      this._clearKeepAlive();
      if (!this._stopped && onended) onended();
    });
    utterance.addEventListener("error", (event) => {
      this._clearKeepAlive();
      // "interrupted"/"canceled" are our own stop() calls.
      if (this._stopped || event.error === "interrupted" || event.error === "canceled") {
        return;
      }
      if (onerror) onerror(new Error(event.error || "speech failed"));
    });
    this._utterance = utterance;
  }

  play() {
    speechSynthesis.cancel();
    speechSynthesis.speak(this._utterance);
    // Chrome on macOS silently drops long utterances; nudging keeps it alive.
    this._keepAlive = setInterval(() => {
      if (speechSynthesis.speaking && !speechSynthesis.paused) speechSynthesis.resume();
    }, 8000);
  }

  pause() {
    speechSynthesis.pause();
  }

  resume() {
    speechSynthesis.resume();
  }

  setRate() {
    // Rate is fixed once an utterance is speaking; the player re-speaks it.
  }

  stop() {
    this._stopped = true;
    this._clearKeepAlive();
    speechSynthesis.cancel();
  }

  _clearKeepAlive() {
    if (this._keepAlive) clearInterval(this._keepAlive);
    this._keepAlive = null;
  }
}

/** Voices macOS ships that are worth putting at the top of the list. */
const MAC_PREFERRED = [
  "ava", "allison", "samantha", "susan", "zoe", "nicky", "aaron", "tom",
  "alex", "daniel", "serena", "karen", "moira", "fiona", "rishi", "siri",
];

export class SystemEngine {
  static id = "system";

  constructor() {
    this.id = SystemEngine.id;
    this.label = "System voices";
    this.canPrefetch = false;
    this.device = "system";
    this.voices = [];
    this._byId = new Map();

    this.ready = new Promise((resolve, reject) => {
      if (typeof speechSynthesis === "undefined") {
        reject(new Error("This browser has no speech synthesis support."));
        return;
      }
      const load = () => {
        const found = speechSynthesis.getVoices();
        if (found.length === 0) return false;
        this._ingest(found);
        resolve(this);
        return true;
      };
      // getVoices() stays empty until the platform has enumerated them.
      if (!load()) {
        speechSynthesis.addEventListener("voiceschanged", load);
        setTimeout(() => {
          if (this.voices.length === 0) reject(new Error("No voices were found."));
        }, 5000);
      }
    });
  }

  _ingest(all) {
    const english = all.filter((v) => String(v.lang || "").toLowerCase().startsWith("en"));
    this.voices = english
      .map((voice) => {
        const name = voice.name.toLowerCase();
        let score = 0;
        if (name.includes("premium")) score += 100;
        else if (name.includes("enhanced")) score += 80;
        if (MAC_PREFERRED.some((n) => name.includes(n))) score += 60;
        // Network voices break the offline requirement, so sink them.
        score += voice.localService ? 40 : -50;
        if (/^en-(us|gb)$/i.test(voice.lang)) score += 5;

        this._byId.set(voice.voiceURI, voice);
        return {
          id: voice.voiceURI,
          label: voice.name,
          group: voice.localService ? "Offline voices" : "Network voices",
          badge: voice.lang,
          note: voice.localService ? "" : "needs network",
          score,
        };
      })
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
  }

  /** Nothing to pre-render; the text itself is the clip. */
  prepare(text) {
    return Promise.resolve({ text, duration: null });
  }

  play(clip, { rate = 1, voiceId, onended, onerror } = {}) {
    const playback = new UtterancePlayback(clip.text, {
      voice: this._byId.get(voiceId) || null,
      rate,
      onended,
      onerror,
    });
    playback.play();
    return playback;
  }

  clearCache() {}

  dispose() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  }
}
