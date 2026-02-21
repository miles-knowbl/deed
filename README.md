# deed

Real estate contracts, simplified. Fill in a form, watch Claude draft the agreement in real time, approve it, and send the full signing chain — broker → buyer → seller — automatically.

**Free, public, no login required.**

## How it works

1. **Fill the form** — broker, agent, buyer, seller, property, offer details, addendums
2. **Watch it generate** — Claude claude-opus-4-6 streams the complete contract in real time
3. **Review & send** — PandaDoc routes signatures automatically: broker signs first, then buyer, then seller
4. **Everyone notified** — Resend emails each party at every step

## Stack

- **Next.js 14** (App Router) + TypeScript
- **Tailwind CSS** + Framer Motion + Radix UI + CVA
- **Claude claude-opus-4-6** for contract generation (streaming)
- **PandaDoc** for e-signing (sequential signing chain + webhooks)
- **Resend + React Email** for transactional emails

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd deed
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `PANDADOC_API_KEY` | [app.pandadoc.com → Settings → API Dashboard](https://app.pandadoc.com/a/#/settings/api-dashboard) |
| `PANDADOC_WEBHOOK_SECRET` | PandaDoc → Settings → Webhooks → create webhook → copy secret |
| `RESEND_API_KEY` | [resend.com/api-keys](https://resend.com/api-keys) |
| `RESEND_FROM_EMAIL` | A verified domain email in Resend |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally |

### 3. PandaDoc Webhook Setup

In PandaDoc → Settings → Webhooks, create a webhook pointing to:
```
https://your-domain.com/api/webhook/pandadoc
```

Subscribe to: `recipient_completed`, `document_state_changed`

Copy the webhook secret into `PANDADOC_WEBHOOK_SECRET`.

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel + GitHub Actions)

### Vercel setup

```bash
vercel link  # creates .vercel/project.json
```

### GitHub Secrets

Set these in your repo → Settings → Secrets → Actions:

```
ANTHROPIC_API_KEY
PANDADOC_API_KEY
PANDADOC_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL      # e.g. https://deed.vercel.app
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

### CI/CD Pipeline

Push to `main` → CI runs (lint + typecheck + build + tests) → on success → deploys to Vercel production.

```
push to main → ci.yml (lint, typecheck, build, test) → quality gate → deploy.yml → Vercel --prod
```

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run test:run     # Run tests
npm run lint         # ESLint
```

## Signing Chain

```
Agent fills form
    ↓
"Approve & Send" clicked
    ↓
PandaDoc document created (broker → buyer → seller signing order)
    ↓
Broker receives email with signing link
    ↓
Broker signs → Buyer receives email with signing link
    ↓
Buyer signs → Seller/agent receives email with signing link
    ↓
Seller signs → All parties receive "Fully Executed" confirmation
    ↓
Agent receives status ping at every step
```

## Contract Template

Generates a complete **Generic National Residential Purchase Agreement** with 18 sections covering parties, property, price, financing, contingencies, closing, title, default, and addendums. Addendums selectable:

- Home Inspection Contingency
- Financing Contingency
- Appraisal Contingency
- Sale of Buyer's Current Home Contingency
- HOA / Condo Association Disclosure
- As-Is Sale Addendum
- Lead-Based Paint Disclosure
- Well & Septic Inspection Addendum
- Radon Testing Addendum
- Seller Concessions / Closing Cost Assistance

## License

MIT
