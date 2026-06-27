# GSD State: SoPilot

status: active
milestone_version: v1.0
current_phase: 2
current_phase_name: LLM Tools
progress: 15
created_at: 2026-06-27
updated_at: 2026-06-27

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-27)

**Core value:** End-to-end grounded SoP transformation without crash.
**Current focus:** Phase 2 - LLM Tools

## Position

The repository already has code and docs. GSD was initialized from existing planning material, not from a greenfield interview.

- Root `ROADMAP.md` says current sprint is S2 and P0 is about 15% done.
- `docs/MVP_TASK.md` marks contract re-export, env setup, LLM wrapper, and `search_criteria` as done.
- `score_fit`, ReAct intake loop, UI screens, interrogation, rewrite verification, hardening, and backup demo remain.

## Decisions

- Keep the MVP as a single-page Vite React TypeScript Tailwind app.
- Use typed client action modules; no separate backend service for P0.
- Use OpenAI-compatible structured LLM calls through one wrapper.
- Use OpenAI web search through `search_criteria`; every criterion must carry a source URL.
- Keep fit qualitative and deterministic through `score_fit`; no percentages.
- Keep avatar/TTS degradable; text-only remains valid.

## Blockers

- None recorded in GSD ingest.

## Notes

- Do not treat `docs/tasks.md` and `docs/MVP_TASK.md` as equally authoritative for current task status when they conflict. Prefer `docs/MVP_TASK.md` plus root `ROADMAP.md` for the imported current sprint state.
- Existing git worktree has non-GSD changes; this ingest did not commit.
