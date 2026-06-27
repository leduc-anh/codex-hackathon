# PRD.md — SoPilot (Agent-Readable Product Requirements)

> **Audience: a coding agent.** This document is written to be implemented directly.
> **Authority order (if anything conflicts):** `contracts.ts` (data/tool shapes) > `AGENTS.md` (rules & scope) > this PRD > prose elsewhere.
> **Do not redefine data shapes here** — every type referenced in `code font` lives in `contracts.ts` and is the single source of truth.
> **Prime directive:** build the P0 path in `§7 Definition of Done` first; ignore everything not on it until that path runs end-to-end without a crash. Context: 24h, 1–2 devs. When unsure, do less.

---

## 1. Glossary (use these exact terms; do not invent synonyms)
- **Applicant** — the end user (a Vietnamese student). The only persona in the demo.
- **Intake Agent** — the ReAct agent that runs the chat intake and calls tools. Implements `ReActStep`, bounded by `MAX_AGENT_STEPS`.
- **Interrogation** — the avatar step that attacks the draft and extracts specifics. Implements `InterrogationSession`.
- **Fit** — output of the `score_fit` tool (`ScoreFitResult`): a qualitative `FitBand` + gaps. **Never a percentage.**
- **Guideline** — a mentor-approved coaching rule (`Guideline`) injected as dynamic few-shot. Human-gated; not self-generated.
- **Stepper** — the single-page state machine that drives the whole MVP UI (see §4).

## 2. Scope
**In scope (MVP):** one applicant, one artifact (**Statement of Purpose / SoP only**), one connected flow: intake → shortlist/fit → draft → interrogation → rewrite/before-after.
**Out of scope (do NOT build — mirror of `AGENTS.md §6`):** auth/accounts as a requirement, dashboards, multi-application manager, billing, notifications, full mentor console, B2B/center UI, marketing pages, settings, admin panel, vector DB/RAG, federated learning, cross-session vector memory, self-rewriting prompts, real-time talking-head on the critical path, proposals/LoR/interview-prep, any fabricated success percentage.

## 3. Personas (minimal — enough to implement)
- **Minh (P0):** independent Vietnamese applicant; messy bilingual profile; high tech literacy; mobile/laptop. All demo data is seeded for Minh.
- **Ms. Lan (reference only):** center consultant; **not a UI in MVP** — exists to justify the `log_feedback` / `Guideline` mechanism in the pitch.

## 4. Core flow = a state machine (implement as a single-page Stepper)
States advance forward; user may go back one step. No multi-route navigation in MVP.

```
ST_INTAKE        → applicant chats; Intake Agent runs ReAct, calls search_criteria + score_fit
ST_SHORTLIST     → show Fit results (band + gaps + sources)
ST_DRAFT         → applicant pastes OR requests AI-scaffolded SoP draft
ST_INTERROGATION → avatar runs InterrogationSession (3–6 turns)
ST_RESULT        → Rewrite + Before/After (RewriteResult)
```
Each state maps to exactly one P0 screen (§5). State and all data persist in the typed `AgentState` object (working memory). No global store library.

## 5. Screen Inventory (IDs are stable; reference them in commits/PRs)

**P0 — required for demo:**
| ID | Screen | State | Purpose |
|----|--------|-------|---------|
| SCR-01 | Intake Chat | ST_INTAKE | Agent collects target (country/program/level) + profile; calls tools; ends with a profile+gap summary card. |
| SCR-02 | Shortlist & Fit | ST_SHORTLIST | Renders `ScoreFitResult` per school/scholarship: `FitBand`, met/unmet checks, gaps, source links. |
| SCR-03 | Draft Workspace | ST_DRAFT | Paste a draft or AI-scaffold one from the `Profile`. |
| SCR-04 | Interrogation | ST_INTERROGATION | Avatar (voice + light animated face) asks pointed questions; applicant answers text/voice. |
| SCR-05 | Before/After | ST_RESULT | Side-by-side original vs rewrite; highlighted `ChangeItem`s; framing score delta. |

