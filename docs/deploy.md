# Relay runtime modes and deployment

The default mode (`RELAY_MODE` unset or `mock`) uses synthetic scenario replay and
the existing rules detector. It never calls Gnani or reads credentials; warnings
are generated WAV tones. `RELAY_MODE=live` explicitly selects the real providers.
The legacy `--mock` argument does not override an explicit environment mode. No deployment is performed
by the repository checks. Origin checks restrict browser clients; they are not
authentication, because a non-browser client can supply an Origin header.

## Runtime and environment

The relay binds `0.0.0.0` and reads `PORT` (default 8787). TLS terminates at the host;
public WebSocket URL: `wss://<host>/ws`. Set these in the service environment:

| Variable | Value for this mock deployment |
| --- | --- |
| `RELAY_MODE` | `mock` by default; `live` explicitly enables Gnani |
| `MAX_CONCURRENT_SESSIONS` | `3`; process-wide active-session limit |
| `PORT` | `8787` (or the host-provided port, with matching routing) |
| `MAX_SESSION_SECONDS` | `300` |
| `RELAY_DISABLED` | `0`; set `1` to reject new sessions/upgrades |
| `DEBUG_TRANSCRIPTS` | `0` |
| `ALLOWED_ORIGINS` | Comma-separated frontend origins, e.g. `https://your-frontend.example` |
| `GNANI_API_KEY` | Leave unset for mock mode. Live mode reads the private root .env inside Node; never put a key in Git, the image, frontend or CI. |

Origins must be HTTP(S) origins without paths, queries, credentials or wildcards.
Defaults allow only `http://localhost:3000` and `http://127.0.0.1:3000`. WebSocket
requests with absent, `null`, or unlisted Origin are rejected with HTTP 403. CLI
clients must send an allowed Origin too. `/health` needs no Origin and returns
`{"ok":true}`. Changing the origin list requires a service restart/redeploy.

SIGTERM/SIGINT stop new connections, cancel session timers and begin a normal WebSocket
close handshake (code 1000). An active session first gets existing session.end/error.
Unresponsive peers are forcibly closed after five seconds. Allow at least ten seconds
for host shutdown. Sessions and warning cache are in memory per instance; restart
ends sessions and clears cache. No volumes, audio uploads or transcript storage are needed.

## Docker

Run from the repository root, with Docker installed:

```powershell
docker build -f apps/relay/Dockerfile -t scam-call-shield-relay .
docker run --rm -p 8787:8787 -e ALLOWED_ORIGINS=http://localhost:3000 scam-call-shield-relay
```

The multi-stage image uses Node 20 (latest 20.x; tooling needs 20.19+), calls the root
`npm run build:node` script, and runs the compiled relay directly as the non-root
`node` user. Runtime npm install is limited to relay production dependencies and
workspace references. No web build is included. A build-context allowlist excludes
env files, local dependencies, tests and unrelated files. Runtime copy rules exclude
source/tests, and vendored dependency test/env fixtures are removed. Docker's health
check queries `/health` on the runtime PORT. There are no credential build arguments.

## Railway

1. Create a project/service from this GitHub repository and select a branch containing
   this Dockerfile. Keep the service Root Directory at the repository root, not
   `apps/relay`, so shared packages and the root lockfile remain in context.
