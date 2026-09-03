/**
 * English shadowing practice tool.
 *
 * Flow: paste text -> split into sentences -> play one sentence -> pause so
 * the learner can read it aloud -> move on. The player owns a `generation`
 * token so that any in-flight synthesis from an abandoned sentence is
 * discarded instead of interrupting whatever the user asked for next.
 */

import { splitSentences, ABBR_NEVER, ABBR_SOFT, ABBR_ACRONYM } from "./splitter.js";
import { KokoroEngine, SystemEngine } from "./tts.js";

const STORAGE_KEY = "shadowing-settings-v2";

const SAMPLE_TEXT = [
  "Dr. Ellis arrived at the lab at 8 a.m. She had been reading about the",
  "U.S. space programme for weeks. “We should start today,” she said.",
  "Her colleague, Mr. Tanaka, disagreed. He wanted more data, e.g. the",
  "readings from the second sensor, before committing to anything.",
  "",
  "They argued for an hour. Finally they agreed on a compromise: run the",
  "test at 3 p.m. and review the results together in the morning.",
].join("\n");

const el = (id) => document.getElementById(id);

const dom = {
  source: el("srcText"),
  split: el("btnSplit"),
  sample: el("btnSample"),
  clear: el("btnClear"),
  newline: el("chkNewline"),
  list: el("sentenceList"),
  empty: el("emptyState"),
  play: el("btnPlay"),
  prev: el("btnPrev"),
  repeat: el("btnRepeat"),
  next: el("btnNext"),
  stop: el("btnStop"),
  speed: el("rngSpeed"),
  speedOut: el("outSpeed"),
  pause: el("rngPause"),
  pauseOut: el("outPause"),
  pauseMode: el("selPauseMode"),
  pauseFixed: el("pauseFixedRow"),
  pauseRatio: el("pauseRatioRow"),
  ratio: el("rngRatio"),
  ratioOut: el("outRatio"),
  mode: el("selMode"),
  engine: el("selEngine"),
  voice: el("selVoice"),
  nativeSpeed: el("chkNativeSpeed"),
  nativeSpeedRow: el("nativeSpeedRow"),
  status: el("statusText"),
  counter: el("counter"),
  progressWrap: el("progressWrap"),
  progressBar: el("progressBar"),
  progressLabel: el("progressLabel"),
  setupNotice: el("setupNotice"),
  setupTitle: el("setupTitle"),
  setupBody: el("setupBody"),
  setupReason: el("setupReason"),
  noticeClose: el("noticeClose"),
  settingsPanel: el("settingsPanel"),
  inputPanel: el("inputPanel"),
  abbr: el("abbrText"),
  abbrBuiltin: el("abbrBuiltin"),
  engineInfo: el("engineInfo"),
};

const defaults = {
  text: "",
  speed: 1,
  pauseSeconds: 2,
  pauseMode: "fixed",
  pauseRatio: 1,
  mode: "continuous",
  engineId: "kokoro",
  voiceIds: {},
  nativeSpeed: false,
  splitOnNewline: false,
  extraAbbreviations: "",
  noticeDismissed: false,
};

const state = { ...defaults, sentences: [], index: 0 };

/**
 * Served from a real host (GitHub Pages, say) rather than tools/serve.py.
 * The Kokoro model only exists next to the local server, so a hosted copy is
 * a system-voice tool and should say so instead of quoting a shell command.
 */
const IS_LOCAL_SERVER =
  location.protocol === "file:" ||
  /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/.test(location.hostname);

const isSmallScreen = () => window.matchMedia("(max-width: 700px)").matches;

/** Persisted UI settings; sentences and playback state are not saved. */
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    Object.assign(state, defaults, JSON.parse(raw));
  } catch {
    // Corrupt or blocked storage is not worth failing the app over.
  }
}

function saveSettings() {
  const { sentences, index, ...persisted } = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Private browsing may refuse writes.
  }
}

// ---------------------------------------------------------------- playback

let engine = null;
let engineReady = false;
// Which engine is actually running. May differ from state.engineId after a
// fallback, so that the user's preference survives a broken model download.
let activeEngineId = null;
let playback = null;
let generation = 0;
let phase = "idle"; // idle | loading | speaking | gap | waiting | done
let gapTimer = null;
let gapFrame = null;
let gap = null; // { endsAt, durationMs, remaining }

