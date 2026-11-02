# Browser demo and relay client

## Live-mode limitation

The relay itself loads its existing root environment file in live mode; the
credential variable is `GNANI_API_KEY`. This UI task does not read that file or
run live provider requests.

Current `apps/relay/src/server.ts` rejects `session.start.scenario` in live mode
before checking `DEMO_MODE`. Setting `DEMO_MODE=1` does not make the dropdown stream
synthetic WAVs through real STT. That requires a relay change, outside this task.
Live microphone role-play is separate. Existing cached warning WAVs are loaded
by the relay; a cache miss can invoke TTS.

PowerShell terminal 1 (stop the previous mock relay first):

```powershell
Set-Location ./scam-call-shield
$env:RELAY_MODE = 'live'
$env:DEMO_MODE = '1'
$env:ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
$env:MAX_SESSION_SECONDS = '300'
$env:PORT = '8787'
$env:DEBUG_TRANSCRIPTS = '0'
npm run dev:relay:live
```

Terminal 2:

```powershell
Set-Location ./scam-call-shield
$env:NEXT_PUBLIC_RELAY_URL = 'ws://localhost:8787/ws'
npm run dev:web -- --port 3000
```

Open after both servers are ready:

```powershell
Start-Process 'http://localhost:3000/#interactive-demo-title'
```

The existing CLI streams a local synthetic WAV without a `scenario` field. It
reports warning bytes; it does not play warnings through the web UI:

```powershell
Set-Location ./scam-call-shield
npm run build:node
$env:RELAY_URL = 'ws://localhost:8787/ws'
node apps/relay/scripts/stream-wav.mjs data/scenarios/audio/kyc-otp.wav en-IN --max-audio-seconds=30
```

## Native leftovers retained locally

Inventory by file length, 2026-10-30; no files deleted:

| Folder | Files | Bytes | Ignore coverage |
| --- | ---: | ---: | --- |
| apps/mobile/android/ | 1,038 | 526,402,974 | New explicit rule |
| apps/mobile/.expo/ | 10 | 59,833 | New explicit rule |
| apps/mobile/dist/ | 3 | 5,718,628 | Existing dist/ rule |
| apps/mobile/node_modules/ | 4,430 | 68,293,184 | Existing node_modules/ rule |

Total: 600,474,619 bytes (about 572.66 MiB). Generated Android files and Expo
caches stay local. The absent apps/mobile/ios/ path is also ignored for future
generated output. ESLint ignores generated Android/Expo paths as well.

The home page demo has two independent modes:

- **Scripted demo** retains the prepared text timeline. It is labeled
  "Scripted preview, not live" and makes no microphone or relay requests.
- **Live relay** displays actual responses from the configured relay. Choose
  a synthetic scenario (no microphone) or microphone input for synthetic role-play.
  The mock provider does not transcribe microphone speech; it returns scripted text
  and a warning tone. Live transcription requires the relay operator to configure
  a live provider separately. This task does not configure or call Gnani.

## Local manual check (PowerShell)

From a checkout with dependencies installed, use two terminals. No environment file
is needed. If dependencies are missing, run `npm ci` once from the root first.

Terminal 1:

```powershell
Set-Location ./scam-call-shield
$env:RELAY_MODE = 'mock'
$env:PORT = '8787'
$env:ALLOWED_ORIGINS = 'http://localhost:3000,http://127.0.0.1:3000'
$env:DEBUG_TRANSCRIPTS = '0'
npm run dev:relay -- --mock
```

Terminal 2:

```powershell
Set-Location ./scam-call-shield
$env:NEXT_PUBLIC_RELAY_URL = 'ws://localhost:8787/ws'
npm run dev:web -- --port 3000
```

Then open the page:

```powershell
Start-Process 'http://localhost:3000/#interactive-demo-title'
```

Choose **Live relay**, leave **Scenario playback** selected, select a scenario,
check consent, and click **Start scenario**. Expect appended transcripts and relay
risk updates; KYC/OTP should reach danger and play a quiet mock tone. The genuine
bank alert and borderline delivery should stay below danger and produce no warning
audio. Press **Stop session** to end; a new start uses a fresh socket and state.

For the microphone transport check, select **Microphone**, confirm consent, click
**Start microphone**, allow the browser permission, and speak synthetic dialogue.
In mock mode, displayed transcripts remain scripted regardless of what you say.
Confirm Stop turns off the browser microphone indicator. Test denial, stopping
while the permission prompt is open, switching demo mode, and stopping the relay:
capture must stop, prior risk must clear, and retry must require another click.

## Configuration and limits

`NEXT_PUBLIC_RELAY_URL` is the only public configuration variable. Its name is in
the example template; an empty/unset value defaults to `ws://localhost:8787/ws`.
For a remote relay use `wss://host/ws` and configure the relay's allowed browser
origin. Plain `ws://` is accepted only for loopback hosts. Restart the dev server
after changing the value; production builds embed public configuration at build
time. Never put private credentials in this value, URL queries or browser code.

