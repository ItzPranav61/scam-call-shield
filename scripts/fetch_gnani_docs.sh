#!/usr/bin/env bash
# Run on YOUR machine (the cloud sandbox cannot reach docs.gnani.ai).
# Downloads raw Gnani docs + specs into docs/gnani/raw/.
set -euo pipefail
cd "$(dirname "$0")/../docs/gnani"
mkdir -p raw
B=https://docs.gnani.ai
for p in \
  api/introduction/quick-start.md api/STT/speech-to-text.md api/STT/stt-websocket.md \
  api/TTS/available-voices.md api/TTS/tts-inference.md api/TTS/tts-sse.md \
  api/TTS/tts-websocket.md api/TTS/tts-audio-tags.md api/TTS/tts-input-formating.md \
  python-sdk/introduction.md python-sdk/speech-to-text.md python-sdk/text-to-speech.md \
  STT.yml TTS.yml stt-websocket.yml tts-websocket.yml; do
  out="raw/$(echo "$p" | tr '/' '_')"
  curl -fsSL "$B/$p" -o "$out" && echo "ok  $out" || echo "FAIL $p"
done
