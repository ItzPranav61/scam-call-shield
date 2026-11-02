# Record a synthetic demo

Use a current checkout with dependencies installed (`npm ci` if
needed), Node and PowerShell available, and the relay's existing private
configuration set up. The relay loads its own configuration. Never paste a key
into the browser, narration, recording, terminal capture or chat.

Check available credits in the Gnani dashboard **before and after** recording.
Budget a few paise to about one rupee of credits per live take; actual usage can
vary. Avoid repeated takes without checking credits.

## Pre-record checklist

- Relay runs in live mode; `/health` reports `mode: live` and the green LIVE badge is visible.
- Open `http://localhost:3000/?record=1#interactive-demo-title` and select Microphone.
- Turn notifications off and close unrelated or personal tabs.
- Use a synthetic script only: no real names, numbers or personal/financial details.
- Do a dry run first; verify mic levels, transcription, explanations and spoken warning.
- Stop the dry run and give fresh consent before the recorded take.

Follow the [README asset rules](assets/README.md). Raw MP4/MOV/MKV takes stay
uncommitted; keep them in the top-level `takes/` folder. Only the reviewed GIF/PNG
captures belong in `docs/assets/`.

## Start and capture

Start from the repo root (both ports must be free):

```powershell
# From the repository root
.\scripts\start-demo.ps1
```

Two PowerShell windows open for the live relay and web server, followed by
`http://localhost:3000/?record=1#interactive-demo-title`. If a port is busy, the
script prints its process ID and starts neither server. If startup fails, check
the visible windows; do not hide a missing-credential or offline error in a take.

Pre-flight:

- Green **Relay: LIVE** badge; never present a MOCK take as real transcription.
- Select **Microphone**, then choose the laptop input under Technical details.
- Tick consent for every session. Start, grant permission and confirm the input
  meter moves when you speak. Stop this check before recording a new session.
- Collapse Technical details and follow **Return to capture view**. It stays
  below the capture area. Tab/Shift+Tab, Enter and Space operate all controls.
- Set Windows display/capture resolution to 1920x1080 (1280x720 is also supported).
  Use Win+G Game Bar or OBS; include system audio for the spoken warning. Keep
  notifications, private tabs, settings and credentials outside the capture.

Record takes in this order, with a fresh consented microphone session each time:

1. `data/scenarios/audio/genuine-bank-alert.wav`: should stay SAFE/no danger.
2. `data/scenarios/audio/kyc-otp.wav`: should reach DANGER with the spoken warning.
3. Optional: `data/scenarios/audio/digital-arrest.wav` for another synthetic example.

Copy these existing synthetic WAVs to a phone. Play the phone speaker at maximum
volume, 10–20 cm from the laptop microphone, in a quiet room. Use headphones for
the laptop output only if its warning feeds back into the mic; ensure the screen
recorder still captures system audio. Stop at the end of each take and wait for
the microphone indicator to turn off. Review actual transcripts and results;
expected outcomes are checks, never guaranteed results. Do not conceal a miss.

Use microphone input, **not Scenario playback**: the current live relay rejects
the scenario field. Keeping the red synthetic-only banner and the relay badge
visible is mandatory. Say **"synthetic call"** in narration, never **"real call"**.
Do not claim proven accuracy, automatic call interception or guaranteed safety.

Stop demo listeners:

```powershell
# From the repository root
.\scripts\stop-demo.ps1
```

This stops only processes currently listening on ports 8787 and 3000; it does not
kill process trees. Close leftover server windows yourself. Review the recording
before sharing, and check the Gnani credit balance again.
