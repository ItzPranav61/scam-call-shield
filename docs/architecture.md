# Phase 0 architecture

The MVP will use an explicitly authorized browser microphone and synthetic scenarios. It cannot intercept cellular calls. The checkout provides a web placeholder, local mock relay, shared types and pure rules-only detector. Provider connections and browser microphone capture remain unimplemented.

```text
Browser microphone -> Next.js -> persistent Node WebSocket relay
                                      -> Gnani realtime STT
                                      -> detector -> browser risk alerts
```

apps/web owns future consent, audio conversion, connection state and warnings. It must not show monitoring as active before session.ready. apps/relay owns provider credentials, protocol validation, bounded buffering, cleanup and upstream event mapping. Current endpoints are GET /health and local mock WebSocket sessions at /ws. Public relay deployment still requires TLS and production session authorization; current access is local-only with an origin allowlist.

packages/detector is independent of React/Next.js. Pure rules operate on explicit per-session state, retaining bounded signal groups rather than transcript text. Risk levels are safe, caution and danger; safe means no strong indicators detected and never guarantees safety. Example indicators include requests for OTP or UPI PIN, immediate money transfers, arrest threats, bank impersonation, suspicious links and remote-access software. Isolated words are insufficient; test false positives and false negatives, including benign warnings about scams, and evaluate each supported language separately.

packages/protocol shares application unions. Its detector imports and detector's protocol aliases are type-only. Protocol builds from source references without stale declarations, then root build runs detector, relay and web. Package exports match each output layout; there is no runtime import cycle. See contract.md for directions and binary framing.

Only the relay may read GNANI_API_KEY. apps/web/.env.local holds only NEXT_PUBLIC_RELAY_URL. Keep server secrets in apps/relay/.env or host-managed environment settings, never the frontend project or NEXT_PUBLIC_ variables. Root .env.example is explanatory, not an instruction to co-locate credentials. No files automatically load relay .env during the scaffold dev command; future integrations must deliberately load server configuration.

Future flow: validate session.start and consent, connect upstream with server headers, await connected, send session.ready, accept PCM, map completed provider transcript to transcript.final, run detector, send risk.update/warning. Provider partial output is unverified; reserve transcript.partial without emitting fabricated partials. Provider protocol stays entirely server-side.

Future failures: stop capturing immediately on disconnect/error/end, discard buffered audio, close upstream, clear timers and in-memory transcripts. A recoverable transport failure may offer a fresh user-started session with renewed readiness; never silently replay audio or claim continuous protection across gaps. Limit connection retries with backoff; invalid authentication/configuration needs operator correction. At provider's 15-minute limit, end explicitly. Do not let a stale safe result represent current coverage.

Latency is not instantaneous: audio framing, network, VAD silence window, transcription and analysis all contribute. Long speech may defer a segment. No latency guarantees or measurements exist yet.

Default application retention: no persistent live audio or transcripts; process only in session memory, discard on end, do not log content. Smoke scripts intentionally save synthetic test artifacts locally in ignored artifacts/smoke for manual verification; delete them afterwards. Provider-side retention/residency remains UNVERIFIED and requires confirmation before real sensitive use.

Deploy frontend on Vercel with apps/web as root; deploy relay later to a persistent WebSocket-capable host. Ordinary Vercel Functions are not permanent WebSocket relay servers. Optional TTS and any external LLM remain future work; LLM eligibility needs challenge-organizer confirmation.
