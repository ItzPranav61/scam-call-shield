#!/usr/bin/env python3
"""One STT call, then one TTS call; no retries.

Windows setup: python -m pip install requests python-dotenv
Run: python scripts/smoke_test.py data/sample.wav (or use py).
API facts come only from docs/gnani/raw/*.md.
"""

import os
from pathlib import Path
import sys

import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://api.vachana.ai"


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    load_dotenv(ROOT / ".env")
    key = os.environ.get("GNANI_API_KEY", "").strip()
    if not key:
        print("GNANI_API_KEY missing")
        return 2

    def redact(value):
        return str(value).replace(key, "[REDACTED]")

    if len(sys.argv) != 2:
        print("Usage: python scripts/smoke_test.py data/sample.wav")
        return 2
    source = Path(sys.argv[1])
    if not source.is_file():
        print("Sample audio missing; add a synthetic clip of at most 30 seconds.")
        return 2
    voice = os.environ.get("TTS_VOICE", "").strip()
    if not voice:
        print("Set TTS_VOICE in .env from the raw voice catalog")
        return 2
    headers = {"X-API-Key-ID": key}
    try:
        # api_STT_speech-to-text.md:24,36,44-54,273,278.
        with source.open("rb") as audio:
            response = requests.post(
                f"{BASE}/stt/v3", headers=headers,
                files={"audio_file": audio},
                data={"language_code": os.environ.get("STT_LANG", "en-IN"),
                      "format": "verbatim"}, timeout=60,
            )
        print("STT HTTP", response.status_code)
        if response.status_code != 200:
            print(redact(response.text))
            return 1
        # api_STT_speech-to-text.md:113-116.
        try:
            result = response.json()
        except ValueError:
            print("Invalid STT JSON:", redact(response.text))
            return 1
        if (not isinstance(result, dict) or result.get("success") is not True
                or not isinstance(result.get("transcript"), str)
                or not result["transcript"].strip()):
            print("STT response lacks a successful nonempty transcript:", redact(response.text))
            return 1
        print("Transcript:", redact(result["transcript"]))

        # api_TTS_tts-inference.md:61-67,168,490-493.
        body = {
            "text": "Savdhaan. Yeh call dhokha ho sakta hai. Apna O T P kisi ko mat batayein.",
            "model": os.environ.get("TTS_MODEL", "timbre-v2.5"),
            "voice": voice,
            "language": os.environ.get("TTS_LANG", "hi-en"),
            "audio_config": {"sample_rate": 48000, "num_channels": 1,
                             "sample_width": 2, "encoding": "linear_pcm", "container": "wav"},
        }
        response = requests.post(
            f"{BASE}/api/v1/tts/inference", headers=headers, json=body, timeout=60,
        )
        content_type = response.headers.get("content-type", "")
        print("TTS HTTP", response.status_code)
        print("TTS content-type:", redact(content_type))
        print("TTS bytes:", len(response.content))
        if response.status_code != 200:
            print(redact(response.text))
            return 1
        if (content_type.split(";", 1)[0].strip().lower() != "audio/wav"
                or not response.content.startswith(b"RIFF")
                or response.content[8:12] != b"WAVE"):
            print("TTS response is not the requested WAV audio:", redact(response.text))
            return 1
        output = ROOT / "tts_out.wav"
        output.write_bytes(response.content)
        print("Output:", output.name)
        return 0
    except requests.RequestException as error:
        print("Request failed:", redact(error))
        return 1
    except OSError as error:
        print("File operation failed:", redact(error))
        return 1


if __name__ == "__main__":
    sys.exit(main())
