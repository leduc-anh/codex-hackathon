# Roadmap: SoPilot

## Overview

Build the 24-hour SoPilot P0 demo as a single-page Stepper. The roadmap mirrors the existing root `ROADMAP.md` sprint order while converting it into GSD phases. Current imported position is S2 / Phase 2.

## Phases

- [x] **Phase 1: Foundation Contracts** - Vite/Tailwind shell and shared contracts wiring. (imported complete 2026-06-27)
- [ ] **Phase 2: LLM Tools** - Structured LLM client, search criteria, score fit, and feedback tool interfaces.
- [ ] **Phase 3: Intake Agent** - Bounded ReAct intake agent with profile extraction, criteria search, fit, and abstention.
- [ ] **Phase 4: Intake Shortlist UI** - SCR-01 and SCR-02 screens with profile summary, fit bands, gaps, and sources.
- [ ] **Phase 5: Draft Workspace** - SCR-03 draft paste/scaffold path.
- [ ] **Phase 6: Interrogation** - SCR-04 targeted interrogation with degradable avatar/text path.
- [ ] **Phase 7: Rewrite Verification** - SCR-05 grounded rewrite, before/after, and CoVe-lite verification.
- [ ] **Phase 8: Degrade Demo Hardening** - Error handling, pre-warm, seed demo data, latency polish.
- [ ] **Phase 9: Backup Demo** - Rehearsed backup video of the complete P0 path.

## Phase Details

### Phase 1: Foundation Contracts
**Goal**: As the builder, I have the locked Vite React TypeScript Tailwind app shape and contract re-export needed for all P0 work.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: [REQ-704]
**Canonical refs**: `docs/AGENTS.md`, `docs/contracts.ts`, `docs/MVP_TASK.md`
**Success Criteria** (what must be TRUE):
  1. Vite React TypeScript app builds with strict TypeScript.
  2. `src/lib/contracts.ts` re-exports locked contract shapes.
  3. Env example documents required demo keys and feature flags.
**Plans**: TBD

Plans:
- [ ] 01-01: Reconcile baseline app shell, strict TypeScript, Tailwind, env, and contract exports.

### Phase 2: LLM Tools
**Goal**: As the builder, I have the validated LLM wrapper and typed tool layer needed before the intake agent can run.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: [REQ-103, REQ-201, REQ-652, REQ-653, REQ-704]
**Canonical refs**: `docs/API_SPEC.md`, `docs/PROMPTS.md`, `docs/AGENTS.md`, `docs/contracts.ts`, `docs/MVP_TASK.md`
**Success Criteria** (what must be TRUE):
  1. All LLM calls go through `src/lib/llm/client.ts` and validate structured JSON with repair-once.
  2. `search_criteria` returns sourced criteria or `found=false` without fabrication.
  3. `score_fit` is deterministic TypeScript and renders no percentage.
  4. Tool/action errors return typed degraded results instead of crashing callers.
**Plans**: TBD

Plans:
- [ ] 02-01: Finish tool layer around `score_fit`, `log_feedback`, action result typing, and tests.

### Phase 3: Intake Agent
**Goal**: As Minh, I can paste a messy bilingual profile and the intake agent extracts a profile, finds criteria, scores fit, flags gaps, and abstains when sources are missing.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: [REQ-101, REQ-102, REQ-103, REQ-104, REQ-105, REQ-651, REQ-655, REQ-706]
**Canonical refs**: `docs/PRD.md`, `docs/API_SPEC.md`, `docs/PROMPTS.md`, `docs/AGENTS.md`
**Success Criteria** (what must be TRUE):
  1. ReAct loop is capped by `MAX_AGENT_STEPS`.
  2. Agent asks target country, program, and level inside intake.
  3. Agent finishes with profile, at least one gap, and non-empty shortlist summary.
  4. User never sees raw tool traces.
**Plans**: TBD

Plans:
- [ ] 03-01: Build `AgentState`, memory helpers, ReAct loop, system prompt, and tool dispatch.

### Phase 4: Intake Shortlist UI
**Goal**: As Minh, I can move from intake chat to a readable shortlist and fit screen showing qualitative bands, gaps, and sources.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: [REQ-101, REQ-104, REQ-201, REQ-202]
**Canonical refs**: `docs/ui-spec.md`, `docs/page-content.json`, `docs/design-tokens.json`, `docs/PRD.md`
**Success Criteria** (what must be TRUE):
  1. SCR-01 renders chat thread, input dock, and profile summary card.
  2. SCR-02 renders fit cards with qualitative band and no percentage.
  3. Criteria and sources are visible and clickable.
  4. Stepper moves from ST_INTAKE to ST_SHORTLIST.