Microphone capture needs HTTPS or localhost and AudioWorklet support. It starts
only after consent, Start and `session.ready`; it never intercepts cellular calls.
The worklet mixes channels to mono. A streaming converter uses the actual audio
context sample rate, resamples to 16 kHz, encodes PCM16 little endian and emits
1024-byte frames directly from the worklet sample clock, including batched callbacks. There is no browser timer queue. WebSocket backpressure above 256 KiB stops capture with a clear slow-connection error. Incomplete tail samples are discarded on Stop.

Warnings are complete WAV messages validated before playback. Start unlocks the
audio context; if autoplay is blocked the UI offers **Play warning**. Capture
forwarding pauses during warning playback to avoid transcribing the app's own
speaker output. Transcript history is bounded to 256 segments and held in memory
only. Stop, unmount, page hiding and disconnection stop capture and playback;
pending permission requests are also cleaned up when they resolve. No automatic
reconnect or recording, persistent audio, transcript logging, or saved-session
feature is implemented.

Contract v1.2 has no mode-reporting field. The UI reads mock/live from the separate HTTP health endpoint, never from transcript text. Protocol message types are imported
from `@scamcall/protocol`; runtime schemas reject malformed/unknown fields, wrong
session IDs, decreasing risk and risk references to unknown transcript segments.
Session errors are displayed as code and message and stop uncertain monitoring,
even when marked recoverable. No contract or relay changes are required.

Run `npm test -w apps/web`, `npm run typecheck`, `npm run lint`, and
`npm run build` from the root. Tests use fake WebSockets, worklet inputs and media
devices; physical microphone capture and browser playback still need manual checks.

## UI polish copy changes (2026-10-30)

- `apps/web/components/layout/site-header.tsx`: `<ProtectionReadiness><Button size="sm">Start Protection</Button></ProtectionReadiness>` -> `<Button asChild size="sm"><a href="#interactive-demo-title">Try the demo</a></Button>`.
- `apps/web/components/layout/mobile-navigation.tsx`: `A call-safety research prototype. Live protection is not connected yet.` -> `A research prototype for synthetic scam-awareness examples.`.
- `apps/web/components/layout/mobile-navigation.tsx`: `href="#start-protection">Start Protection<small>Review availability and microphone privacy first` -> `href="#interactive-demo-title">Try the demo<small>Synthetic examples and consented prototype testing`.
- `apps/web/components/marketing/hero-actions.tsx`: `<ProtectionReadiness><Button size="lg">Start Protection<ArrowRight data-icon="inline-end" aria-hidden="true" /></Button></ProtectionReadiness>` -> `<Button asChild size="lg"><a href="#interactive-demo-title">Try the demo<ArrowRight data-icon="inline-end" aria-hidden="true" /></a></Button>`.
- `apps/web/components/marketing/hero.tsx`: `Spot the scam<br />before it’s too late.` -> `Explore the signs.<br />Practise when to pause.`.
- `apps/web/components/marketing/hero.tsx`: `Research prototype. Live microphone protection is not connected.` -> `Research prototype. Synthetic examples only; not for real calls.`.
- `apps/web/components/marketing/features.tsx`: `Thoughtful protection, by design` -> `A thoughtful prototype, by design`.
- `apps/web/components/marketing/protection-readiness.tsx`: `Close protection information` -> `Close prototype information`.
- `apps/web/components/marketing/protection-readiness.tsx`: `Before you start protection` -> `Before you try the prototype`.
- `apps/web/components/marketing/protection-readiness.tsx`: `This preview does not yet have a verified live microphone-to-provider connection.` -> `This is a synthetic-testing prototype, not a real-call protection service.`.
- `apps/web/components/marketing/protection-readiness.tsx`: `Once live protection is available, it will require explicit consent, microphone access and a call on speakerphone nearby. Browsers cannot intercept normal phone calls.` -> `Microphone testing requires explicit consent and Start in the live demo. Speak synthetic dialogue only. Browsers cannot intercept normal phone calls.`.
- `apps/web/components/marketing/safety-trust.tsx`: `Live protection will need your explicit consent before requesting microphone access. Place the call on speakerphone near the device.` -> `Prototype microphone testing needs explicit consent. Use synthetic role-play only.`.
- `apps/web/components/marketing/safety-trust.tsx`: `Understand what happens today, and what needs to be ready before live protection can listen.` -> `Understand the prototype workflow and its limits before testing synthetic dialogue.`.
- `apps/web/components/marketing/safety-trust.tsx`: `Review protection availability` -> `Review prototype limits`.
- `apps/web/components/marketing/safety-trust.tsx`: `Before you rely on live protection` -> `Before you test the prototype`.
- `apps/web/components/how-it-works.tsx`: `Illustrative workflow · Live protection not connected` -> `Illustrative prototype workflow · Synthetic testing only`.
- `apps/web/components/how-it-works.tsx`: `Planned protection workflow` -> `Prototype analysis workflow`.
- `apps/web/components/marketing/hero-product-window.tsx`: `Explore the simulated protection workflow` -> `Explore the simulated prototype workflow`.