let wakeLock = null;

/** Keep the phone awake while a practice run is going. */
async function acquireWakeLock() {
  if (wakeLock || !("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => {
      wakeLock = null;
    });
  } catch {
    // Denied or unsupported; practice still works, the screen just dims.
  }
}

function releaseWakeLock() {
  if (!wakeLock) return;
  const held = wakeLock;
  wakeLock = null;
  held.release().catch(() => {});
}

function setStatus(text, kind = "") {
  dom.status.textContent = text;
  dom.status.className = `status ${kind}`;
}

/** Mobile Safari refuses speech that no tap started. */
function unlockSpeech() {
  if (engine && typeof engine.unlock === "function") engine.unlock();
}

function isActive() {
  return phase === "speaking" || phase === "gap" || phase === "loading";
}

function stopPlayback() {
  generation++;
  if (playback) {
    playback.stop();
    playback = null;
  }
  clearTimeout(gapTimer);
  cancelAnimationFrame(gapFrame);
  gapTimer = null;
  gapFrame = null;
  gap = null;
  phase = "idle";
  updateControls();
}

/** Speed applied by the engine vs. by the audio element. */
function speedSplit() {
  const useNative = state.nativeSpeed && engine && engine.canPrefetch;
  return {
    synthSpeed: useNative ? state.speed : 1,
    playbackRate: useNative ? 1 : state.speed,
  };
}

function currentVoiceId() {
  return state.voiceIds[activeEngineId] || (engine && engine.voices[0] && engine.voices[0].id);
}

async function speakSentence(index) {
  if (!engineReady || state.sentences.length === 0) return;
  unlockSpeech();
  const bounded = Math.max(0, Math.min(index, state.sentences.length - 1));

  stopPlayback();
  const token = ++generation;

  state.index = bounded;
  renderHighlight();

  const text = state.sentences[bounded];
  const { synthSpeed, playbackRate } = speedSplit();
  const voice = currentVoiceId();

  phase = "loading";
  setStatus("音声を生成中…");
  updateControls();

  let clip;
  try {
    clip = await engine.prepare(text, { voice, speed: synthSpeed });
  } catch (error) {
    if (token !== generation) return;
    phase = "idle";
    setStatus(`合成に失敗しました: ${error.message}`, "error");
    updateControls();
    return;
  }
  if (token !== generation) return;

  phase = "speaking";
  setStatus("再生中");
  updateControls();
  acquireWakeLock();

  playback = engine.play(clip, {
    rate: playbackRate,
    voiceId: voice,
    onended: () => onSentenceEnd(token, clip),
    onerror: (error) => {
      if (token !== generation) return;
      phase = "idle";
      setStatus(`再生できませんでした: ${error.message}`, "error");
      updateControls();
    },
  });

  prefetchAhead(bounded, voice, synthSpeed);
}

/** Warm the cache for the next couple of sentences while this one plays. */
function prefetchAhead(index, voice, synthSpeed) {
  if (!engine || !engine.canPrefetch) return;
  for (let offset = 1; offset <= 2; offset++) {
    const next = state.sentences[index + offset];
    if (!next) break;
    Promise.resolve(engine.prepare(next, { voice, speed: synthSpeed })).catch(() => {});
  }
}

function onSentenceEnd(token, clip) {
  if (token !== generation) return;
  playback = null;

  const isLast = state.index >= state.sentences.length - 1;

  if (state.mode === "manual") {
    phase = "waiting";
    setStatus(isLast ? "最後の文です（Space / → で操作）" : "次の文へ: Space または →");
    updateControls();
    return;
  }

  if (isLast) {
    phase = "done";
    setStatus("最後まで再生しました");
    updateControls();
    releaseWakeLock();
    return;
  }

  startGap(token, clip);
}

function gapDurationMs(clip) {
  if (state.pauseMode === "ratio") {
    const spoken = clip && clip.duration ? clip.duration : 3;
    const { playbackRate } = speedSplit();
    return (spoken / playbackRate) * state.pauseRatio * 1000;
  }
  return state.pauseSeconds * 1000;
}

