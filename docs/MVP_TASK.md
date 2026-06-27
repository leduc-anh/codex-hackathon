# tasks.md — SoPilot MVP (living todo)

> **Locked AI providers:** **OpenAI** (LLM, optional web search, optional STT) · **ElevenLabs** (TTS).
> Format: `- [ ] T-NNN · REQ-xxx · SCR-xx · action · status: todo|in_progress|done|blocked`

## Protocol
Update this file the moment a task changes state. This file is the source of truth for progress across
sessions. Never mark a P0 task `done` unless its PRD acceptance criteria are met. Commit this file with
the code change that completes a task.

## ⚠ Open dependency to confirm (resolve with human)
- `search_criteria` needs a grounding source. Two options, both keep us to OpenAI+ElevenLabs only if you
  pick the first: **(a)** OpenAI web-search tool (Responses API) → no extra vendor; **(b)** dedicated
  search API (Exa/Tavily) → needs `SEARCH_API_KEY`. Either way every criterion MUST carry a source URL.
  Default assumption until told otherwise: **(a)**.

## P0 — required for the demo (build in this order)
- [ ] T-001 · — · — · Configure Vite + React + TypeScript strict + Tailwind project baseline · status: in_progress
- [x] T-002 · — · — · Re-export locked `docs/contracts.ts` from `src/lib/contracts.ts`; strict mode on; no `any` · status: done
- [x] T-003 · REQ-704 · — · Env setup + `.env.example`: `LLM_API_KEY`, `SEARCH_API_KEY`, optional `TTS_API_KEY`, Supabase keys, `AVATAR_REALTIME=false` · status: done
- [ ] T-004 · REQ-653 · — · `/lib/llm/client.ts#callStructured`: OpenAI chat call with structured outputs/JSON mode → Zod validate → repair-once → degrade. Only LLM entrypoint. · status: todo
- [ ] T-005 · REQ-706 · — · `/lib/memory/state.ts`: `AgentState` + rolling summary; Stepper host with `ST_*` state machine · status: todo
- [ ] T-006 · REQ-103,202 · SCR-01 · `/lib/tools/search_criteria.ts` (OpenAI web search by default) → `Criterion[]` with `sourceUrl`; `found=false` path · status: todo
- [ ] T-007 · REQ-201,652 · SCR-02 · `/lib/tools/score_fit.ts` pure TS rubric → `ScoreFitResult` (band + gaps, **NO %**, no LLM) · status: todo
- [ ] T-008 · REQ-101..105 · SCR-01 · `/lib/agent/loop.ts` ReAct `runIntakeStep`; validate each `ReActStep`; cap at `MAX_AGENT_STEPS` · status: todo
- [ ] T-009 · REQ-101,104 · SCR-01 · Intake chat UI → `runIntakeStep`; ends with profile + gaps summary card · status: todo
- [ ] T-010 · REQ-201,202 · SCR-02 · Shortlist & Fit UI: band, `CriterionCheck`s, gaps, clickable sources + score-explanation prompt · status: todo
- [ ] T-011 · REQ-301,302 · SCR-03 · `scaffoldDraft` action + Draft workspace (paste OR AI-scaffold, invents nothing) · status: todo
- [ ] T-012 · REQ-401,402 · SCR-04 · `nextInterrogationTurn` action module + interrogation UI (text path first) · status: todo
- [ ] T-013 · REQ-403 · SCR-04 · ElevenLabs streaming TTS: avatar speaks each question; **text-only fallback** on failure · status: todo
- [ ] T-014 · REQ-501,502,654 · SCR-05 · `generateRewrite` + `/lib/llm/verify.ts` (CoVe-lite, drop ungrounded) + Before/After UI (≥2 ChangeItems + score delta) · status: todo
- [ ] T-015 · REQ-701 · — · Wrap every OpenAI/ElevenLabs/search call in try/catch → `DEGRADED`; nothing crashes the UI · status: todo
- [ ] T-016 · REQ-703 · — · Pre-warm first OpenAI + search call; seed "Minh" demo data · status: todo
- [ ] T-017 · REQ-702 · — · Record backup demo video of the full P0 path (hard requirement) · status: todo

## P1 (only after P0 runs end-to-end)
- [ ] T-101 · REQ-402 · SCR-04 · Voice input via OpenAI transcription (Whisper / gpt-4o-transcribe); text stays default · status: todo
- [ ] T-102 · — · SCR-06 · Profile edit screen (MVP default is read-only card) · status: todo
- [ ] T-103 · — · SCR-07 · Export SoP (PDF / Word / copy) · status: todo
- [ ] T-104 · REQ-601..603 · SCR-08 · `log_feedback` collect + demo ONE mentor-approved `Guideline` injection · status: todo
- [ ] T-105 · — · SCR-09 · One-section landing page for the pitch · status: todo
- [ ] T-106 · REQ-705 · — · VN/EN bilingual polish · status: todo