## Mode and audio-flow diagnostics (2026-10-30)

Select Live relay to fetch the same relay host's /health over HTTP(S). An amber
badge identifies MOCK and warns that speech is not transcribed, a green badge
identifies LIVE (Gnani Prisma + Timbre), and a red badge identifies unreachable
or invalid health responses. Refresh relay status in Technical details or press
Start to refresh. Selecting Microphone against mock shows a visible warning;
mode alone does not disable Start. Use `npm run dev:relay:live` for explicit live
startup. The relay loads its private configuration; no key belongs in the web app.

Collapsed Technical details show permission/capture setup state, actual
AudioContext sample rate, successfully sent frame/byte totals, and last valid
relay message type/time. Counts reset on a fresh session and remain visible after
Stop for diagnosis. Scenario playback correctly shows zero microphone frames.

One controlled real-STT CLI run on 2026-10-30 succeeded: resolved live startup,
health mode live, 9.824 seconds forwarded, three final transcripts, danger risk,
and 51,244 cached warning bytes (zero TTS characters). The live relay was stopped
and port 8787 verified free. No second session was run. This does not establish
physical-browser microphone or speaker playback verification.


## Microphone input controls (2026-10-30)

Open Technical details for input-device selection, automatic gain control and
noise suppression. Browser default omits a deviceId constraint; choosing a device
requests that exact ID on the next Start. Device enumeration does not open the
microphone. Labels may be blank before permission; the list refreshes after
permission and device changes, with a manual Refresh microphones button.
Settings remain in page memory and are snapshotted for each Start; changing them
during a session does not modify the current stream. Defaults remain automatic
gain control off and noise suppression on (echo cancellation stays on).

Peak and RMS meters next to the frame counter show linear input amplitude from
the mono worklet blocks, before resampling. Readings aggregate at about 10 Hz;
zero indicates silence, not a determination about the speaker. They reset on
Stop and while the warning plays. Browser support for requested constraints
varies; selecting a missing device can require choosing another device and
starting a new consented session. No device IDs, samples or levels are persisted
or logged. Physical device switching remains a manual browser check.

### Cached warning WAV audit

ffprobe was run read-only on every local data/warnings/audio/*.wav file:

| File | Sample rate | Channels | Bits | Codec | Web compatible |
| --- | ---: | ---: | ---: | --- | --- |
| DIGITAL_ARREST.hi-en.Poorvi.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| DIGITAL_ARREST.mr-IN.Zahira.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| MONEY_MOVEMENT.hi-en.Poorvi.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| MONEY_MOVEMENT.mr-IN.Zahira.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| REMOTE_ACCESS.hi-en.Poorvi.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| REMOTE_ACCESS.mr-IN.Zahira.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| SCAM_PATTERN.hi-en.Poorvi.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| SCAM_PATTERN.mr-IN.Zahira.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| SENSITIVE_REQUEST.hi-en.Poorvi.wav | 16000 | 1 | 16 | pcm_s16le | yes |
| SENSITIVE_REQUEST.mr-IN.Zahira.wav | 16000 | 1 | 16 | pcm_s16le | yes |


## Continuous streaming fix (2026-10-31)

The browser sends each complete PCM frame immediately from the worklet callback;
it never re-paces the microphone with a main-thread timeout. The exact 1024-byte
check remains. There is no local browser audio queue, and a 256 KiB WebSocket
buffer guard still stops monitoring when the connection cannot keep up.

Transport counters and levels live in mutable session/store refs. Only the
Technical details diagnostics leaf subscribes to snapshots, at most once per
250 ms; transcript and risk panels are memoized and never receive frame-counter
updates. Source level measurements may aggregate more often without scheduling
React renders. Stop and permission cleanup remain immediate.

The relay's absolute 32 ms deadlines correct timer lateness without exceeding the
elapsed sample-clock frame budget. Small catch-up bursts can occur after late
callbacks; this preserves the average 31.25 frames/s, not a strict minimum gap
between every network arrival. Relay queues and the provider's connecting queue
are bounded to 128 frames each. The provider does not add another relative timer.
Five-minute browser and configured relay session limits, finite network buffers,
permission restrictions and genuine network stalls still apply.


Continuous-streaming validation: 300-second steady and eight-frame-burst fake
producers passed without overflow; a one-millisecond-late relay timer retained
31.25 frames/s average with no accumulated drift. Diagnostics never exceeded
four publications per second. One authorized real synthetic-file CLI run stayed
up through all 9.824 seconds forwarded, returned three transcripts, reached
danger, and delivered 51,244 cached warning bytes, then ended normally. Both
local demo ports were verified free after stopping. This short real file run
validates the CLI/relay path; long physical-microphone use remains a manual check.