function startGap(token, clip) {
  const durationMs = gapDurationMs(clip);
  if (durationMs <= 0) {
    speakSentence(state.index + 1);
    return;
  }

  phase = "gap";
  gap = { durationMs, remaining: durationMs, endsAt: performance.now() + durationMs };
  updateControls();
  runGapTimer(token);
}

function runGapTimer(token) {
  gap.endsAt = performance.now() + gap.remaining;
  gapTimer = setTimeout(() => {
    if (token !== generation) return;
    speakSentence(state.index + 1);
  }, gap.remaining);

  const tick = () => {
    if (token !== generation || phase !== "gap" || !gap) return;
    const left = Math.max(0, gap.endsAt - performance.now());
    setStatus(`音読してください… ${(left / 1000).toFixed(1)}秒`, "gap");
    dom.progressWrap.hidden = false;
    dom.progressLabel.textContent = "ポーズ";
    dom.progressBar.style.width = `${100 - (left / gap.durationMs) * 100}%`;
    gapFrame = requestAnimationFrame(tick);
  };
  tick();
}

function pauseGap() {
  clearTimeout(gapTimer);
  cancelAnimationFrame(gapFrame);
  gapTimer = null;
  gapFrame = null;
  if (gap) gap.remaining = Math.max(0, gap.endsAt - performance.now());
}

// ------------------------------------------------------------- transport

function togglePlayPause() {
  if (state.sentences.length === 0) return;
  unlockSpeech();

  if (phase === "speaking") {
    playback.pause();
    phase = "paused-speaking";
    setStatus(
      engine && engine.pauseRestarts
        ? "一時停止中（再開すると今の文を最初から読みます）"
        : "一時停止中",
    );
    updateControls();
    return;
  }
  if (phase === "paused-speaking") {
    playback.resume();
    phase = "speaking";
    setStatus("再生中");
    updateControls();
    return;
  }
  if (phase === "gap") {
    pauseGap();
    phase = "paused-gap";
    setStatus("一時停止中（ポーズ）");
    updateControls();
    return;
  }
  if (phase === "paused-gap") {
    phase = "gap";
    runGapTimer(generation);
    updateControls();
    return;
  }
  if (phase === "waiting") {
    // Manual mode: Space advances.
    goTo(state.index + 1);
    return;
  }
  speakSentence(state.index);
}

function goTo(index) {
  if (state.sentences.length === 0) return;
  unlockSpeech();
  if (index < 0 || index >= state.sentences.length) {
    setStatus(index < 0 ? "最初の文です" : "最後の文です");
    return;
  }
  dom.progressWrap.hidden = true;

  // Moving the highlight must work even while the model is still loading.
  if (!engineReady) {
    stopPlayback();
    state.index = index;
    renderHighlight();
    setStatus("音声エンジンを準備中です…");
    updateControls();
    return;
  }
  speakSentence(index);
}

function stopAll() {
  stopPlayback();
  releaseWakeLock();
  dom.progressWrap.hidden = true;
  setStatus("停止中");
}

// ----------------------------------------------------------------- render

function renderSentences() {
  dom.list.innerHTML = "";
  dom.empty.hidden = state.sentences.length > 0;

  const fragment = document.createDocumentFragment();
  state.sentences.forEach((sentence, i) => {
    const item = document.createElement("li");
    item.className = "sentence";
    item.dataset.index = String(i);
    item.tabIndex = 0;

    const number = document.createElement("span");
    number.className = "sentence-number";
    number.textContent = String(i + 1);

    const body = document.createElement("span");
    body.className = "sentence-text";
    body.textContent = sentence;

    item.append(number, body);
    item.addEventListener("click", () => goTo(i));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter") goTo(i);
    });
    fragment.append(item);
  });
  dom.list.append(fragment);
  renderHighlight();
}

function renderHighlight() {
  const items = dom.list.querySelectorAll(".sentence");
  items.forEach((item, i) => {
    const active = i === state.index && state.sentences.length > 0;
    item.classList.toggle("is-active", active);
    if (active) item.scrollIntoView({ block: "center", behavior: "smooth" });
  });
  dom.counter.textContent = state.sentences.length
    ? `${state.index + 1} / ${state.sentences.length}`
    : "0 / 0";
}

