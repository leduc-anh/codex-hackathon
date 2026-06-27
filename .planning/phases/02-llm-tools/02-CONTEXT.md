# Phase 2 Context: LLM Tools

## Objective

Finish the validated LLM/tool foundation that the ReAct intake agent depends on.

## Canonical References

- `docs/AGENTS.md`
- `docs/API_SPEC.md`
- `docs/PROMPTS.md`
- `docs/MVP_TASK.md`
- `docs/contracts.ts`
- `src/lib/llm/client.ts`
- `src/lib/tools/search_criteria.ts`
- `tests/lib/llm-client.test.ts`
- `tests/lib/search-criteria.test.ts`

## Current Imported State

- `callStructured` appears implemented according to `docs/MVP_TASK.md`.
- `search_criteria` appears implemented and live API verification is noted.
- `score_fit` is still pending.
- `log_feedback` and typed action boundary may still need implementation depending on source state.

## Implementation Rules

- Do not call the LLM directly outside `src/lib/llm/client.ts`.
- Do not let the LLM compute fit bands or percentages.
- Tool errors should return typed degraded results, not throw through UI boundaries.
- Preserve contract imports from `src/lib/contracts.ts`.

## Open Decisions

- Confirm whether `docs/MVP_TASK.md` or `docs/tasks.md` should become the single task-status source after GSD bootstrap.

## Deferred Scope

- UI screens start in Phase 4.
- Intake ReAct loop starts in Phase 3.
- Avatar/TTS starts in Phase 6.
