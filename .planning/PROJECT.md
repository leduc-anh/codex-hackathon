# SoPilot

## What This Is

SoPilot is a Vite React TypeScript hackathon MVP for helping a Vietnamese applicant turn a messy bilingual profile into an authentic, Western-framed Statement of Purpose. The demo flow is a single-page stepper: intake agent and tools, shortlist and fit, draft, interrogation, then grounded rewrite with before/after.

The current project is brownfield: code and docs already exist, and this GSD setup was bootstrapped from `docs/PRD.md`, `docs/AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/API_SPEC.md`, `docs/MVP_TASK.md`, `docs/ui-spec.md`, and root `ROADMAP.md`.

## Core Value

The demo must show an end-to-end no-crash SoP transformation where every factual criterion and every new essay detail is grounded, cited, or supplied by the student.

## Business Context

- **Customer**: Vietnamese study-abroad applicant; center/mentor persona is reference-only for MVP.
- **Revenue model**: Not in current scope.
- **Success metric**: A live P0 demo completes SCR-01 through SCR-05 without crash and with no fabricated success percentage.
- **Strategy notes**: Build the demo path first; scope discipline beats completeness.

## Requirements

### Validated

- Search criteria implementation exists and has live API verification recorded in `docs/MVP_TASK.md`.
- Structured LLM wrapper exists according to current task status.
- Contracts are re-exported from `src/lib/contracts.ts`.

### Active

- [ ] Keep all state in typed `AgentState` with in-session persistence and rolling summary.
- [ ] Implement deterministic `score_fit` with qualitative band and no percentage.
- [ ] Implement bounded ReAct intake agent and user-facing intake flow.
- [ ] Implement shortlist, draft, interrogation, rewrite, and verification screens/actions.
- [ ] Preserve graceful degradation for search, LLM generation, avatar, and TTS failures.
- [ ] Record a backup demo video of the full P0 path.

### Out of Scope

- Auth, dashboards, B2B center UI, billing, notifications, settings, admin, marketing site beyond optional one-section P1.
- Proposal, LoR, interview prep, multi-application management, vector DB/RAG, model training, fine-tuning, federated learning.
- Real-time talking-head avatar on the critical path.
- Fabricated success percentages or LLM-generated fit scores.
- Extra dependencies outside the locked stack unless the human explicitly changes the lock.

## Context

- Stack: Vite, React, TypeScript, Tailwind CSS, Zod.
- Runtime/API: no separate backend service; typed client-side action modules under `src/lib/**`.
- LLM/search: OpenAI-compatible structured calls and OpenAI web search via Responses API with `LLM_API_KEY`.
- Voice/avatar: ElevenLabs or browser/TTS fallback; text-only must remain first-class.
- Primary docs: `docs/AGENTS.md` is the locked agent contract; `docs/contracts.ts` is the single source of truth for shapes.
- Current sprint signal: root `ROADMAP.md` says S2 is current and P0 is about 15% done.

## Constraints

- **Timeline**: 24-hour hackathon; optimize for live demo path.
- **Scope**: One applicant, one artifact, one stepper flow.
- **Anti-hallucination**: Facts from `search_criteria`; fit from deterministic `score_fit`; rewrites grounded by student answers or tool sources.
- **Validation**: Every LLM output feeding logic must be Zod-validated and repaired once before degrading.
- **Dependencies**: No extra libraries beyond locked stack without human approval.
- **Privacy**: Secrets via env; no raw PII in logs.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Vite React TypeScript Tailwind | Current repo and hackathon speed favor a single frontend app | Pending |
| No separate backend service | Keep MVP small and local to typed client modules | Pending |
| Three tools only: search_criteria, score_fit, log_feedback | Locked agent design and bounded ReAct loop | Pending |
| score_fit is deterministic TypeScript | Prevent hallucinated scores and percentages | Pending |
| In-session state is acceptable for demo | Fastest persistence path for 24h MVP | Pending |
| Avatar is degradable TTS/light animated face | Real-time talking head is not on critical path | Pending |

---
*Last updated: 2026-06-27 after GSD ingest from existing docs*
