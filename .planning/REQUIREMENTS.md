# Requirements: SoPilot

**Defined:** 2026-06-27
**Core Value:** End-to-end grounded SoP transformation without crash.

## v1 Requirements

### Intake Agent

- [ ] **REQ-101**: Applicant can provide messy Vietnamese/English/Vinglish text and receive a structured `Profile` with at least three populated fields and at least one gap.
- [ ] **REQ-102**: Intake asks target country, program, and level before leaving ST_INTAKE.
- [ ] **REQ-103**: Intake calls `search_criteria`; every displayed criterion has a source URL or the app abstains.
- [ ] **REQ-104**: Intake finishes with structured profile, gap summary, and non-empty shortlist summary.
- [ ] **REQ-105**: Applicant-facing output never dumps raw ReAct/tool traces.

### Shortlist and Fit

- [ ] **REQ-201**: `score_fit` deterministically computes `ScoreFitResult` from Profile and Criterion data with qualitative `FitBand`, checks, and gaps.
- [ ] **REQ-202**: Every displayed factual requirement has a visible clickable source link.

### Draft Workspace

- [ ] **REQ-301**: Applicant can paste an SoP draft or request an AI-scaffolded draft.
- [ ] **REQ-302**: AI-scaffolded draft uses only facts in Profile and remains deliberately plain.

### Interrogation

- [ ] **REQ-401**: Interrogation produces 3 to 6 turns, each tied to an actual draft sentence with one pointed question.
- [ ] **REQ-402**: Applicant answers by text or voice, and at least two turns produce concrete extracted specifics.
- [ ] **REQ-403**: Voice/avatar failure degrades to text-only without blocking the flow.

### Rewrite and Verification

- [ ] **REQ-501**: Rewrite uses extracted specifics and tool facts, produces at least two grounded `ChangeItem`s, and invents no facts.
- [ ] **REQ-502**: Before/after screen renders original, rewrite, highlighted changes, reasons, and framing score movement.
- [ ] **REQ-654**: CoVe-lite verification drops or flags ungrounded claims before display.

### Cross-Cutting

- [ ] **REQ-651**: Factual criteria/deadlines originate only from `search_criteria` sources.
- [ ] **REQ-652**: Fit judgments originate only from `score_fit`, never the LLM.
- [ ] **REQ-653**: Every LLM response feeding logic is structured JSON validated by Zod with one repair attempt.
- [ ] **REQ-655**: Agent abstains when it cannot verify a factual criterion.
- [ ] **REQ-701**: Search, LLM, avatar, and TTS failures never crash the UI.
- [ ] **REQ-702**: Backup demo video exists before demo time.
- [ ] **REQ-703**: First LLM/search calls are pre-warmed and per-turn latency feels demo-safe.
- [ ] **REQ-704**: No PII in logs; secrets only via env vars.
- [ ] **REQ-706**: State persists in typed `AgentState`; long chats use rolling summarization; no vector memory.

## v2 Requirements

### Feedback and Guidelines

- **REQ-601**: `log_feedback` records anonymized feedback with no raw PII.
- **REQ-602**: Mentor-approved `Guideline` can be injected into prompts at runtime.
- **REQ-603**: Model cannot promote or rewrite guidelines without mentor approval.

### Product Polish

- **REQ-705**: VN/EN bilingual polish beyond demo-critical copy.
- **P1-PROFILE**: Profile edit screen.
- **P1-EXPORT**: Export SoP via PDF, Word, or copy.
- **P1-LANDING**: One-section landing page for pitch.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Auth/accounts as must-have | Demo path can run in-session |
| B2B/center dashboard | Pitch-slide only in MVP |
| Vector DB/RAG/cross-session memory | Too costly and explicitly locked out |
| Federated learning/fine-tuning/self-rewrite | Violates locked human-in-the-loop scope |
| Real-time talking-head critical path | High demo risk; use degradable avatar/TTS |
| Success probability percentage | Product must show qualitative fit only |
| Extra state-management/ORM/backend stack | Locked MVP stack is intentionally small |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-653 | Phase 2 | In Progress |
| REQ-103 | Phase 2 | In Progress |
| REQ-201 | Phase 2 | Pending |
| REQ-652 | Phase 2 | Pending |
| REQ-706 | Phase 3 | Pending |
| REQ-101 | Phase 3 | Pending |
| REQ-102 | Phase 3 | Pending |
| REQ-104 | Phase 3 | Pending |
| REQ-105 | Phase 3 | Pending |
| REQ-651 | Phase 3 | Pending |
| REQ-655 | Phase 3 | Pending |
| REQ-202 | Phase 4 | Pending |
| REQ-301 | Phase 5 | Pending |
| REQ-302 | Phase 5 | Pending |
| REQ-401 | Phase 6 | Pending |
| REQ-402 | Phase 6 | Pending |
| REQ-403 | Phase 6 | Pending |
| REQ-501 | Phase 7 | Pending |
| REQ-502 | Phase 7 | Pending |
| REQ-654 | Phase 7 | Pending |
| REQ-701 | Phase 8 | Pending |
| REQ-703 | Phase 8 | Pending |
| REQ-702 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 24 total
- Mapped to phases: 24
- Unmapped: 0

---
*Requirements defined: 2026-06-27*
*Last updated: 2026-06-27 after GSD ingest*
