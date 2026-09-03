#!/usr/bin/env bash
#
# Vendor everything the shadowing tool needs so it runs fully offline.
#
# Downloads (once, into ./vendor):
#   lib/    the self-contained kokoro-js web bundle
#   ort/    the ONNX Runtime wasm files transformers.js expects
#   model/  Kokoro-82M weights, tokeniser and the English voice vectors
#
# The library, the wasm runtime and the voice vectors all come out of two npm
# tarballs rather than 30-odd separate CDN requests; only the model weights
# have to come from Hugging Face.
#
# Usage:  ./tools/setup.sh [--dtype q8|fp16|fp32|q4|q4f16] [--all-voices]

set -euo pipefail

KOKORO_VERSION="1.2.1"
TRANSFORMERS_VERSION="3.5.1"
NPM_REGISTRY="https://registry.npmjs.org"
HF_BASE="https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main"

DTYPE="q8"
ALL_VOICES=0

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDOR="${ROOT}/vendor"
CACHE="${VENDOR}/.cache"

ENGLISH_VOICES=(
  af_alloy af_aoede af_bella af_heart af_jessica af_kore af_nicole af_nova
  af_river af_sarah af_sky
  am_adam am_echo am_eric am_fenrir am_liam am_michael am_onyx am_puck am_santa
  bf_alice bf_emma bf_isabella bf_lily
  bm_daniel bm_fable bm_george bm_lewis
)

OTHER_VOICES=(
  ef_dora em_alex em_santa ff_siwis hf_alpha hf_beta hm_omega hm_psi
  if_sara im_nicola jf_alpha jf_gongitsune jf_nezumi jf_tebukuro jm_kumo
  pf_dora pm_alex pm_santa zf_xiaobei zf_xiaoni zf_xiaoxiao zf_xiaoyi
  zm_yunjian zm_yunxi zm_yunxia zm_yunyang
)

ORT_FILES=(ort-wasm-simd-threaded.jsep.mjs ort-wasm-simd-threaded.jsep.wasm)

usage() {
  sed -n '2,15p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dtype) DTYPE="${2:-}"; shift 2 ;;
    --all-voices) ALL_VOICES=1; shift ;;
    -h|--help) usage ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done

# transformers.js turns a dtype into this model filename suffix.
case "$DTYPE" in
  fp32)  SUFFIX="" ;;
  fp16)  SUFFIX="_fp16" ;;
  q8)    SUFFIX="_quantized" ;;
  q4)    SUFFIX="_q4" ;;
  q4f16) SUFFIX="_q4f16" ;;
  *) echo "unsupported --dtype: ${DTYPE} (use q8, fp16, fp32, q4 or q4f16)" >&2; exit 2 ;;
esac

