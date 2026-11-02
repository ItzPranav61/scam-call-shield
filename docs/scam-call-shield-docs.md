# Scam-Call Shield: Project Documentation

**Challenge:** Great Indian AI Internship Challenge by Gnani AI
**Status:** Planning, version 1.0, written 24 Oct 2026
**Final submission deadline:** 10 Nov 2026, 11:59 PM IST (no extensions). Internal target: submit by 8 Nov.
**Team:** [Name 1], [Name 2, optional]. Teams are max two. Each member is interviewed individually.

---

## 1. One-line summary

A voice app that listens to a suspicious phone call (on speakerphone), transcribes it live in Hinglish (and optionally Marathi) using Gnani's speech-to-text, detects scam patterns, and warns the user out loud in their own language using Gnani's text-to-speech.

## 2. Problem

Phone scams in India (fake KYC/OTP calls, "digital arrest" police impersonation, fake refund or UPI requests) target people with low digital literacy, especially elderly relatives. The calls are fast, urgent and emotionally manipulative, and the victim has no one to ask in the moment. Most existing tools are text-first or English-first. Gnani's models are built for noisy, telephone-quality, code-mixed Indian speech, which is exactly where this problem lives.

## 3. Goals and non-goals

**Goals**
- Live transcript of a call played on speakerphone, in a noisy room.
- Risk detection with a short reason ("Caller is asking for your OTP").
- Spoken warning in the user's language within a few seconds of the red flag.
- Honest behaviour: show a genuine call that is *not* flagged, and state limits.

**Non-goals (do not build)**
- Intercepting or recording real phone calls from the phone's dialer.
- Real phone numbers, real recordings, accounts, call history, a database.
- A mobile app. A web app is enough.
- Claims of "X% accuracy" in public. (See section 4, EULA note.)

## 4. Challenge rules that shape the build

Source: gnani.ai/internship and the participation terms on the registration page.

| Rule | What it means for us |
|---|---|
| Build a working app using Gnani models/APIs | Prisma (STT) and Timbre (TTS) must be genuinely central, not decorative |
| 5,000 programme credits | Keep test audio short, budget usage |
| Public demo post on LinkedIn and/or X | Video of the app working, tag Gnani AI, add `#GnaniAI` and `#GreatIndianAIInternshipChallenge`. Nominate one post per platform. The post must be live before submitting. |
| Shortlisting by verified engagement | Only engagement recorded by the cutoff counts, so post early. No bots, bought engagement, paid promotion or engagement swaps. |
| Entries must show genuine use of Gnani tech | Name the models/APIs used and each member's contribution |
| No real phone numbers, account numbers, Aadhaar, PAN or recorded calls | Synthetic data only, everywhere |
| Misleading demos can disqualify | Never fake a result. Show limitations. |
| One entry per participant/team | |

**Awards we are targeting (10 awards of ₹50,000, independent of internship selection):** Real Deal, Noise Canceller, Mixed Vibes, Main Character (if Marathi works), Demo Day Drop (best 60-second demo), Crowd Favourite. Check eligibility for Small Town, Big Build in the full terms.

**EULA note (verify with Gnani):** registration accepts Gnani's general EULA. It restricts disclosing benchmark/performance results of the product to third parties without written consent. So: do not publish accuracy numbers or side-by-side comparisons of Prisma against other models. Showing the app working is fine.

**Open question (must be answered in writing):** whether a third-party LLM may be used for classification alongside Gnani. The terms do not forbid it, and Gnani's own docs show Claude/OpenAI used with Prisma in a call-analytics guide, but there is no explicit permission. Post the question on the Gnani Discord or email the contact on the registration page. Until answered, the classifier must work with a rules-only fallback.

## 5. Users and scenario

- **Primary user:** an older family member who gets scam calls. Often not comfortable with technology and may prefer Hindi or Marathi.
- **Setup:** user (or a family member) opens the web app, taps **Start Shield**, and puts the incoming call on speakerphone near the device.
- **Outcome:** within seconds of a red flag, the screen shows a large warning and the app speaks a short, calm message such as "यह scam हो सकता है, OTP मत बताइए और call काट दीजिए" in the user's language.

## 6. System architecture

```
 [Phone call on speaker]
          |
          v
 [Browser: mic capture, 16 kHz mono PCM, small chunks]
          |  WebSocket
          v
 [Relay server (Node or Python)]  <-- holds the Gnani API key, adds auth header
          |  WebSocket (wss)
          v
 [Gnani Prisma v2.5 realtime STT]  --> partial + final transcripts
          |
          v
 [Rolling transcript window (last ~30-45 s)]
          |
          v
 [Detector: rules + LLM classifier (if allowed)]  --> { risk, category, reasons, advice }
          |
          +--> [Browser UI: risk meter, reasons, alert banner]
          |
          +--> [Relay: Gnani Timbre TTS, advice text] --> audio back to browser
```

**Why a relay server:** the Gnani API key must never be in browser code, and the STT WebSocket authenticates with request headers, which browsers cannot set on WebSocket connections (confirm in docs). Host the front end on Vercel and the relay on an always-on host (Railway, Fly or Render). Vercel serverless functions are not suitable for long-lived WebSockets.

