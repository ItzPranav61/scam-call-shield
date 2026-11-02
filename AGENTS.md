# Mandatory engineering rules

- Use strict TypeScript and the npm workspace architecture: Next.js in apps/web, Node relay in apps/relay, framework-independent detector in packages/detector, shared application types in packages/protocol.
- Write readable modular code, avoid unnecessary abstractions, and implement only requested features. Phase 0 has no detector, recording UI, or provider connection.
- Run relevant lint, typecheck, tests and production builds before declaring work complete. Explain architectural decisions and record actual evidence in PROGRESS.md.
- Create feature branches where appropriate, keep main buildable and commits small and focused. Inspect diffs before committing. Never push or create PRs without the user's authorization.
- Never hardcode credentials, commit secret-bearing .env files, log keys, or print secret values in terminal output. Keep example files secret-free.
- Keep Gnani authentication exclusively in the relay/server environment. Never expose credentials or secret-bearing information to the browser; never use NEXT_PUBLIC_ for private credentials.
- All frontend/relay messages must follow docs/contract.md with matching TypeScript types. Update that document when events change. Keep our internal events separate from Gnani messages.
- Verify Gnani details against official documentation. Never invent endpoints, parameters, languages or schemas. Mark unavailable details UNVERIFIED and stop dependent implementation.
- Use synthetic scam scenarios and personal information only. Obtain appropriate consent before recording audio. Never store live audio or transcripts by default or expose sensitive financial information.
- Distinguish mocks from real analysis. Predictions are indicators, never definitive judgments; a low-risk result never guarantees safety. Browser microphone access cannot intercept cellular calls.
- Keep external LLM use blocked until challenge eligibility is confirmed. Do not begin Phase 1 without a user request.