**Plans**: TBD

Plans:
- [ ] 04-01: Build Stepper, Intake Chat, Profile Summary, Shortlist Fit, and source chips.

### Phase 5: Draft Workspace
**Goal**: As Minh, I can paste a draft or generate a plain scaffold that only uses profile facts.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: [REQ-301, REQ-302]
**Canonical refs**: `docs/PRD.md`, `docs/API_SPEC.md`, `docs/PROMPTS.md`, `docs/ui-spec.md`
**Success Criteria** (what must be TRUE):
  1. SCR-03 creates a valid `Draft` before proceeding.
  2. Paste and AI-scaffold paths both work.
  3. Scaffolded draft invents no achievements.
**Plans**: TBD

Plans:
- [ ] 05-01: Build draft action and workspace UI.

### Phase 6: Interrogation
**Goal**: As Minh, I can answer 3 to 6 targeted questions tied to actual draft sentences, with text-only fallback if avatar or voice fails.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: [REQ-401, REQ-402, REQ-403]
**Canonical refs**: `docs/PRD.md`, `docs/PROMPTS.md`, `docs/TALKINGHEAD.md`, `docs/ui-spec.md`
**Success Criteria** (what must be TRUE):
  1. Each interrogation turn targets a real draft sentence.
  2. At least two answers produce concrete extracted specifics.
  3. Avatar/TTS failure continues as text-only.
**Plans**: TBD

Plans:
- [ ] 06-01: Build interrogation action module and SCR-04 text-first UI with avatar fallback.

### Phase 7: Rewrite Verification
**Goal**: As Minh, I see a grounded before/after rewrite where every new detail comes from my answers or tool sources.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: [REQ-501, REQ-502, REQ-654]
**Canonical refs**: `docs/PRD.md`, `docs/API_SPEC.md`, `docs/PROMPTS.md`, `docs/ui-spec.md`
**Success Criteria** (what must be TRUE):
  1. Rewrite has at least two grounded `ChangeItem`s.
  2. CoVe-lite removes or flags ungrounded claims.
  3. Before/after screen shows highlighted changes and reasons.
**Plans**: TBD

Plans:
- [ ] 07-01: Build rewrite generation, verification, and SCR-05 reveal UI.

### Phase 8: Degrade Demo Hardening
**Goal**: As the presenter, I can run the P0 path through failures, pre-warmed calls, and seeded Minh data without dead ends.
**Mode:** mvp
**Depends on**: Phase 7
**Requirements**: [REQ-701, REQ-703]
**Canonical refs**: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/MVP_TASK.md`
**Success Criteria** (what must be TRUE):
  1. Search, generation, avatar, and TTS failures show directed fallback states.
  2. First LLM and search calls are pre-warmed.
  3. Seed Minh demo data shortens live typing.
**Plans**: TBD

Plans:
- [ ] 08-01: Harden degraded states, pre-warm, and seed demo path.

### Phase 9: Backup Demo
**Goal**: As the presenter, I have a pre-recorded backup video of the full P0 path before demo time.
**Mode:** mvp
**Depends on**: Phase 8
**Requirements**: [REQ-702]
**Canonical refs**: `docs/PRD.md`, `docs/MVP_TASK.md`
**Success Criteria** (what must be TRUE):
  1. Full P0 path is rehearsed.
  2. Backup video includes intake, draft, interrogation, rewrite, and before/after.
  3. Video is available locally before demo time.
**Plans**: TBD

Plans:
- [ ] 09-01: Rehearse and record backup demo video.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation Contracts | 0/1 | Complete | 2026-06-27 |
| 2. LLM Tools | 0/1 | In progress | - |
| 3. Intake Agent | 0/1 | Not started | - |
| 4. Intake Shortlist UI | 0/1 | Not started | - |
| 5. Draft Workspace | 0/1 | Not started | - |
| 6. Interrogation | 0/1 | Not started | - |
| 7. Rewrite Verification | 0/1 | Not started | - |
| 8. Degrade Demo Hardening | 0/1 | Not started | - |
| 9. Backup Demo | 0/1 | Not started | - |