## 7. Gnani API usage

> Details below come from docs.gnani.ai and the `gnani-vachana` package page. **Verify every endpoint, header and audio format in the current docs before coding.**

- **Base URL:** `https://api.vachana.ai`
- **Auth:** header `X-API-Key-ID: <your key>` on every request. Create the key at app.gnani.ai/voice.
- **STT (Prisma v2.5):**
  - REST for clips up to 60 seconds.
  - Realtime WebSocket for live audio (path referenced as `/stt/v3/stream`). Input documented as raw PCM, 16-bit little-endian, 16 kHz, mono.
  - Language codes such as `hi-IN`, `mr-IN`, `en-IN`. Hinglish is handled via code-switching support.
- **TTS (Timbre):**
  - REST, SSE streaming and WebSocket realtime.
  - Timbre v2.5 is the documented recommended version. Timbre v3.0 adds audio tags and expression. Confirm whether v3 is usable on challenge credits.
  - Voice catalogue: docs.gnani.ai/api/TTS/available-voices.
- **Python SDK:** `pip install gnani-vachana` (import package name is `gnani`). LiveKit and Pipecat plugins also exist.
- **Not available to us:** an LLM endpoint on the API platform. Evon is open-weights only via Hugging Face. The classifier brain is therefore external or rules-based.

## 8. Detection design

### 8.1 Signals (scam red flags)

| Signal | Example phrases (Hinglish) |
|---|---|
| Asks for OTP / PIN / CVV / password | "OTP bataiye", "PIN share kijiye" |
| Authority impersonation | "CBI se bol raha hoon", "police", "bank manager", "TRAI", "customs" |
| Threat of arrest, block or penalty | "account block ho jayega", "arrest warrant", "case file ho gaya" |
| Urgency and pressure | "abhi turant", "aaj hi", "sirf 10 minute" |
| Secrecy demand | "kisi ko mat batana", "family ko mat bataiye", "call mat kaatiye" |
| Asks to install remote-access app | "AnyDesk", "TeamViewer", "QuickSupport download kijiye" |
| Asks to transfer money to "verify" or "safe account" | "is account mein paise bhejiye", "verification ke liye transfer" |
| Fake refund / prize / KYC update | "refund aaya hai", "KYC update karna hai" |

### 8.2 Scoring and alert levels

- **Low:** no signals, or one weak signal. UI stays calm.
- **Medium:** two or more independent signals. Show a yellow caution and a short reason.
- **High:** a request for OTP/PIN/CVV, a request to transfer money, a request to install a remote-access app, **or** authority impersonation plus threat plus urgency. Show red banner and speak the warning.
- **Escalate only:** once High is reached it stays High until the call ends. Avoid flickering between levels.
- **Cooldown:** speak the warning once, then repeat only if a new high-risk signal appears.

### 8.3 LLM classifier contract (only if allowed)

Input: the last 30-45 seconds of transcript plus a short instruction. Output must be strict JSON:

```json
{
  "risk": "low | medium | high",
  "score": 0,
  "category": "kyc_otp | digital_arrest | refund_upi | remote_access | other | none",
  "reasons": ["short reason in plain language"],
  "advice": "one calm sentence in the user's language"
}
```

Rules for the prompt: use only what is in the transcript, never invent facts, return `none`/`low` when unsure, keep the advice under 20 words, never ask the user to do anything risky.

### 8.4 Rules-only fallback

Keyword and phrase matching over the rolling window (list in 8.1, expanded during testing), combined with the same scoring and escalation logic. This must work on its own so the app is demoable even if no external LLM is permitted.

### 8.5 False positives

A genuine call (for example a real-sounding bank appointment reminder that never asks for OTP or money) must stay Low. Include at least one such call in the demo. Document known limits honestly: accents, crosstalk and unusual phrasing can cause mistakes.

## 9. Test data and evaluation

