 bnn# AGENTS.md — b Architecture & Agent Contract (LOCKED)

> **Rename for your tool:** `CLAUDE.md` (Claude Code) · `.cursorrules` (Cursor) · `AGENTS.md` (Windsurf/Codex/generic).
> **This file is binding.** The coding agent MUST read it before generating code and MUST NOT violate any item marked **[LOCKED]**. To change a [LOCKED] item, see §10 (Change Protocol). The machine-enforced source of truth for all data/tool shapes is `contracts.ts` — code MUST type-check and runtime-validate against it.
> **Context:** 24-hour hackathon, 1–2 developers. The demo is the product. Scope discipline beats completeness. When unsure, do LESS.

---

## 0. How the agent must behave (read first)
- Obey every **[LOCKED]** decision. If a request conflicts with one, STOP and ask the human; do not silently comply.
- Never add a dependency not listed in §2. No "while I was here" refactors. No speculative abstraction.
- Prefer the smallest change that makes the demo path work. Optimize for the critical path in §9, not for production hardening.
- All data crossing a module boundary or coming back from an LLM MUST be parsed/validated with the Zod schemas in `contracts.ts`. No `any`, no unvalidated `JSON.parse`.
- If something in §6 (DO NOT BUILD) is requested, refuse and cite this section.

---

## 1. Mission & scope [LOCKED]
SoPilot helps a Vietnamese applicant turn a messy profile into an authentic, Western-framed Statement of Purpose (SoP). The single demo flow is:

```
intake (agent + tools) → draft → interrogation (avatar) → rewrite + before/after
```

- Demo follows **ONE persona** (independent student). B2B/center flow is pitch-slide only — **do not build a center UI**.
- Artifact in scope: **SoP only**. "Proposals", LoR, interview prep are out.

## 2. Locked technology stack [LOCKED]
- **Frontend:** Vite + React + **TypeScript** + Tailwind CSS.
- **Backend:** No separate backend service in the MVP. Use typed client-side action modules under `src/lib/**`; any external LLM/search calls still go through the single wrapper and must degrade safely.
- **Persistence:** Supabase (Postgres) via its client **OR** in-memory/session state for the demo. Choose ONE and stick to it. (For a pure demo, in-session is acceptable and faster.)
- **LLM:** one frontier model via API (Claude or GPT-4-class). All intelligence is prompt-engineered. **No training, no fine-tuning.**
- **Search grounding:** OpenAI web search via the Responses API. **Not** a self-hosted vector DB.
- **Voice/Avatar:** TTS (browser SpeechSynthesis or ElevenLabs) + a lightweight animated face. A real talking-head API (HeyGen/D-ID/Simli) is **optional, behind a flag**, and never on the demo critical path.
- **Validation:** **Zod** (runtime validation of all LLM output and tool I/O).
- Allowed extra libs: none beyond the above without a §10 change. No state-management lib (use React state + the typed state object). No ORM (use Supabase client or in-memory).

## 3. Locked agent design [LOCKED]
The intake "chatbot" is an **agent running a ReAct loop** (Reason → Act → Observe → repeat), capped at a small step budget (default **6 steps**) to bound latency and cost.

**Exactly three tools. No more.** Full I/O types live in `contracts.ts`; here is what each MUST and MUST NOT do:

1. **`search_criteria`** — fetch scholarship/admission criteria for the school/program/level the applicant named.
   - MUST return facts **with source URLs**. MUST be the ONLY origin of factual criteria.
   - MUST allow "not found" → the agent then says it doesn't know rather than inventing.
2. **`score_fit`** — compare the applicant's profile to retrieved criteria.
   - **Computed in plain TypeScript from a transparent rubric. The LLM does NOT produce the score.**
   - Returns a qualitative **band** + a per-criterion met/unmet list + concrete **gaps**. **NEVER returns a fabricated success percentage.**
3. **`log_feedback`** — record mentor/user feedback and, when mentor-approved, store a versioned **Guideline**.
   - MVP responsibility: **collect** feedback and store guidelines. Guidelines are injected into the system prompt at runtime (dynamic few-shot).
   - The model **MUST NOT rewrite its own system prompt unsupervised.** Guideline promotion requires a human (mentor) approval flag. This is "human-in-the-loop guideline learning," **not** federated learning and **not** self-modification.

**Agent output contract:** the agent finishes by handing the student a short shortlist ("top fits + your specific gaps") and routing into the interrogation step. It does not dump raw tool traces to the user.

## 4. Anti-hallucination contract [LOCKED]
Ordered by priority; all are required for the demo:
1. **Facts come from tools, not memory.** Any numeric criterion, deadline, or requirement MUST trace to a `search_criteria` source. The fit score MUST come from `score_fit` (code), never from the LLM.
2. **Mandatory citations + abstention.** Factual claims carry source URLs. The agent is explicitly allowed and instructed to say "I couldn't verify this" instead of guessing.
3. **Structured output + validation.** Every LLM response that feeds logic MUST be requested as JSON and parsed through a Zod schema; on failure, repair/re-prompt once, then degrade gracefully. Never crash the UI.
4. **One verification pass (CoVe-lite).** Before showing the rewrite, run a single check that flags any claim not grounded in (a) a tool source or (b) something the student said in interrogation. Flagged → removed or marked, never shown as fact.
5. **No invention in the rewrite.** The rewrite uses ONLY facts the student supplied or tools returned. The system never adds achievements.

