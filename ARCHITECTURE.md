# ARCHITECTURE — deed

## Overview

`deed` is a stateless Next.js 14 App Router application. No database. All document state lives in PandaDoc. Form state lives in a client-side Zustand store (in-memory, session only).

## Request Flow

```
Browser (Zustand store)
    │
    ├── Screen 1: /          → ContractForm component
    │   └── on submit        → save to Zustand, navigate to /generating
    │
    ├── Screen 2: /generating → GeneratingView component
    │   └── on mount         → fetch /api/generate (stream)
    │       └── Claude SDK   → streams contract text chunk by chunk
    │       └── on complete  → save contractText to Zustand, navigate to /review
    │
    ├── Screen 3: /review    → ContractReview component
    │   └── on send          → fetch /api/send-contract
    │       └── PandaDoc API → create document + set signing order
    │       └── Resend       → email broker sign link
    │       └── Resend       → email agent status ping
    │
    └── PandaDoc Webhook     → /api/webhook/pandadoc
        ├── broker signed    → Resend → buyer sign email + agent ping
        ├── buyer signed     → Resend → seller sign email + agent ping
        └── all signed       → Resend → fully executed email to all parties
```

## Key Decisions

### 1. Next.js App Router (not Vite + Express)
Unified frontend + backend in one deploy. API routes handle PandaDoc calls server-side (keys never exposed to browser). Vercel native — zero config deploy.

### 2. Streaming via ReadableStream
`/api/generate` uses Next.js streaming response. The Anthropic SDK's streaming API pipes directly to a `ReadableStream`. The browser reads this with `response.body.getReader()` and appends chunks to the Zustand store as they arrive — the source of the typewriter animation.

### 3. No Database
PandaDoc stores all document state and drives the signing workflow. The webhook endpoint is stateless — it receives an event, looks up what it needs from the event payload, and fires the appropriate email. No document IDs need to be stored.

### 4. Zustand for Cross-Screen State
Three screens need shared state: form data (Screen 1 → 2 → 3), generated contract text (Screen 2 → 3). Zustand provides a simple in-memory store that persists across Next.js client-side navigation without any serialization overhead.

### 5. React Email + Resend
React Email lets us write emails as React components with the same Tailwind aesthetic as the app. Resend has a best-in-class developer API and React Email integration. All 5 email templates are pre-rendered server-side before sending.

### 6. PandaDoc Sequential Signing
Recipients are added with `signing_order: 1, 2, 3`. PandaDoc automatically activates each recipient's signing link only after the previous has signed. Webhooks notify us when each step completes.

## Security Model

- All API keys are server-side only (Next.js API routes, never in client bundle)
- PandaDoc webhook payloads verified with HMAC signature (`x-pandadoc-signature` header)
- No user data persisted — form clears on browser refresh
- Vercel handles TLS termination

## Deployment

```
GitHub → push to main
    └── ci.yml (lint + typecheck + build + test in parallel)
        └── quality gate passes
            └── deploy.yml → Vercel --prod
                └── https://deed.vercel.app
```

## File Boundaries

| Boundary | What lives here |
|----------|----------------|
| `app/` | Pages (screens) + API routes |
| `components/` | All React components |
| `components/ui/` | Primitive UI components (Button, Input, etc.) |
| `emails/` | React Email templates |
| `lib/` | Pure utility modules (no React) |
| `store/` | Zustand store definition |
| `types/` | TypeScript types only |