**Synthetic scenarios (all fictional, no real numbers or institutions' internal details):**
1. Fake KYC / OTP call.
2. "Digital arrest" police impersonation.
3. Fake refund / UPI call.
4. Genuine call (should stay Low).
5. Borderline call (a polite caller, one weak signal).

**How to create audio**
- Write the scripts as two-speaker dialogues.
- Generate each speaker with a different Timbre voice.
- Degrade to telephone quality (8 kHz) and add background noise with ffmpeg or Python.
- Also play the audio through a real speaker in a real, noisy room and capture it with the app's mic.

**Internal checks only (do not publish numbers):**
- Time from red-flag phrase to alert (target: about 3 seconds).
- Each scam scenario reaches High; the genuine call stays Low.
- Behaviour with overlapping speech and background noise.

## 10. Tech stack and repo layout

- **Front end:** Next.js, React, TypeScript, Tailwind CSS. Deploy on Vercel.
- **Relay server:** Node (ws) or Python (FastAPI + websockets). Deploy on Railway, Fly or Render.
- **Storage:** none. Nothing is stored; transcripts live in memory only.

```
scam-call-shield/
  apps/
    web/                 # Next.js UI (Start Shield, risk meter, alerts)
    relay/               # WebSocket relay: mic audio -> Gnani STT, TTS -> browser
  packages/
    detector/            # rules, scoring, optional LLM client, shared types
  scripts/
    make-synthetic-calls # Timbre generation + ffmpeg degrade + noise
  data/
    scenarios/           # fictional scripts (text only)
  docs/
    DEMO.md              # demo script and post copy
  README.md
```

**Environment variables:** `GNANI_API_KEY`, `RELAY_URL`, optional `LLM_API_KEY` (only if permitted). Never commit keys.

## 11. Schedule

| Dates | Milestone | Kill test |
|---|---|---|
| Oct 24-25 | Register, API key, mic to relay to Prisma live transcript, one Timbre spoken warning | A Hinglish sentence appears as a live transcript |
| Oct 26-27 | Detector (rules first, LLM if permitted), rolling window, escalation | Scam phrase flagged within about 3 s |
| Oct 28-29 | UI states, language toggle, noisy-audio tests | Genuine call is not flagged |
| Oct 30-31 | Script the demo, shoot in a noisy real place, **feature freeze Oct 31** | Full demo works 3 times in a row |
| Nov 1-2 | Edit the 60-second video, publish the post with hashtags | Post is live |
| Nov 3-7 | Reply to comments honestly, fix bugs, write the project explanation | Draft submission ready |
| Nov 8 | **Submit** | |
| Nov 9-10 | Buffer | |

## 12. Demo plan (60 seconds)

1. **Hook (0-8 s):** the problem in one sentence. If it is true for you, say it from your own experience. Do not invent a story.
2. **Setup (8-15 s):** noisy real place, call on speaker, tap Start Shield.
3. **Detection (15-40 s):** live transcript, risk meter rising, warning spoken in the user's language.
4. **Honesty (40-52 s):** a genuine call that is not flagged, and one stated limitation.
5. **Close (52-60 s):** "Built on Gnani Prisma (STT) and Timbre (TTS). All calls are synthetic." Tag Gnani AI.

**Post copy template**

> Scam calls target our parents every day. I built Scam-Call Shield: it listens to a call on speaker, spots OTP/arrest/transfer scams in Hinglish, and warns in their own language. Built on @GnaniAI Prisma (speech-to-text) and Timbre (text-to-speech). All demo calls are synthetic. #GnaniAI #GreatIndianAIInternshipChallenge

## 13. Safety, privacy and ethics

- Process audio only while the user has started the shield and knows it is listening. Show a clear "listening" indicator.
- Do not store audio or transcripts. No accounts.
- Use synthetic data only. No real phone numbers, account numbers, Aadhaar, PAN or recorded calls.
- State clearly in the app and the post: this is a warning aid, not a guarantee. If unsure, hang up and call the bank or police on their official number.
- The tool must never ask the user to share sensitive information.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| External LLM not allowed | Rules-only fallback is built first |
| Latency too high for a live warning | Stream STT partials, classify on a short window, use rules for the first alert |
| False positives embarrass the demo | Include a genuine-call case, tune thresholds, show it honestly |
| Realtime STT auth from the browser fails | Relay server holds the key and sets headers |
| Timbre v3 not on challenge credits | Fall back to Timbre v2.5 |
| Credits run out | Short clips, cache TTS warnings, avoid looping tests |
| Noise ruins the demo | Test in the real location before filming |
| Engagement is low | Post early, share honestly, no bought engagement |
| EULA benchmark clause | Publish no accuracy numbers or comparisons |

## 15. Roles and contribution log

Record who did what from day one, since interviews are individual.

| Area | Owner | Notes |
|---|---|---|
| Audio capture, relay, Gnani STT/TTS integration | [Name] | |
| Detector, scoring, scenarios, evaluation | [Name] | |
| UI, demo script, video, post | [Name] | |

## 16. Submission checklist

- [ ] Registered; API key created; credits visible
- [ ] Written answer received on external-LLM use and project IP
- [ ] Working app deployed (front end and relay)
- [ ] Rules-only fallback verified
- [ ] 60-second demo video recorded in real noise
- [ ] Public post live on LinkedIn and/or X with both hashtags and Gnani tagged
- [ ] Post(s) nominated in the submission (one per platform)
- [ ] Written project explanation (problem, users, Gnani models/APIs used, each member's contribution)
- [ ] Only synthetic data used anywhere
- [ ] No accuracy numbers or competitor comparisons published
- [ ] Submitted before 11:59 PM IST, 10 Nov 2026 (target: 8 Nov)

## 17. References

- Challenge page: https://www.gnani.ai/internship
- Registration and participation terms: https://www.gnani.ai/great-indian-ai-internship-registration-form
- Developer docs: https://docs.gnani.ai
- API console: https://app.gnani.ai/voice
- Gnani EULA: https://www.gnani.ai/legal/eula
- Gnani Discord (questions and support): https://discord.gg/aECcvtABpq
