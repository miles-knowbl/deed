# ESTIMATE — deed

## Calibrated Estimate

| Phase | Effort | Key Work |
|-------|--------|---------|
| SCAFFOLD | Low | Next.js project init, deps, config files |
| IMPLEMENT | High | 6 capabilities: form, generation, review, signing chain, email system, CI/CD |
| TEST | Medium | Vitest unit tests for API routes, utilities |
| VERIFY | Low | Build + lint + type check |
| VALIDATE | Low | Semantic review + security audit |
| DOCUMENT | Low | README with setup guide |
| REVIEW | Low | Code review pass |
| SHIP | Low | Vercel deploy config |

## Complexity Drivers
- Claude streaming integration (ReadableStream, SSE)
- PandaDoc API + webhook verification
- React Email templates (5 emails)
- Framer Motion animation polish matching servicegrid

## Risk Factors
- PandaDoc API: sequential signing requires careful recipient ordering
- Webhook handling: must verify signatures before processing
- Streaming: Next.js App Router streaming response setup

## Confidence: High
All patterns are well-established. No novel infrastructure required.