(Self-consistency / multi-sample voting is optional and only for `score_fit` tie-breaks — costs latency, use sparingly.)

## 5. Memory contract [LOCKED]
- **Working memory = a single typed state object** (`AgentState` in `contracts.ts`) carrying Profile + current Draft + interrogation turns. Re-inject the relevant slice each turn. This is the primary memory — treat it as the source of truth.
- **Long conversations = rolling summarization** of older turns to stay within context; the structured state remains canonical.
- **No cross-session vector memory in MVP.** (Future Scope: Supabase pgvector. Do not add now.)

## 6. DO NOT BUILD (explicit) [LOCKED]
Refuse these even if they seem helpful. Each is a known 24h time-sink or a footgun:
- ❌ Federated learning / any model weight training or fine-tuning.
- ❌ Self-hosted vector DB or RAG pipeline (ingestion, chunking, embeddings infra).
- ❌ Cross-session vector memory store.
- ❌ Model self-rewriting its own system prompt without mentor approval.
- ❌ Custom auth / user management as a must-have (use Supabase magic-link only if trivial, else skip).
- ❌ Real-time streaming talking-head avatar on the demo critical path.
- ❌ A B2B / center dashboard UI.
- ❌ "Proposal", LoR, or interview-prep features.
- ❌ A fabricated success-probability number anywhere.
- ❌ Microservices, message queues, Docker orchestration, GraphQL, Redux, custom design system.
- ❌ Adding any dependency not in §2.

## 7. Code conventions & structure [LOCKED shape, flexible detail]
```
/src            Vite React UI (intake chat, draft, interrogation, before/after)
/src/lib/agent  ReAct loop + tool dispatch
/src/lib/tools  search_criteria.ts, score_fit.ts, log_feedback.ts
/src/lib/llm    single LLM client wrapper (structured-output + Zod validate + repair)
/src/lib/contracts.ts re-exports contracts.ts (single source of truth for types)
/src/lib/memory state object + rolling summary helpers
```
- TypeScript strict mode on. No `any`. Functions that touch LLM output return validated, typed data.
- Each tool is a pure-ish function matching its contract signature. Side effects (network, db) isolated and wrapped in try/catch with graceful fallback.
- Secrets only via env vars (§11). Never hardcode keys. Never log PII.

## 8. Interface contracts → `contracts.ts` [LOCKED]
`contracts.ts` is the **single source of truth** for every data shape and tool signature. The agent MUST import from it and MUST NOT redefine these shapes inline. Changing a contract = changing the lock (§10). The compiler + Zod are the enforcement mechanism for this entire document.

## 9. Definition of Done (demo critical path) [LOCKED]
The build is "done enough to win" when, end-to-end and without a crash:
1. Paste a messy bilingual profile → agent returns a structured profile + ≥1 gap, using `search_criteria` (with a visible source) and `score_fit` (band + gaps, no fake %).
2. A draft exists (pasted or scaffolded).
3. The avatar runs interrogation: ≥3 pointed questions tied to specific sentences; captures ≥2 real new details.
4. Rewrite + before/after renders with ≥2 highlighted, explained framing changes, inventing nothing.
5. **A pre-recorded backup video of this exact flow exists.** (Non-negotiable.)
Anything not on this path is secondary. Ship the path first, polish later.

## 10. Change protocol [LOCKED]
- A **[LOCKED]** item changes ONLY by explicit human instruction, not by agent initiative.
- When changed, append one line to §12 Decision Log: `DATE — what changed — why`. Then update `contracts.ts` if shapes changed.
- The agent must surface trade-offs and time cost before any unlock, and must not unlock something just because it would be "nicer."

## 11. Env / runbook (brief)
Required env vars: `LLM_API_KEY` (LLM + OpenAI web search), (optional) `OPENAI_WEB_SEARCH_MODEL`, (optional) `OPENAI_RESPONSES_API_BASE`, (optional) `TTS_API_KEY`, (optional) `SUPABASE_URL` + `SUPABASE_ANON_KEY`, `AVATAR_REALTIME=false` (feature flag, default off).
Run: `npm install && npm run dev`. Pre-warm the first LLM + search call before demoing. Seed the demo persona ("Minh") so no long typing happens live.

## 12. Decision Log
- 2026-06-27 — Initialized contract. Locked: single SoP flow, Next.js+TS+Tailwind stack, 3-tool ReAct agent, code-computed `score_fit` (no LLM %), human-gated guideline learning (not federated), state+summary memory (no vector store in MVP). — Rationale: 24h / 1–2 devs; protect the demo and the anti-hallucination story.
- 2026-06-27 — Unlocked stack from Next.js to Vite + React + TypeScript with plain CSS and no separate backend service. — Rationale: human approval; current repo is already Vite and the hackathon path favors fastest local iteration.
- 2026-06-27 — Added Tailwind CSS to the locked Vite + React + TypeScript frontend stack. — Rationale: human instruction; utility CSS speeds P0 UI implementation.
- 2026-06-27 — Changed search grounding from a separate hosted web-search vendor key to OpenAI web search via the Responses API. — Rationale: human instruction; one OpenAI API key simplifies the hackathon setup.
