/**
 * Kokoro inference worker.
 *
 * ONNX inference blocks its thread for seconds at a time, and this tool
 * synthesises the next sentence while the current one is playing, so the
 * model lives off the main thread.
 *
 * The vendored kokoro web bundle hard-codes the Hugging Face URL for both the
 * model weights and the voice vectors, and its exported `env` only surfaces
 * `wasmPaths`. Rewriting `fetch` is therefore the supported way to keep the
 * whole thing offline.
 */

const HF_PREFIX =
  "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/";

let tts = null;
let voices = null;

/** Point every Hugging Face request at the locally vendored copy. */
function redirectToLocal(modelBase) {
  const original = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input && input.url;
    if (typeof url === "string" && url.startsWith(HF_PREFIX)) {
      const local = modelBase + url.slice(HF_PREFIX.length);
      return typeof input === "string" || input instanceof URL
        ? original(local, init)
        : original(new Request(local, input), init);
    }
    return original(input, init);
  };
}

async function init({ libUrl, modelBase, ortPath, dtype, device }) {
  redirectToLocal(modelBase);

  const { KokoroTTS, env } = await import(/* @vite-ignore */ libUrl);
  env.wasmPaths = ortPath;

  const attempts = device === "wasm" ? ["wasm"] : [device, "wasm"];
  let lastError = null;

  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      tts = await KokoroTTS.from_pretrained(
        "onnx-community/Kokoro-82M-v1.0-ONNX",
        {
          dtype,
          device: attempt,
          progress_callback: (p) => {
            if (p && p.status === "progress") {
              self.postMessage({
                type: "progress",
                file: p.file,
                loaded: p.loaded,
                total: p.total,
              });
            }
          },
        },
      );
      voices = tts.voices;
      self.postMessage({ type: "ready", device: attempt, dtype, voices });
      return;
    } catch (error) {
      lastError = error;
      tts = null;
    }
  }
  self.postMessage({
    type: "init-error",
    message: lastError ? String(lastError.message || lastError) : "unknown error",
  });
}

async function generate({ id, text, voice, speed }) {
  try {
    if (!tts) throw new Error("model not loaded");
    const audio = await tts.generate(text, { voice, speed });
    const pcm = audio.audio instanceof Float32Array
      ? audio.audio
      : new Float32Array(audio.audio);
    self.postMessage(
      { type: "audio", id, pcm, sampleRate: audio.sampling_rate },
      [pcm.buffer],
    );
  } catch (error) {
    self.postMessage({
      type: "error",
      id,
      message: String((error && error.message) || error),
    });
  }
}

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "init") init(data);
  else if (data.type === "generate") generate(data);
});
