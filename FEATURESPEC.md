# FEATURESPEC — deed

## 1. Overview

`deed` is a public, free web tool for real estate agents that converts a simple form into a legally sound residential purchase agreement, delivers it through a sequential e-signing chain, and handles all party notifications automatically.

**Target users:** Real estate agents / selling agents at brokerages in the US
**Primary workflow:** Fill form → watch contract generate → approve & send → signing chain runs automatically

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router (TypeScript) |
| Styling | Tailwind CSS + CVA (class-variance-authority) |
| Animation | Framer Motion |
| UI Primitives | Radix UI |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| State | Zustand (client-side, in-memory) |
| AI | Anthropic SDK — claude-opus-4-6 (streaming) |
| E-Signing | PandaDoc API (sequential signing, webhooks) |
| Email | Resend + React Email |
| Deployment | Vercel (Next.js native) |
| CI/CD | GitHub Actions (ci.yml + deploy.yml) |

---

## 3. Project Structure

```
deed/
├── app/
│   ├── layout.tsx                 # Root layout, fonts, Sonner toaster
│   ├── page.tsx                   # Screen 1: Contract Form
│   ├── generating/
│   │   └── page.tsx               # Screen 2: Animated Generation
│   ├── review/
│   │   └── page.tsx               # Screen 3: Contract Review
│   └── api/
│       ├── generate/
│       │   └── route.ts           # POST: streams Claude contract
│       ├── send-contract/
│       │   └── route.ts           # POST: creates PandaDoc doc + sends
│       └── webhook/
│           └── pandadoc/
│               └── route.ts       # POST: PandaDoc signing events
├── components/
│   ├── ui/                        # Radix-based primitives (button, input, etc.)
│   ├── ContractForm.tsx           # Screen 1 full form
│   ├── GeneratingView.tsx         # Screen 2 streaming view
│   ├── ContractReview.tsx         # Screen 3 review + send
│   └── FormField.tsx              # Reusable labeled input wrapper
├── emails/
│   ├── BrokerSignEmail.tsx        # Sign request to broker
│   ├── BuyerSignEmail.tsx         # Sign request to buyer
│   ├── SellerSignEmail.tsx        # Sign request to seller/agent
│   ├── FullyExecutedEmail.tsx     # All-party completion
│   └── AgentStatusEmail.tsx       # Agent ping after each signature
├── lib/
│   ├── pandadoc.ts               # PandaDoc API client
│   ├── resend.ts                 # Resend email sender
│   ├── contract-prompt.ts        # Claude system + user prompt builder
│   ├── motion-variants.ts        # Shared Framer Motion variants
│   └── utils.ts                  # cn(), formatUSD(), etc.
├── store/
│   └── contract.ts               # Zustand store: form data + generated text
├── types/
│   └── contract.ts               # ContractFormData, ContractState types
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

## 4. Screen 1 — Contract Form

### Fields

| Field | Type | Validation |
|-------|------|-----------|
| Broker name | text | required |
| Broker email | email | required, valid email |
| Selling agent name | text | required |
| Selling agent email | email | required, valid email |
| Buying client name | text | required |
| Buying client email | email | required, valid email |
| Seller / seller's agent name | text | required |
| Seller / seller's agent email | email | required, valid email |
| Property address | text | required |
| Offer price | number (USD) | required, > 0 |
| Down payment % | number | required, 0-100 |
| Loan type | select | Conventional, FHA, VA, Cash, USDA |
| Special requests | textarea | optional |
| Addendums | 10 checkboxes | optional, multi-select |

### Addendum List
1. Home Inspection Contingency
2. Financing Contingency
3. Appraisal Contingency
4. Sale of Buyer's Current Home Contingency
5. HOA / Condo Association Disclosure
6. As-Is Sale Addendum
7. Lead-Based Paint Disclosure (pre-1978 properties)
8. Well & Septic Inspection Addendum
9. Radon Testing Addendum
10. Seller Concessions / Closing Cost Assistance

### UX
- Radix UI form primitives with custom Tailwind styling matching servicegrid
- Real-time validation feedback (inline error messages)
- Staggered entrance animation (Framer Motion, 40ms stagger per field group)
- "Generate Contract" CTA button at bottom — on click: validates, saves to Zustand, navigates to /generating
- Sonner toast on validation error

---

## 5. Screen 2 — Animated Generation

### Behavior
- On mount: fires POST /api/generate with form data from Zustand store
- Reads response as a ReadableStream
- Displays text character-by-character in a styled "contract paper" UI
- Section headers appear as Claude writes them
- Progress: shows current section name + percentage complete (estimated by byte count)
- On stream complete: 1s delay → auto-navigate to /review
- Error state: show Sonner toast, "try again" button

### Visual
- White "paper" card with subtle shadow (glass-card aesthetic)
- Monospace-ish legal font (Geist Mono or similar)
- Blinking cursor at end of stream
- Animated section labels ("Writing parties..." → "Writing financing terms..." etc.)
- Soft pulse animation on the progress indicator

---

## 6. Screen 3 — Contract Review

### Layout
- Full formatted contract in a scrollable paper card
- Contract sections visually separated with subtle dividers
- "Approve & Send" button — fixed at bottom, prominent
- Back button to return to form
- Loading state on send: spinner + "Sending to broker for signature..."

### Send Flow
1. POST /api/send-contract with full contract data + generated text
2. API creates PandaDoc document
3. Sets signing order: broker (1) → buyer (2) → seller/agent (3)
4. Sends PandaDoc signing link to broker via Resend (BrokerSignEmail)
5. Sends confirmation to selling agent (AgentStatusEmail: "Sent to broker")
6. Returns success → UI shows success state with summary

---

## 7. API Routes

### POST /api/generate
**Input:** `ContractFormData` JSON
**Output:** Server-Sent Events stream (text/event-stream)
**Behavior:**
- Builds Claude prompt from form data
- Calls Anthropic SDK with claude-opus-4-6, streaming enabled
- Pipes stream chunks to response
- Handles errors with 500 + JSON error body

### POST /api/send-contract
**Input:** `{ formData: ContractFormData, contractText: string }`
**Output:** `{ success: boolean, pandaDocId: string }`
**Behavior:**
- Creates PandaDoc document from contractText (HTML formatted)
- Adds 3 recipients with signing order
- Sends document (triggers PandaDoc signing flow)
- Emails broker via Resend (BrokerSignEmail with PandaDoc link)
- Emails agent via Resend (AgentStatusEmail: "Sent to broker to sign")

### POST /api/webhook/pandadoc
**Input:** PandaDoc webhook event
**Output:** 200 OK
**Behavior:**
- Verifies webhook signature (PANDADOC_WEBHOOK_SECRET)
- On `document_state_changed` + `document.completed` per recipient:
  - Recipient 1 (broker) signed → email buyer (BuyerSignEmail)
  - Recipient 2 (buyer) signed → email seller/agent (SellerSignEmail)
  - All signed → email all parties (FullyExecutedEmail) + agent ping
- Logs unknown events, returns 200

---

## 8. Contract Template (Generic National)

Claude generates a complete Residential Purchase Agreement with these sections:

1. **Parties** — buyer, seller, broker, agents with addresses/emails
2. **Property** — full address and legal description placeholder
3. **Purchase Price** — offer price in words and figures
4. **Earnest Money** — standard 1% earnest money deposit terms
5. **Financing** — loan type, down payment %, financing contingency terms
6. **Contingencies** — derived from selected addendums
7. **Closing Date** — standard 30-day closing from acceptance
8. **Possession** — at closing unless otherwise noted
9. **Inclusions & Exclusions** — standard fixtures language
10. **Title & Closing Costs** — standard split, title company TBD
11. **Condition of Property** — seller representations
12. **Default & Remedies** — earnest money forfeiture, specific performance
13. **Addendums** — full text of each selected addendum
14. **Special Requests** — verbatim from form field
15. **Entire Agreement** — integration clause
16. **Governing Law** — buyer's state
17. **Counterparts** — electronic signature clause
18. **Signature Block** — broker, buyer, seller/agent with date fields

---

## 9. Email Specifications

### BrokerSignEmail
- **To:** broker
- **Subject:** `Action Required: Please Sign Purchase Agreement — [Property Address]`
- **Body:** Brief summary (property, buyer, offer price), prominent "Sign Now" CTA button (PandaDoc link)
- **Tone:** Professional, urgent but not alarming

### BuyerSignEmail
- **To:** buying client
- **Subject:** `Your Purchase Agreement is Ready to Sign — [Property Address]`
- **Body:** Congratulatory tone, property summary, offer details, "Review & Sign" CTA
- **Tone:** Warm, exciting ("Your offer has been submitted!")

### SellerSignEmail
- **To:** seller / seller's agent
- **Subject:** `Offer Received for [Property Address] — Review & Sign`
- **Body:** Offer summary (price, buyer name, loan type), "Review Offer & Sign" CTA
- **Tone:** Neutral, professional, informative

### FullyExecutedEmail
- **To:** all parties (broker, buyer, seller/agent, selling agent)
- **Subject:** `Fully Executed: Purchase Agreement for [Property Address]`
- **Body:** Congratulations, summary of all parties, property, price, closing timeline
- **Tone:** Celebratory, clear

### AgentStatusEmail
- **To:** selling agent
- **Subject:** `[Status Update] Purchase Agreement — [Property Address]`
- **Body:** Status update ("Broker has signed. Sent to [Buyer Name] for signature.")
- **Tone:** Brief, informational

---

## 10. PandaDoc Integration

### Document Creation
- Create document via PandaDoc API v2
- Document name: `Purchase Agreement — [Property Address]`
- Content: HTML-formatted contract text from Claude
- Recipients with signing_order:
  ```
  [
    { email: broker_email, first_name, last_name, signing_order: 1, role: "Broker" },
    { email: buyer_email, first_name, last_name, signing_order: 2, role: "Buyer" },
    { email: seller_email, first_name, last_name, signing_order: 3, role: "Seller" }
  ]
  ```
- Fields: signature + date blocks for each recipient

### Webhook Events
- Subscribe to: `document_state_changed`
- Verify signature header: `x-pandadoc-signature`
- Map events to email actions

---

## 11. Animation System (matching servicegrid)

```typescript
// Stagger container
containerVariants = { hidden: { opacity: 0 }, visible: { transition: { staggerChildren: 0.08 } } }