say()  { printf '\033[1m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[33mwarning:\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[31merror:\033[0m %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null || die "curl が見つかりません"
command -v tar  >/dev/null || die "tar が見つかりません"

size_of() {
  # macOS stat and GNU stat disagree on flags.
  stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo 0
}

human() {
  local bytes="${1:-0}"
  if [[ "$bytes" -ge 1048576 ]]; then printf '%d MB' $((bytes / 1048576))
  else printf '%d KB' $((bytes / 1024)); fi
}

# fetch <url> <destination> <minimum bytes>
fetch() {
  local url="$1" dest="$2" min="$3"
  local tmp="${dest}.part"

  if [[ -f "$dest" ]] && [[ "$(size_of "$dest")" -ge "$min" ]]; then
    printf '    skip  %s\n' "$(basename "$dest")"
    return 0
  fi

  mkdir -p "$(dirname "$dest")"
  printf '    get   %s\n' "$(basename "$dest")"
  if ! curl -fL --retry 4 --retry-delay 2 --retry-all-errors \
       --connect-timeout 20 --progress-bar -o "$tmp" "$url"; then
    rm -f "$tmp"
    return 1
  fi

  local got
  got="$(size_of "$tmp")"
  if [[ "$got" -lt "$min" ]]; then
    rm -f "$tmp"
    warn "$(basename "$dest") が小さすぎます (${got} bytes)"
    return 1
  fi
  mv "$tmp" "$dest"
}

# fetch_any <destination> <minimum bytes> <url...>  — first URL that works wins.
fetch_any() {
  local dest="$1" min="$2"; shift 2
  local url
  for url in "$@"; do
    fetch "$url" "$dest" "$min" && return 0
  done
  die "取得できませんでした: $(basename "$dest")

  ネットワークかプロキシの設定を確認して、もう一度実行してください。
  途中まで取得したファイルは ${VENDOR} に残るので、再実行しても無駄になりません。"
}

# extract <tarball> <destination dir> <member path...>
extract() {
  local tarball="$1" dest="$2"; shift 2
  mkdir -p "$dest"
  # --strip-components=2 drops the "package/<dir>/" prefix npm tarballs carry.
  tar -xzf "$tarball" -C "$dest" --strip-components=2 "$@" \
    || die "展開に失敗しました: $(basename "$tarball")"
}

mkdir -p "$CACHE"

say "1/4  npm パッケージを取得"
KOKORO_TGZ="${CACHE}/kokoro-js-${KOKORO_VERSION}.tgz"
TRANSFORMERS_TGZ="${CACHE}/transformers-${TRANSFORMERS_VERSION}.tgz"
fetch_any "$KOKORO_TGZ" 20000000 \
  "${NPM_REGISTRY}/kokoro-js/-/kokoro-js-${KOKORO_VERSION}.tgz"
fetch_any "$TRANSFORMERS_TGZ" 5000000 \
  "${NPM_REGISTRY}/@huggingface/transformers/-/transformers-${TRANSFORMERS_VERSION}.tgz"

say "2/4  ライブラリと ONNX Runtime を展開"
extract "$KOKORO_TGZ" "${VENDOR}/lib" package/dist/kokoro.web.js
printf '    ok    kokoro.web.js (%s)\n' "$(human "$(size_of "${VENDOR}/lib/kokoro.web.js")")"

ORT_MEMBERS=()
for ort_file in "${ORT_FILES[@]}"; do
  ORT_MEMBERS+=("package/dist/${ort_file}")
done
extract "$TRANSFORMERS_TGZ" "${VENDOR}/ort" "${ORT_MEMBERS[@]}"
for ort_file in "${ORT_FILES[@]}"; do
  [[ -s "${VENDOR}/ort/${ort_file}" ]] || die "見つかりません: ${ort_file}"
  printf '    ok    %s (%s)\n' "$ort_file" "$(human "$(size_of "${VENDOR}/ort/${ort_file}")")"
done

say "3/4  音声ベクトルを展開"
VOICES=("${ENGLISH_VOICES[@]}")
if [[ "$ALL_VOICES" -eq 1 ]]; then
  VOICES+=("${OTHER_VOICES[@]}")
fi
VOICE_MEMBERS=()
for voice in "${VOICES[@]}"; do
  VOICE_MEMBERS+=("package/voices/${voice}.bin")
done
extract "$KOKORO_TGZ" "${VENDOR}/model/voices" "${VOICE_MEMBERS[@]}"
VOICE_COUNT="$(find "${VENDOR}/model/voices" -name '*.bin' | wc -l | tr -d ' ')"
printf '    ok    %s 種類\n' "$VOICE_COUNT"

say "4/4  Kokoro-82M モデル (dtype=${DTYPE})"
for meta in config.json tokenizer.json tokenizer_config.json; do
  fetch_any "${VENDOR}/model/${meta}" 20 "${HF_BASE}/${meta}"
done
fetch_any "${VENDOR}/model/onnx/model${SUFFIX}.onnx" 10000000 \
  "${HF_BASE}/onnx/model${SUFFIX}.onnx"

python3 -c "import json,sys; json.load(open(sys.argv[1]))" \
  "${VENDOR}/model/config.json" 2>/dev/null \
  || die "config.json が壊れています。${VENDOR}/model を削除して再実行してください"

MODEL_BYTES="$(size_of "${VENDOR}/model/onnx/model${SUFFIX}.onnx")"

cat > "${VENDOR}/manifest.json" <<JSON
{
  "dtype": "${DTYPE}",
  "modelFile": "onnx/model${SUFFIX}.onnx",
  "kokoroVersion": "${KOKORO_VERSION}",
  "transformersVersion": "${TRANSFORMERS_VERSION}",
  "voices": ${VOICE_COUNT},
  "createdAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

say "完了"
printf '    モデル : model%s.onnx (%s)\n' "$SUFFIX" "$(human "$MODEL_BYTES")"
printf '    音声   : %s 種類\n' "$VOICE_COUNT"
printf '    tarball のキャッシュは %s にあります（消しても動作します）\n' "$CACHE"
printf '\n次のコマンドで起動します:\n\n    ./tools/serve.py\n\n'
