# ScamCall Shield: one-page pitch

**Built for the Gnani AI Great Indian AI Internship Challenge by Pranav and Vedant.**

## The problem
Phone scams work through pressure, not technology. A caller claims to be a bank or an officer, creates urgency ("your account will be blocked"), and ends with one ask: an OTP or a payment. In that moment people rarely get a calm second opinion.

## The solution
ScamCall Shield is a prototype that gives them that second opinion. It listens to a call played on speaker through the laptop microphone, transcribes it live, flags scam pressure patterns as **safe / caution / danger**, explains why in plain words, and speaks a warning.

## How it uses Gnani
- **Gnani Prisma (speech-to-text):** realtime streaming of microphone audio, so the transcript appears while the caller speaks (tested in Hinglish).
- **Gnani Timbre (text-to-speech):** the warning is spoken aloud. A voice is harder to ignore than a banner, and it helps people who prefer listening to reading.

## How it works
Browser microphone, audio worklet, Node relay (the only place the API key lives), Prisma, a transparent rules-based detector, then the risk level, reasons and spoken warning back to the browser. Rules, not a black box, so every flag can be explained.

## What exists today
- Working end to end on synthetic calls: live mic, transcript, risk level with reasons, Timbre warning.
- A hosted scripted preview, and an MIT-licensed monorepo with tests and CI.
- Honest limits: research prototype, synthetic calls only, not for use on real calls. Rules can miss patterns or over-flag. Audio is sent to Gnani for transcription and is not saved by the app.

## Where it goes next
A hosted relay so live mode runs from the website, broader pattern and language coverage (verified language by language), and an Android wrapper.

## Links
- Code: https://github.com/ItzPranav61/scam-call-shield
- Website (scripted preview; live mode runs locally): https://scamcall-shield-website.vercel.app