// Card item entrance
cardItemVariants = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } }

// List item entrance
listItemVariants = { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: "easeOut" } } }
```

---

## 12. Design System (matching servicegrid)

- **Palette:** Warm off-white background, pure white cards, deep charcoal text
- **Glass:** `backdrop-blur-sm` + subtle border + soft box shadow
- **Transitions:** 200-350ms ease-out
- **Status:** Grayscale opacity badges (no bright accent colors)
- **Buttons:** CVA variants (default, outline, ghost), hover shadow elevation
- **Focus:** Custom focus ring with offset
- **Toasts:** Sonner, bottom-right, auto-dismiss

---

## 13. Environment Variables

```bash
ANTHROPIC_API_KEY=           # Claude API key
PANDADOC_API_KEY=            # PandaDoc API key
PANDADOC_WEBHOOK_SECRET=     # Webhook signature verification
RESEND_API_KEY=              # Resend API key
RESEND_FROM_EMAIL=           # e.g. contracts@deed.app
NEXT_PUBLIC_APP_URL=         # e.g. https://deed.vercel.app
```

---

## 14. CI/CD Pipeline (matching servicegrid)

### ci.yml
- **Triggers:** push to main/develop, PR to main/develop
- **Jobs (parallel):**
  - lint: `npm run lint`
  - typecheck: `npx tsc --noEmit`
  - build: `npm run build` (with env vars from secrets)
  - test: `npm test -- --run` (Vitest)
- **Quality gate:** all jobs must pass
- **Concurrency:** cancel in-progress on same ref

### deploy.yml
- **Triggers:** after ci.yml succeeds on main, or manual dispatch
- **Job:** build + deploy to Vercel (`amondnet/vercel-action@v25 --prod`)
- **Outputs:** deployment URL to step summary

### GitHub Secrets Required
```
ANTHROPIC_API_KEY
PANDADOC_API_KEY
PANDADOC_WEBHOOK_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
NEXT_PUBLIC_APP_URL
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