2. In service Variables set `RAILWAY_DOCKERFILE_PATH=apps/relay/Dockerfile` and the mock
   environment above. For these steps set `PORT=8787`. Leave build/start command
   overrides empty so the Dockerfile builds and starts the direct Node process.
   [Dockerfile configuration](https://docs.railway.com/builds/dockerfiles),
   [shared monorepos](https://docs.railway.com/deployments/monorepo).
3. In Settings configure healthcheck path `/health`. Set
   `RAILWAY_DEPLOYMENT_DRAINING_SECONDS=10` for graceful shutdown during redeploys.
   [Healthchecks](https://docs.railway.com/deployments/healthchecks),
   [deployment teardown](https://docs.railway.com/deployments/deployment-teardown).
4. Keep Serverless/App Sleeping disabled so the service stays running between requests.
   Use one instance for this in-memory mock. [Serverless setting](https://docs.railway.com/deployments/serverless).
5. Deploy, then Settings -> Networking -> Public Networking -> Generate Domain, using
   target port 8787. Record the generated hostname and run the checks below against
   `https://<generated-host>/health` and `wss://<generated-host>/ws`.
   [Public networking](https://docs.railway.com/networking/public-networking).

## Fly.io alternative

Install/login to flyctl, then run from the repository root:

```powershell
fly auth login
fly launch --no-deploy --dockerfile apps/relay/Dockerfile --no-db --no-redis --no-object-storage --no-github-workflow
```

Choose an app name and region. In the generated `fly.toml`, keep its real `app` and
`primary_region` values, and configure the following sections. This file is a manual
deployment artifact, not added by this task:

```toml
kill_signal = "SIGTERM"
kill_timeout = 10

[build]
  dockerfile = "apps/relay/Dockerfile"

[env]
  PORT = "8787"
  MAX_SESSION_SECONDS = "300"
  RELAY_DISABLED = "0"
  DEBUG_TRANSCRIPTS = "0"
  ALLOWED_ORIGINS = "https://your-frontend.example"

[http_service]
  internal_port = 8787
  force_https = true
  auto_stop_machines = "off"
  auto_start_machines = false

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  timeout = "5s"
  method = "GET"
  path = "/health"
```

Then run `fly deploy --ha=false` and `fly status`. Disabling autostop keeps the single
Machine running; no database or provider secret is required. Public URLs use
`https://<app-name>.fly.dev/health` and `wss://<app-name>.fly.dev/ws`.
[Launch options](https://docs.fly.io/flyctl/cmd/fly_launch),
[deploy options](https://docs.fly.io/flyctl/cmd/fly_deploy),
[service, healthcheck and shutdown settings](https://docs.fly.io/reference/configuration).

## Post-deploy checks

From a checked-out repository with `npm ci` completed, replace the placeholders below.
Use an Origin that is actually listed in the deployed ALLOWED_ORIGINS:

```powershell
curl.exe --fail https://your-relay-host/health
$env:RELAY_WS_URL = "wss://your-relay-host/ws"
$env:RELAY_ORIGIN = "https://your-frontend.example"
node apps/relay/scripts/run-scenario.mjs kyc-otp
node apps/relay/scripts/run-scenario.mjs genuine-bank-alert
```

The URL can alternatively be the third argument:
`node apps/relay/scripts/run-scenario.mjs kyc-otp wss://your-relay-host/ws`.
RELAY_ORIGIN still selects the header. The client prints no transcript content.
KYC should finish danger with one WAV warning; the genuine alert should finish safe
with zero audio. HTTP 403 on upgrade means the Origin is missing/unlisted or the relay
is disabled. Neither a passing healthcheck nor mock replay verifies real Gnani APIs.

## CI

Pushes and pull requests targeting main run npm ci, root build, tests, typecheck and
lint on Ubuntu with Node 20.x. No repository secrets are referenced. CI does not
deploy a service, enable a provider, or publish an image. The actual SIGTERM process
test runs on Linux; Windows skips it because Windows process termination does not
deliver POSIX SIGTERM handlers. Cross-platform tests still verify close code 1000.


## Explicit local live mode

Build first, keep the root .env private and outside version control, then in a server terminal:

```powershell
$env:RELAY_MODE = 'live'
$env:DEBUG_TRANSCRIPTS = '0'
npm run build:node
npm run start --workspace=@scamcall/relay
```

Live startup reads the root .env only inside Node, sourcing GNANI_API_KEY from that file; no header/key is logged. Default/mock startup does not read it. Do not use NEXT_PUBLIC_ credentials. Unknown mode values fail startup. The live factory selects GnaniSttProvider and GnaniTtsProvider; provider injection remains available for loopback-only tests. This is a local runtime capability, not a deployment performed here. The existing mock container configuration does not package private env files or generated warning audio; it remains a mock deployment unless live prerequisites are deliberately supplied by its operator.

In a separate terminal:

```powershell
node apps/relay/scripts/stream-wav.mjs data/warnings/audio/SENSITIVE_REQUEST.hi-en.Poorvi.wav en-IN
node apps/relay/scripts/stream-wav.mjs data/warnings/audio/SENSITIVE_REQUEST.hi-en.Poorvi.wav hi-IN
```

The client validates WAV PCM16 mono sixteen-kilohertz input, strips only its container, and sends exactly 1024 bytes every thirty-two milliseconds, plus one second of silence padded to the next whole frame. It sends the existing session.start without scenario and waits for session.ready; it finishes with session.end, sessionId and reason user. No session.stop event or two-hundred-millisecond wire frame is introduced. The safety script refuses fifteen seconds or more including silence. It prints message types/timings and synthetic transcript/risk/audio-size summaries, never a key or raw audio. RELAY_URL can override the default ws://localhost:8787/ws; the CLI sends an allowed localhost Origin.

Live sessions wait for upstream connected before readiness. Transcript and risk messages precede asynchronous warning audio. Risks are emitted only on changed level/score and warnings once per code per session. Generated WAVs load into the cache at startup when present; a miss synthesizes once and caches in memory, sharing in-flight requests. Relay logs tts.cache/tts.live as internal telemetry only, without adding wire fields. For English or Hindi STT, spoken warnings use the existing hi-en/Poorvi catalog; Marathi STT uses mr-IN/Zahira. English recognition therefore does not imply an English-only spoken warning. Voice environment overrides must match the generated filename to obtain a disk hit.

MAX_SESSION_SECONDS defaults to three hundred; live sessions are also clamped to fourteen minutes, below Gnani's documented fifteen-minute cap. MAX_CONCURRENT_SESSIONS defaults to three active sessions across relay instances in one process. Duplicate starts cannot open another upstream stream; disconnect/end/expiry clears the slot and closes STT. RELAY_DISABLED=1 rejects upgrades/new starts and ends active sessions on a bounded one-hundred-millisecond guard tick. Upstream failure emits the existing recoverable session.error and explicitly asks the client to start a new session to resume transcription.

At session cleanup the relay logs gnani.usage with cumulative per-process audioSeconds and ttsCharacters. Audio is counted after successful upstream frame writes; text is counted at each attempted TTS submission, including retries. Cache hits cost zero submitted characters. These counters are usage evidence, not billed credits. No transcript text is logged unless DEBUG_TRANSCRIPTS=1. Generated audio is ignored by Git; live audio/transcripts are not persisted by the relay.