function updateControls() {
  const hasText = state.sentences.length > 0;
  const playing = phase === "speaking" || phase === "gap";
  dom.play.textContent = playing ? "⏸ 一時停止" : "▶︎ 再生";
  dom.play.disabled = !hasText || !engineReady;
  // Prev/next only move the highlight, so they stay usable while loading.
  dom.prev.disabled = !hasText;
  dom.next.disabled = !hasText;
  dom.repeat.disabled = !hasText || !engineReady;
  dom.stop.disabled = !hasText;
  if (phase !== "gap" && phase !== "paused-gap") dom.progressWrap.hidden = true;
}

// ---------------------------------------------------------------- splitting

function extraAbbreviations() {
  return state.extraAbbreviations
    .split(/[\s,、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function doSplit() {
  state.text = dom.source.value;
  state.sentences = splitSentences(state.text, {
    splitOnNewline: state.splitOnNewline,
    never: extraAbbreviations(),
  });
  state.index = 0;
  stopPlayback();
  renderSentences();
  updateControls();
  if (isSmallScreen() && state.sentences.length > 0) dom.inputPanel.open = false;
  setStatus(
    state.sentences.length
      ? `${state.sentences.length} 文に分割しました`
      : "テキストを貼り付けてください",
  );
  saveSettings();
}

// ------------------------------------------------------------------ engine

function renderVoices() {
  dom.voice.innerHTML = "";
  if (!engine || engine.voices.length === 0) {
    const option = document.createElement("option");
    option.textContent = "（音声なし）";
    dom.voice.append(option);
    dom.voice.disabled = true;
    return;
  }
  dom.voice.disabled = false;

  const groups = new Map();
  for (const voice of engine.voices) {
    if (!groups.has(voice.group)) groups.set(voice.group, []);
    groups.get(voice.group).push(voice);
  }

  for (const [name, voices] of groups) {
    const group = document.createElement("optgroup");
    group.label = name;
    for (const voice of voices) {
      const option = document.createElement("option");
      option.value = voice.id;
      const bits = [voice.label];
      if (voice.badge) bits.push(`[${voice.badge}]`);
      if (voice.note) bits.push(voice.note);
      option.textContent = bits.join(" ");
      group.append(option);
    }
    dom.voice.append(group);
  }

  const saved = state.voiceIds[activeEngineId];
  const exists = engine.voices.some((v) => v.id === saved);
  const selected = exists ? saved : engine.voices[0].id;
  dom.voice.value = selected;
  state.voiceIds[activeEngineId] = selected;
  saveSettings();
}

async function loadManifest() {
  try {
    const response = await fetch("vendor/manifest.json", { cache: "no-store" });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/** Human-readable cause for the most common setup mistake. */
function describeEngineError(error) {
  const message = String(error.message || error);
  if (message.includes("Could not locate file") || message.includes("404")) {
    return "モデルファイルが見つかりません。tools/setup.sh を最後まで実行してください";
  }
  return message;
}

/** Mark the neural option unavailable rather than letting it fail again. */
function setKokoroAvailability(available) {
  const option = dom.engine.querySelector('option[value="kokoro"]');
  if (!option) return;
  option.disabled = !available;
  option.textContent = available
    ? "Kokoro（ニューラル）"
    : IS_LOCAL_SERVER
      ? "Kokoro（未取得）"
      : "Kokoro（このURLでは使えません）";
}

async function fallbackToSystem(reason) {
  setKokoroAvailability(false);
  dom.setupNotice.hidden = false;
  dom.setupNotice.classList.toggle("is-info", !IS_LOCAL_SERVER);

  if (IS_LOCAL_SERVER) {
    dom.setupTitle.textContent = "音声モデルがまだありません。";
    dom.setupBody.textContent =
      "ターミナルで ./tools/setup.sh を実行するとニューラル音声(Kokoro)が使えます。それまでは端末内蔵の音声で練習できます。";
  } else {
    dom.setupTitle.textContent = "端末内蔵の音声で動作しています。";
    dom.setupBody.textContent =
      "この公開版はダウンロードなしで使えます。より自然なニューラル音声(Kokoro)で練習したい場合は、パソコンにリポジトリを取り込んでローカルで実行してください。";
  }

  // startEngine() overwrites the status line, so the reason lives in the
  // notice. An empty reason means the notice's own text already says it.
  dom.setupReason.textContent = reason;
  // A real failure always shows; the "this is the hosted build" note does not
  // need to reappear on every visit.
  const dismissible = !reason;
  dom.noticeClose.hidden = !dismissible;
  if (dismissible && state.noticeDismissed) dom.setupNotice.hidden = true;
  dom.engine.value = "system";
  setStatus(
    reason
      ? `${reason} — 端末内蔵の音声に切り替えます`
      : "端末内蔵の音声で動作します",
    reason ? "error" : "",
  );
  // state.engineId is left alone so the next launch retries Kokoro.
  await startEngine("system");
}

async function startEngine(id) {
  if (engine) engine.dispose();
  engine = null;
  engineReady = false;
  activeEngineId = id;
  stopPlayback();
  updateControls();

  if (id === "system") {
    dom.nativeSpeedRow.hidden = true;
    engine = new SystemEngine();
  } else {
    const manifest = await loadManifest();
    if (!manifest) {
      await fallbackToSystem("");
      return;
    }
    dom.setupNotice.hidden = true;
    dom.setupReason.textContent = "";
    dom.nativeSpeedRow.hidden = false;
    setKokoroAvailability(true);

    const base = new URL(".", window.location.href).href;
    engine = new KokoroEngine({
      workerUrl: new URL("src/tts-worker.js", base).href,
      libUrl: new URL("vendor/lib/kokoro.web.js", base).href,
      modelBase: new URL("vendor/model/", base).href,
      ortPath: new URL("vendor/ort/", base).href,
      dtype: manifest.dtype,
      device: "auto",
      onProgress: (info) => {
        if (!info.total) return;
        dom.progressWrap.hidden = false;
        dom.progressLabel.textContent = `読み込み中 ${info.file || ""}`;
        dom.progressBar.style.width = `${(info.loaded / info.total) * 100}%`;
      },
    });
    dom.engineInfo.textContent = "モデル読み込み中…";
    setStatus("モデルを読み込み中…（初回はしばらくかかります）");
  }

  try {
    await engine.ready;
    engineReady = true;
    dom.progressWrap.hidden = true;
    renderVoices();
    updateControls();
    dom.engineInfo.textContent =
      engine.id === "kokoro"
        ? `Kokoro-82M / ${engine.options.dtype} / ${engine.device}`
        : "端末内蔵の音声";
    setStatus("準備完了");
  } catch (error) {
    engineReady = false;
    dom.progressWrap.hidden = true;
    updateControls();
    if (id !== "system") {
      dom.engineInfo.textContent = "Kokoro 起動失敗";
      await fallbackToSystem(describeEngineError(error));
      return;
    }
    dom.engineInfo.textContent = "音声なし";
    setStatus(`音声エンジンを起動できませんでした: ${error.message}`, "error");
  }
}

// ------------------------------------------------------------------- wiring

function bindControls() {
  dom.split.addEventListener("click", doSplit);
  dom.sample.addEventListener("click", () => {
    dom.source.value = SAMPLE_TEXT;
    doSplit();
  });
  dom.clear.addEventListener("click", () => {
    dom.source.value = "";
    doSplit();
  });

  dom.play.addEventListener("click", togglePlayPause);
  dom.prev.addEventListener("click", () => goTo(state.index - 1));
  dom.next.addEventListener("click", () => goTo(state.index + 1));
  dom.repeat.addEventListener("click", () => speakSentence(state.index));
  dom.stop.addEventListener("click", stopAll);

  dom.speed.addEventListener("input", () => {
    state.speed = Number(dom.speed.value);
    dom.speedOut.textContent = `${state.speed.toFixed(1)}x`;
    const { playbackRate } = speedSplit();
    if (playback && !state.nativeSpeed) playback.setRate(playbackRate);
    saveSettings();
  });
  dom.speed.addEventListener("change", () => {
    // Re-synthesising is only needed when the model bakes in the speed.
    if (state.nativeSpeed && isActive()) speakSentence(state.index);
  });

  dom.pause.addEventListener("input", () => {
    state.pauseSeconds = Number(dom.pause.value);
    dom.pauseOut.textContent = `${state.pauseSeconds.toFixed(1)}秒`;
    saveSettings();
  });

  dom.ratio.addEventListener("input", () => {
    state.pauseRatio = Number(dom.ratio.value);
    dom.ratioOut.textContent = `${state.pauseRatio.toFixed(1)}倍`;
    saveSettings();
  });

  dom.pauseMode.addEventListener("change", () => {
    state.pauseMode = dom.pauseMode.value;
    applyPauseModeVisibility();
    saveSettings();
  });

  dom.mode.addEventListener("change", () => {
    state.mode = dom.mode.value;
    saveSettings();
  });

  dom.voice.addEventListener("change", () => {
    state.voiceIds[activeEngineId] = dom.voice.value;
    saveSettings();
    if (isActive()) speakSentence(state.index);
  });

  dom.engine.addEventListener("change", async () => {
    state.engineId = dom.engine.value;
    saveSettings();
    await startEngine(state.engineId);
  });

  dom.nativeSpeed.addEventListener("change", () => {
    state.nativeSpeed = dom.nativeSpeed.checked;
    saveSettings();
    if (isActive()) speakSentence(state.index);
  });

  dom.newline.addEventListener("change", () => {
    state.splitOnNewline = dom.newline.checked;
    saveSettings();
    if (dom.source.value.trim()) doSplit();
  });

  dom.abbr.addEventListener("change", () => {
    state.extraAbbreviations = dom.abbr.value;
    saveSettings();
    if (dom.source.value.trim()) doSplit();
  });

  dom.noticeClose.addEventListener("click", () => {
    dom.setupNotice.hidden = true;
    state.noticeDismissed = true;
    saveSettings();
  });

  dom.source.addEventListener("change", () => {
    state.text = dom.source.value;
    saveSettings();
  });
}

function bindKeyboard() {
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    const typing =
      target &&
      (target.tagName === "TEXTAREA" ||
        target.tagName === "INPUT" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

    switch (event.key) {
      case " ":
        event.preventDefault();
        togglePlayPause();
        break;
      case "r":
      case "R":
        event.preventDefault();
        speakSentence(state.index);
        break;
      case "ArrowLeft":
        event.preventDefault();
        goTo(state.index - 1);
        break;
      case "ArrowRight":
        event.preventDefault();
        goTo(state.index + 1);
        break;
      case "Escape":
        stopAll();
        break;
      default:
        break;
    }
  });
}

function applyPauseModeVisibility() {
  dom.pauseFixed.hidden = state.pauseMode !== "fixed";
  dom.pauseRatio.hidden = state.pauseMode !== "ratio";
}

function applySettingsToDom() {
  dom.source.value = state.text;
  dom.speed.value = String(state.speed);
  dom.speedOut.textContent = `${state.speed.toFixed(1)}x`;
  dom.pause.value = String(state.pauseSeconds);
  dom.pauseOut.textContent = `${state.pauseSeconds.toFixed(1)}秒`;
  dom.ratio.value = String(state.pauseRatio);
  dom.ratioOut.textContent = `${state.pauseRatio.toFixed(1)}倍`;
  dom.pauseMode.value = state.pauseMode;
  dom.mode.value = state.mode;
  dom.engine.value = state.engineId;
  dom.nativeSpeed.checked = state.nativeSpeed;
  dom.newline.checked = state.splitOnNewline;
  dom.abbr.value = state.extraAbbreviations;
  dom.abbrBuiltin.textContent = [...ABBR_NEVER, ...ABBR_SOFT, ...ABBR_ACRONYM]
    .map((a) => `${a}.`)
    .join("  ");
  // On a phone the settings would push the transport buttons off screen.
  dom.settingsPanel.open = !isSmallScreen();
  applyPauseModeVisibility();
}

async function main() {
  loadSettings();
  applySettingsToDom();
  bindControls();
  bindKeyboard();
  if (state.text.trim()) doSplit();
  else updateControls();
  await startEngine(state.engineId);
}

main();
