# GSD Ingest Synthesis: SoPilot

## Source Documents

- `docs/AGENTS.md` - locked architecture and agent contract.
- `docs/PRD.md` - product requirements and screen inventory.
- `docs/API_SPEC.md` - typed action modules and tool contracts.
- `docs/ARCHITECTURE.md` - system architecture, folder structure, data flow, degradation matrix.
- `docs/MVP_TASK.md` - current living sprint task status.
- `docs/tasks.md` - alternate detailed task list; conflicts with MVP_TASK in places.
- `docs/ui-spec.md` - implemented UI target for SCR-01 through SCR-05.
- `docs/PROMPTS.md` - prompt library for structured LLM calls.
- `docs/TALKINGHEAD.md` - design brief for avatar/interrogation experience.
- `README.md` - base Vite README, not product-specific.
- `ROADMAP.md` - root sprint roadmap and current sprint indicator.

## Product Summary

SoPilot helps a Vietnamese student turn a messy bilingual profile and a plain SoP draft into a grounded, Western-framed Statement of Purpose. The product is a live hackathon demo, so the P0 path is intentionally narrow: intake, shortlist/fit, draft, interrogation, rewrite, before/after.

## Locked Decisions

- One applicant persona and one artifact: SoP only.
- Single-page Stepper, not a multi-route app.
- Vite + React + TypeScript + Tailwind + Zod.
- No separate backend service for MVP.
- Exactly three agent tools: `search_criteria`, `score_fit`, `log_feedback`.
- Facts originate from `search_criteria`; scores originate from deterministic TypeScript `score_fit`.
- Structured LLM outputs are schema-validated with one repair attempt and graceful degradation.
- No vector DB, model training, fine-tuning, federated learning, auth/dashboard, B2B UI, or real-time talking head on the critical path.

## Current State

Imported state is Phase 2 / S2. The project appears to have the LLM wrapper and `search_criteria` in progress or done, with live API verification noted. The immediate GSD next step is to plan remaining Phase 2 work around `score_fit`, `log_feedback`, typed action result boundaries, and tests.

## Risk Notes

- Task sources conflict. Prefer `docs/MVP_TASK.md` and root `ROADMAP.md` for current sprint position.
- Some markdown content appears mojibake-encoded. New GSD artifacts use ASCII to avoid adding encoding noise.
- Existing git status is dirty with source and doc changes; GSD ingest should not commit automatically.
