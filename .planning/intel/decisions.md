# Decisions

- Use Vite React TypeScript Tailwind for the MVP.
- Use typed client action modules under `src/lib/**`; no separate backend service.
- Use `docs/contracts.ts` and `src/lib/contracts.ts` as the shape source of truth.
- Use exactly three tools: `search_criteria`, `score_fit`, `log_feedback`.
- `search_criteria` is the only source of factual admission/scholarship criteria.
- `score_fit` is deterministic TypeScript and never emits percentages.
- `log_feedback` can store guidelines only when mentor-approved.
- Real-time avatar is optional behind a flag; text-only fallback is first-class.
- No vector DB, RAG pipeline, model training, fine-tuning, federated learning, auth/dashboard, B2B UI, or fabricated success probability.
