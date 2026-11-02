# Realtime STT integration notes

The relay owns the upstream WebSocket connection and credentials. Browser audio
follows our [application contract](../contract.md); provider messages remain
internal to the relay. Mock sessions make no Gnani calls.

For provider endpoints, headers, audio requirements and response schemas, consult
[Gnani's realtime STT guide](https://docs.gnani.ai/api/STT/stt-websocket).
This project does not redistribute that guide. Partial-transcript support remains
UNVERIFIED in this integration; the browser receives completed segments.
