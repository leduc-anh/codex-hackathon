## Protocol

Update this file the moment a task changes state. This file is the source of truth for progress across sessions.

## P0

- [ ] T-001 · REQ-101 · SCR-01 · Configure locked Vite React TypeScript Tailwind project structure and single-page Stepper shell · status: in_progress
- [x] T-002 · REQ-706 · SCR-01 · Wire AgentState working memory with in-session persistence and rolling summary field · status: done
- [x] T-003 · REQ-653 · SCR-01 · Re-export contracts.ts and enforce Zod validation helpers at module boundaries · status: done
- [ ] T-004 · REQ-653 · SCR-01 · Build single LLM client wrapper with structured JSON output, one repair attempt, and graceful degradation · status: todo
- [ ] T-005 · REQ-103 · SCR-01 · Implement search_criteria tool with sourced criteria and abstention when not found · status: todo
- [ ] T-006 · REQ-201 · SCR-02 · Implement deterministic TypeScript score_fit rubric with qualitative band, checks, and gaps only · status: todo
- [ ] T-007 · REQ-704 · SCR-01 · Implement log_feedback tool with anonymized context and mentor-approved guideline storage path · status: todo
- [ ] T-008 · REQ-651 · SCR-01 · Ensure factual criteria and deadlines can originate only from search_criteria sources · status: todo
- [ ] T-009 · REQ-101 · SCR-01 · Implement bounded ReAct intake loop that extracts Profile from bilingual messy input · status: todo
- [ ] T-010 · REQ-102 · SCR-01 · Ask target country, program, and level inside intake before leaving ST_INTAKE · status: todo
- [ ] T-011 · REQ-104 · SCR-01 · Finish intake with structured profile, at least one gap, and non-empty shortlistSummary · status: todo
- [ ] T-012 · REQ-105 · SCR-01 · Hide raw tool traces from applicant-facing intake output · status: todo
- [ ] T-013 · REQ-201 · SCR-02 · Render Shortlist and Fit with FitBand, met counts, checks, gaps, and no percentage · status: todo
- [ ] T-014 · REQ-202 · SCR-02 · Render every factual requirement with a visible clickable source link · status: todo
- [ ] T-015 · REQ-301 · SCR-03 · Build Draft Workspace for pasted or AI-scaffolded SoP draft creation · status: todo
- [ ] T-016 · REQ-302 · SCR-03 · Ensure AI-scaffolded draft is plain and uses only Profile facts · status: todo
- [ ] T-017 · REQ-401 · SCR-04 · Generate InterrogationSession with 3 to 6 targeted turns tied to actual draft sentences · status: todo
- [ ] T-018 · REQ-402 · SCR-04 · Capture text or voice answers and extract at least two concrete specifics · status: todo
- [ ] T-019 · REQ-403 · SCR-04 · Build lightweight voice/avatar experience with text-only fallback · status: todo
- [ ] T-020 · REQ-501 · SCR-05 · Generate RewriteResult with at least two grounded ChangeItems and no invented facts · status: todo
- [ ] T-021 · REQ-654 · SCR-05 · Run CoVe-lite verification and drop or flag ungrounded claims before display · status: todo
- [ ] T-022 · REQ-502 · SCR-05 · Render before/after columns with highlighted ChangeItems and framing score delta · status: todo
- [ ] T-023 · REQ-652 · SCR-02 · Verify all fit judgments come from score_fit and never from LLM output · status: todo
- [ ] T-024 · REQ-655 · SCR-01 · Add abstention copy for unverifiable criteria instead of guessing · status: todo
- [ ] T-025 · REQ-701 · SCR-01 · Add graceful fallback paths for search, generation, avatar, and TTS failures · status: todo
- [ ] T-026 · REQ-703 · SCR-01 · Pre-warm first LLM and search calls and keep per-turn latency demo-safe · status: todo
- [ ] T-027 · REQ-702 · SCR-05 · Record backup demo video of the full P0 path · status: todo

## P1 (only after P0)

- [ ] T-028 · REQ-601 · SCR-08 · Record anonymized mentor feedback via log_feedback · status: todo
- [ ] T-029 · REQ-602 · SCR-08 · Demonstrate exactly one approved Guideline injected at runtime · status: todo
- [ ] T-030 · REQ-705 · SCR-01 · Add bilingual UI polish after the P0 path works end-to-end · status: todo
- [ ] T-031 · REQ-P1 · SCR-06 · Add Profile Edit screen only after P0 is complete · status: todo
- [ ] T-032 · REQ-P1 · SCR-07 · Add Export screen for PDF, Word, or copy only after P0 is complete · status: todo
- [ ] T-033 · REQ-P1 · SCR-09 · Add one-section Landing page only after P0 is complete · status: todo