**P1 — only after P0 runs end-to-end:**
| ID | Screen | Purpose |
|----|--------|---------|
| SCR-06 | Profile Edit | Editable view of structured profile (MVP default: read-only card inside SCR-01). |
| SCR-07 | Export | PDF / Word / copy of the rewritten SoP. |
| SCR-08 | Guideline Demo | Show ONE mentor-approved `Guideline` being injected (storytelling only; not the full console). |
| SCR-09 | Landing | One-section marketing page for the pitch. |

## 6. Functional Requirements (testable; each has an ID, priority, and contract reference)

### 6.1 Intake Agent — SCR-01
- **REQ-101 [P0]** As an applicant, I chat in Vietnamese/English/Vinglish and the Intake Agent extracts a structured `Profile`.
  - *Trigger:* applicant sends intake messages.
  - *Behavior:* agent runs a ReAct loop (`ReActStep`), ≤ `MAX_AGENT_STEPS`, validating every model step via `validateLlmOutput`.
  - *Acceptance:* given a messy paragraph, produces a `Profile` with ≥3 fields populated and `gapFlags.length ≥ 1`, in < ~15s.
- **REQ-102 [P0]** The agent asks target country / program / level as part of intake (no separate setup screen).
  - *Acceptance:* `Profile.targetCountry` and `Profile.level` are set before leaving ST_INTAKE.
- **REQ-103 [P0]** The agent calls `search_criteria` to obtain admission/scholarship criteria for the named target.
  - *Acceptance:* the resulting `Criterion[]` each carry a `sourceUrl`; if `SearchCriteriaResult.found === false`, the agent states it could not verify and does NOT fabricate criteria.
- **REQ-104 [P0]** The agent ends intake with a summary card (structured profile + gaps) and routes to ST_SHORTLIST.
  - *Acceptance:* a `finish` `ReActStep` is emitted with a non-empty `shortlistSummary`.
- **REQ-105 [P0]** The agent must NOT dump raw tool traces to the applicant; user-facing output is the summary + shortlist only.

### 6.2 Shortlist & Fit — SCR-02
- **REQ-201 [P0]** Display fit per target using `score_fit`.
  - *Behavior:* `score_fit` is **deterministic TypeScript** computing `ScoreFitResult` from `Profile` + `Criterion[]`. The LLM may phrase the explanation but MUST NOT produce the band or any number.
  - *Acceptance:* UI shows `FitBand`, `criteriaMet`/`criteriaTotal`, each `CriterionCheck`, and `gaps[]`. **No percentage is rendered anywhere.**
- **REQ-202 [P0]** Each criterion shows a clickable source link (`Criterion.sourceUrl`).
  - *Acceptance:* every displayed factual requirement has a visible source.

### 6.3 Draft Workspace — SCR-03
- **REQ-301 [P0]** Applicant can paste an SoP draft OR request an AI-scaffolded one.
  - *Acceptance:* a valid `Draft` exists (`body.length ≥ 1`; `source` ∈ {pasted, ai_scaffolded}) before leaving ST_DRAFT.
- **REQ-302 [P0]** An AI-scaffolded draft is deliberately plain (it gets sharpened by interrogation, not pre-polished) and invents no achievements.
  - *Acceptance:* scaffolded body contains only facts present in `Profile`.

### 6.4 Interrogation — SCR-04 (core differentiator)
- **REQ-401 [P0]** The avatar interrogates the `Draft`, targeting the weakest claims.
  - *Behavior:* produces an `InterrogationSession` with 3–6 `InterrogationTurn`s; each turn has a real `targetSentence`, a `framingTag` (`FramingTag`), and one escalating `question`.
  - *Acceptance:* ≥3 questions, each tied to an actual draft sentence; one question per turn.
- **REQ-402 [P0]** Applicant answers each turn by text or voice; the agent extracts a concrete specific.
  - *Acceptance:* ≥2 turns end with a non-null `extractedSpecific`.
- **REQ-403 [P0]** Voice/avatar must degrade to text-only on failure without breaking the flow (see REQ-701).