---

## 15. Out of Scope (v1)
- User accounts / authentication
- Contract template editing
- Draft saving / history
- Multi-language support
- Mobile app
- PDF download of contract

---

## 16. Acceptance Criteria

- [ ] Agent can fill all form fields and proceed to generation in < 30 seconds
- [ ] Contract generates and streams in real time via Claude
- [ ] "Approve & Send" creates a PandaDoc document and emails broker
- [ ] After broker signs, buyer receives email with signing link automatically
- [ ] After buyer signs, seller/agent receives email with signing link automatically
- [ ] After all sign, all parties receive fully executed confirmation email
- [ ] Selling agent receives a status ping after each signature event
- [ ] CI pipeline passes on every push
- [ ] App deploys to Vercel automatically on main merge
- [ ] UI matches servicegrid aesthetic (grayscale, glass, Framer Motion)

---

## 17. Open Questions (Resolved)
- State target: **Generic / national** ✓
- Signing platform: **PandaDoc** ✓
- Addendum UX: **Preset checkboxes** ✓
- Credentials: **Starting from scratch** (env.example + setup guide in README) ✓
- Deployment: **Vercel + GitHub Actions** (matching servicegrid) ✓

---

## 18. Capability Summary

| Capability | Description |
|-----------|-------------|
| contract-form | 3-party form with validation, addendum checkboxes, Framer Motion entrance |
| contract-generation | Claude claude-opus-4-6 streaming → animated typewriter display |
| contract-review | Formatted contract review + PandaDoc send integration |
| signing-chain | PandaDoc sequential 3-party signing with webhook automation |
| email-system | 5 email templates via Resend, styled to match app |
| cicd-pipeline | GitHub Actions ci.yml + deploy.yml, Vercel production deploy |
