# REQUIREMENTS — deed

## Problem Statement
Real estate agents spend significant time manually drafting purchase agreements. The process is repetitive, error-prone, and creates delays. `deed` eliminates this by turning a simple form into a fully executed, legally sound contract that routes through the correct signing chain automatically.

## Functional Requirements

### FR-01: Contract Form (Screen 1)
- Broker name and email address
- Selling agent (the app user) name and email
- Buying client name and email
- Seller / seller's agent name and email
- Property address (street, city, state, zip)
- Offer price (formatted as USD)
- Down payment percentage + loan type (Conventional, FHA, VA, Cash, USDA)
- Special requests / notes (free text)
- 10 addendum checkboxes (preset, nationally applicable):
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

### FR-02: Contract Generation (Screen 2)
- Claude claude-opus-4-6 streams the completed contract text using form field inputs
- Streaming output is displayed as animated typewriter text (character-by-character)
- Progress indicator shows sections being completed
- Animation creates genuine trust that the contract is being carefully drafted
- On stream complete, automatically advance to Screen 3

### FR-03: Contract Review (Screen 3)
- Full formatted contract displayed for agent review
- Approve & Send button at the bottom
- On click: creates a PandaDoc document with 3-party sequential signing chain

### FR-04: Signing Chain (PandaDoc)
Sequential signing order:
1. Broker signs first (authorizes the offer)
2. Buying client signs second
3. Seller / seller's agent signs last

### FR-05: Email Chain (Resend)
All emails sent via Resend, styled to match the app:
1. **Broker sign email** — sent immediately on "Approve & Send", contains PandaDoc signing link
2. **Buyer sign email** — sent after broker signs (PandaDoc webhook), contains signing link
3. **Seller sign email** — sent after buyer signs (PandaDoc webhook), contains signing link
4. **Fully executed email** — sent to ALL parties after seller signs
5. **Agent status ping** — sent to the selling agent after each party signs

### FR-06: Public, No Auth, No Database
- Publicly accessible web tool (no login required)
- No persistent storage — PandaDoc holds document state
- Form data lives in client-side Zustand store (in-memory, session only)
- Future: user accounts, editable templates (not now)

### FR-07: CI/CD
- GitHub Actions ci.yml: parallel lint + typecheck + build + tests, quality gate
- GitHub Actions deploy.yml: deploy to Vercel on CI success on main branch
- Matches servicegrid-app pipeline pattern exactly

## Non-Functional Requirements

### NFR-01: UI Quality
- Matches servicegrid-app aesthetic exactly: grayscale palette, glass morphism, Framer Motion stagger animations, Radix UI components
- Every micro-interaction animated and polished
- Responsive (mobile-friendly form)

### NFR-02: Performance
- Contract generation streams in real time — no cold wait
- Page loads < 2s (Next.js App Router, Vercel edge)

### NFR-03: Security
- API keys server-side only (Next.js API routes)
- PandaDoc webhook signature verification
- No user data persisted client-side beyond session

### NFR-04: Tech Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS + Framer Motion + Radix UI + CVA + Lucide React + Sonner
- Zustand (client-side state)
- Anthropic SDK (claude-opus-4-6, streaming)
- PandaDoc API (document creation, sequential signing, webhooks)
- Resend + React Email (transactional emails)

## Success Metrics
- SM-01: Contract drafted and sent in under 3 minutes (vs. 20-30 min manually)
- SM-02: Zero data entry duplication across form → contract → emails
- SM-03: All three parties notified and given signing links automatically
- SM-04: Fully executed contract delivered to all parties upon completion
- SM-05: CI/CD pipeline passes on every push, deploys on main merge