### 6.5 Rewrite + Before/After — SCR-05
- **REQ-501 [P0]** Generate a `RewriteResult` weaving the applicant's extracted specifics into a Western-framed SoP.
  - *Acceptance:* `changes.length ≥ 2`; every `ChangeItem.groundedIn` ∈ {student_answer, tool_source}; rewrite contains no fact absent from the session/profile/tools.
- **REQ-502 [P0]** Render before vs after side-by-side with each `ChangeItem` (`before`, `after`, `framingReason`) highlighted, plus `framingScoreBefore` → `framingScoreAfter`.
  - *Acceptance:* both columns and ≥2 explained highlights render.

### 6.6 Feedback / Guideline learning (human-in-the-loop)
- **REQ-601 [P1]** `log_feedback` records anonymized feedback (`FeedbackLogInput.context` carries NO raw PII).
- **REQ-602 [P1]** A `Guideline` is injected into the system prompt at runtime ONLY if `approvedByMentor === true`.
  - *Acceptance:* an unapproved guideline is never injected; demo shows exactly one approved guideline taking effect.
- **REQ-603 [LOCKED]** The model MUST NOT modify its own system prompt or promote guidelines without the mentor-approval flag. (No federated learning, no self-rewriting.)

## 6.7 Anti-Hallucination Requirements (cross-cutting, all [P0])
- **REQ-651** All factual criteria/deadlines originate from `search_criteria` sources; none from model memory.
- **REQ-652** All fit judgments originate from `score_fit` (code); the LLM never emits the score.
- **REQ-653** Every LLM response feeding logic is requested as JSON and passed through its Zod schema via `validateLlmOutput`; on failure, re-prompt once, then degrade. No raw `JSON.parse` into logic; no `any`.
- **REQ-654** A single verification pass (CoVe-lite) maps each claim to `VerifiedClaim`; any claim with `groundedIn === "none"` is dropped or flagged, never shown as fact.
- **REQ-655** The agent is permitted and instructed to abstain ("I couldn't verify this") rather than guess.

## 7. Non-Functional Requirements
- **REQ-701 [P0]** Graceful degradation: avatar/TTS, search, or generation failures never crash the UI; the flow continues with a text/fallback path.
- **REQ-702 [P0]** A **pre-recorded backup video** of the full P0 path exists before demo time. (Hard requirement.)
- **REQ-703 [P0]** Per-turn latency target < ~3–5s; stream tokens so the avatar can start speaking as text arrives; pre-warm the first LLM + search call.
- **REQ-704 [P0]** No PII in logs; secrets only via env vars (`AGENTS.md §11`).
- **REQ-705 [P1]** Bilingual UI (VN/EN) — agent responds in the applicant's language.
- **REQ-706 [P0]** State persists in the typed `AgentState`; long chats use rolling summarization; **no cross-session vector memory**.

## 8. Definition of Done (the only bar that matters for the demo)
End-to-end, no crash:
1. SCR-01: messy bilingual profile → structured `Profile` + ≥1 gap, with `search_criteria` (visible source) and `score_fit` (band + gaps, **no %**).
2. SCR-03: a valid `Draft` exists.
3. SCR-04: interrogation with ≥3 targeted questions, ≥2 extracted specifics.
4. SCR-05: before/after with ≥2 grounded, explained `ChangeItem`s, inventing nothing.
5. REQ-702 satisfied (backup video).
Everything else is secondary.

## 9. Assumptions & open questions (resolve with the human, do not guess)
- A1: Specific hackathon rubric unknown → optimized for innovation/impact/technical-depth/feasibility/presentation. Confirm to re-tune.
- A2: Avatar fidelity = voice + light animated face by default; real talking-head only behind `AVATAR_REALTIME` flag.
- A3: Persistence = in-session for the demo unless Supabase is trivially wired. Pick one (`AGENTS.md §2`).
- Q1: Final product name (SoPilot vs Hành Trang)? Does not block the build.

## 10. Traceability
Each REQ implements behavior whose shapes are defined in `contracts.ts` and whose constraints are locked in `AGENTS.md`. Changing a [LOCKED] requirement follows `AGENTS.md §10` (human approval + one-line decision-log entry).
