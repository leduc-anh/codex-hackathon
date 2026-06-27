# API_SPEC.md — SoPilot Server Actions

> **Authority order:** `contracts.ts` > `AGENTS.md` > `PRD.md` > `ARCHITECTURE.md` > this doc.
> **Convention:** prefer Next.js **server actions** (`/app/actions.ts`); only use `/app/api/*` route handlers if a streaming HTTP endpoint is needed (interrogation/rewrite token streaming). All inputs/outputs use the Zod types from `contracts.ts` — validate at the boundary. No endpoint returns an un-typed object.

---

## Conventions
- Every action validates its input with the relevant Zod schema before doing work.
- Every action that calls the LLM goes through `/lib/llm/client.ts#callStructured` (never raw).
- Errors are returned as a typed result, not thrown across the boundary:
  ```ts
  type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code: ErrorCode };
  type ErrorCode = "VALIDATION" | "LLM_FAILED" | "SEARCH_FAILED" | "NOT_FOUND" | "DEGRADED";
  ```
- `DEGRADED` means a fallback was used and the UI should continue (REQ-701), not show a fatal error.

---

## A1 — `runIntakeStep`  (SCR-01 · REQ-101..105)
Advance the ReAct loop by one step.
- **Input:** `{ state: AgentState, userMessage: string | null }`
- **Output:** `ActionResult<{ state: AgentState; step: ReActStep; userFacing: string | null }>`
- **Behavior:** build system prompt (base + `state.activeGuidelines`) → `callStructured(zReActStep, …)` → dispatch `step.action`:
  - `call_tool` → run the named tool (A2/A3/A4), append observation to `state`.
  - `ask_user` → return `userFacing` = the question.
  - `finish` → return `userFacing` = `shortlistSummary`; loop ends.
- **Guards:** reject if step count ≥ `MAX_AGENT_STEPS` (return `finish`). All factual claims must come from tool observations (REQ-651).
- **Errors:** `VALIDATION` (bad state), `LLM_FAILED` (after repair-once) → caller degrades to a plain follow-up question.

## A2 — `searchCriteria`  (tool · REQ-103)
- **Input:** `SearchCriteriaInput`
- **Output:** `ActionResult<SearchCriteriaResult>`
- **Behavior:** query the hosted search API; extract criteria each with a `sourceUrl`; if nothing reliable found, return `{ found: false, criteria: [], sources: [] }`.
- **Rule:** never synthesize a criterion without a source. `found:false` ⇒ agent abstains (REQ-655).
- **Errors:** `SEARCH_FAILED` → treated as `found:false` downstream (REQ-701).

## A3 — `scoreFit`  (tool · REQ-201)
- **Input:** `ScoreFitInput`
- **Output:** `ActionResult<ScoreFitResult>`
- **Behavior:** **pure deterministic TypeScript.** Compare `Profile` to each `Criterion`, build `CriterionCheck[]`, derive `FitBand` from met/total + hard requirements, list concrete `gaps`. **No LLM. No percentage.** (REQ-652)
- **Errors:** `VALIDATION` only (it cannot call external services).

## A4 — `logFeedback`  (tool · REQ-601..603)
- **Input:** `FeedbackLogInput`  (context MUST be anonymized — no raw PII)
- **Output:** `ActionResult<FeedbackLogResult>`
- **Behavior:** persist feedback; if `proposedGuideline.approvedByMentor === true`, promote it to the guideline bank and return its id; otherwise store unpromoted.
- **Rule:** never auto-approve; never let the model promote its own guideline (REQ-603).

## A5 — `scaffoldDraft`  (SCR-03 · REQ-301..302)
- **Input:** `{ profile: Profile }`
- **Output:** `ActionResult<Draft>`  (`source: "ai_scaffolded"`)
- **Behavior:** `callStructured(zDraft, …)` producing a deliberately plain SoP using ONLY facts in `profile`. Invents nothing (REQ-302).
- **Errors:** `LLM_FAILED` → caller falls back to the paste path.

## A6 — `nextInterrogationTurn`  (SCR-04 · REQ-401..403) — streaming optional
- **Input:** `{ draft: Draft; profile: Profile; session: InterrogationSession | null; lastAnswer: string | null }`
- **Output:** `ActionResult<{ session: InterrogationSession; done: boolean }>`
- **Behavior:** if `lastAnswer` present, attach it to the open turn and set `extractedSpecific`; then, if turn count < 6 and weak claims remain, append a new `InterrogationTurn` (real `targetSentence`, `framingTag`, one escalating `question`). `done:true` after 3–6 turns or when no weak claims remain.
- **Voice:** transcription handled client-side or via TTS service; failure ⇒ text-only (REQ-403, `DEGRADED`).

## A7 — `generateRewrite`  (SCR-05 · REQ-501..502)
- **Input:** `{ draft: Draft; session: InterrogationSession; profile: Profile }`
- **Output:** `ActionResult<RewriteResult>`
- **Behavior:** `callStructured(zRewriteResult, …)` weaving `extractedSpecific`s + tool facts into a Western-framed SoP; each `ChangeItem.groundedIn` ∈ {student_answer, tool_source}; then run `/lib/llm/verify.ts` (CoVe-lite) and strip any ungrounded claim (REQ-654). Guarantee `changes.length ≥ 2`.
- **Errors:** `LLM_FAILED` → return original draft + a bulleted suggestion list (degrade, never blank).

---

## Endpoint → screen → requirement map
| Action | Screen | REQs |
|--------|--------|------|
| runIntakeStep | SCR-01 | 101–105, 651–655 |
| searchCriteria | SCR-01 | 103, 202 |
| scoreFit | SCR-02 | 201, 652 |
| scaffoldDraft | SCR-03 | 301–302 |
| nextInterrogationTurn | SCR-04 | 401–403 |
| generateRewrite | SCR-05 | 501–502, 654 |
| logFeedback | (P1) | 601–603 |
