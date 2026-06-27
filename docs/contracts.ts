// contracts.ts — SINGLE SOURCE OF TRUTH for SoPilot data shapes, tool signatures, and agent state.
// This file is the machine-enforced half of AGENTS.md. The coding agent MUST import from here
// and MUST NOT redefine these shapes inline. All LLM output that feeds logic MUST be parsed
// through these Zod schemas (parse on success path, safeParse + repair on the failure path).
//
//   import { z } from "zod";
//
// Rule of thumb: if data crosses a module boundary or comes back from a model, it passes a schema here.

import { z } from "zod";

/* ────────────────────────────────────────────────────────────────────────
 * CORE DOMAIN
 * ──────────────────────────────────────────────────────────────────────── */

/** One activity. MUST capture individual contribution + impact, else it is a gap. */
export const zActivity = z.object({
  title: z.string(),
  role: z.string().nullable(),            // null => gap_flag
  contribution: z.string().nullable(),    // what THIS student personally did; null => gap_flag
  impact: z.string().nullable(),          // measurable/observable result; null => gap_flag
});
export type Activity = z.infer<typeof zActivity>;

export const zProfile = z.object({
  targetCountry: z.string(),
  targetProgram: z.string().nullable(),
  level: z.enum(["highschool", "undergraduate", "graduate", "phd", "other"]),
  education: z.string().nullable(),
  activities: z.array(zActivity),
  awards: z.array(z.string()),
  workExperience: z.array(z.string()),
  motivations: z.string().nullable(),
  /** Human-readable gaps the intake surfaced. Drives the agent's follow-up questions. */
  gapFlags: z.array(z.string()),
});
export type Profile = z.infer<typeof zProfile>;

export const zDraft = z.object({
  id: z.string(),
  body: z.string().min(1),
  version: z.number().int().nonnegative(),
  source: z.enum(["pasted", "ai_scaffolded"]),
});
export type Draft = z.infer<typeof zDraft>;

/* ────────────────────────────────────────────────────────────────────────
 * INTERROGATION (the core differentiator)
 * ──────────────────────────────────────────────────────────────────────── */

/** Why the interrogator targeted a claim — the Cultural Framing tags. */
export const zFramingTag = z.enum([
  "generic",            // could be on anyone's essay
  "over_humble",        // collective "we", under-claims individual agency
  "listed_no_reflection", // award/achievement listed without narrative/insight
  "translated_formality", // stiff/translated English
  "vague_passion",      // claims passion without a concrete moment
  "unsupported_claim",  // asserts something with no evidence
]);
export type FramingTag = z.infer<typeof zFramingTag>;

export const zInterrogationTurn = z.object({
  index: z.number().int().nonnegative(),
  targetSentence: z.string(),        // the exact draft sentence under attack
  framingTag: zFramingTag,
  question: z.string(),              // one pointed, escalating question
  answer: z.string().nullable(),     // student's reply (text or transcribed voice); null until answered
  extractedSpecific: z.string().nullable(), // the concrete detail mined from the answer
});
export type InterrogationTurn = z.infer<typeof zInterrogationTurn>;

export const zInterrogationSession = z.object({
  id: z.string(),
  draftId: z.string(),
  turns: z.array(zInterrogationTurn).min(1),
});
export type InterrogationSession = z.infer<typeof zInterrogationSession>;

/* ────────────────────────────────────────────────────────────────────────
 * REWRITE + BEFORE/AFTER
 * ──────────────────────────────────────────────────────────────────────── */

export const zChangeItem = z.object({
  before: z.string(),
  after: z.string(),
  framingReason: z.string(),  // WHY this is stronger (agency/specificity/reflection/voice)
  groundedIn: z.enum(["student_answer", "tool_source"]), // anti-hallucination: must be one of these
});
export type ChangeItem = z.infer<typeof zChangeItem>;

export const zRewriteResult = z.object({
  rewrittenText: z.string(),
  changes: z.array(zChangeItem).min(2), // DoD requires >= 2 grounded, explained changes
  framingScoreBefore: z.number().min(0).max(100),
  framingScoreAfter: z.number().min(0).max(100),
});
export type RewriteResult = z.infer<typeof zRewriteResult>;

/* ────────────────────────────────────────────────────────────────────────
 * TOOL 1 — search_criteria  (grounding; ONLY origin of factual criteria)
 * ──────────────────────────────────────────────────────────────────────── */

export const zSource = z.object({
  url: z.string().url(),
  title: z.string(),
  snippet: z.string(),
});
export type Source = z.infer<typeof zSource>;

export const zCriterion = z.object({
  name: z.string(),                // e.g. "IELTS", "GPA", "Leadership activity"
  requirement: z.string(),         // e.g. ">= 6.5", ">= 3.2/4.0"
  sourceUrl: z.string().url(),     // MUST trace to a source; no source => do not include
});
export type Criterion = z.infer<typeof zCriterion>;

export const zSearchCriteriaInput = z.object({
  school: z.string().nullable(),
  program: z.string().nullable(),
  scholarship: z.string().nullable(),
  level: zProfile.shape.level,
  country: z.string(),
});
export type SearchCriteriaInput = z.infer<typeof zSearchCriteriaInput>;

export const zSearchCriteriaResult = z.object({
  found: z.boolean(),              // false => agent MUST abstain, not invent
  criteria: z.array(zCriterion),
  sources: z.array(zSource),
});
export type SearchCriteriaResult = z.infer<typeof zSearchCriteriaResult>;

export type SearchCriteriaTool = (input: SearchCriteriaInput) => Promise<SearchCriteriaResult>;

/* ────────────────────────────────────────────────────────────────────────
 * TOOL 2 — score_fit  (COMPUTED IN CODE FROM A RUBRIC — never an LLM number)
 * ──────────────────────────────────────────────────────────────────────── */

export const zFitBand = z.enum(["reach", "competitive", "strong_match", "insufficient_data"]);
export type FitBand = z.infer<typeof zFitBand>;

export const zCriterionCheck = z.object({
  criterion: z.string(),
  met: z.boolean(),
  detail: z.string(),  // e.g. "IELTS 6.0 vs required 6.5 — short by 0.5"
});
export type CriterionCheck = z.infer<typeof zCriterionCheck>;

export const zScoreFitInput = z.object({
  profile: zProfile,
  criteria: z.array(zCriterion),
});
export type ScoreFitInput = z.infer<typeof zScoreFitInput>;

export const zScoreFitResult = z.object({
  band: zFitBand,                       // qualitative — NO fabricated success percentage
  criteriaMet: z.number().int(),
  criteriaTotal: z.number().int(),
  checks: z.array(zCriterionCheck),
  gaps: z.array(z.string()),            // concrete, actionable
});
export type ScoreFitResult = z.infer<typeof zScoreFitResult>;

// NOTE: implement as deterministic TypeScript. The LLM may EXPLAIN this result but MUST NOT produce it.
export type ScoreFitTool = (input: ScoreFitInput) => ScoreFitResult;

/* ────────────────────────────────────────────────────────────────────────
 * TOOL 3 — log_feedback  (human-in-the-loop guideline learning; NOT federated, NOT self-rewriting)
 * ──────────────────────────────────────────────────────────────────────── */

export const zGuideline = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  text: z.string(),                       // a coaching rule injected as dynamic few-shot
  scope: z.string(),                       // when it applies (e.g. "graduate STEM SoP")
  approvedByMentor: z.boolean(),           // MUST be true before runtime injection
});
export type Guideline = z.infer<typeof zGuideline>;

export const zFeedbackLogInput = z.object({
  context: z.string(),          // anonymized — NO raw PII
  originalOutput: z.string(),
  mentorFix: z.string().nullable(),
  proposedGuideline: zGuideline.nullable(),
});
export type FeedbackLogInput = z.infer<typeof zFeedbackLogInput>;

export const zFeedbackLogResult = z.object({
  stored: z.boolean(),
  guidelineId: z.string().nullable(),  // set only if a mentor-approved guideline was promoted
});
export type FeedbackLogResult = z.infer<typeof zFeedbackLogResult>;

export type LogFeedbackTool = (input: FeedbackLogInput) => Promise<FeedbackLogResult>;

/* ────────────────────────────────────────────────────────────────────────
 * AGENT — ReAct loop, bounded; state is the primary memory
 * ──────────────────────────────────────────────────────────────────────── */

export const TOOL_NAMES = ["search_criteria", "score_fit", "log_feedback"] as const;
export const zToolName = z.enum(TOOL_NAMES);
export type ToolName = z.infer<typeof zToolName>;

/** Working memory = this single typed object (AGENTS.md §5). Re-inject the relevant slice each turn. */
export const zAgentState = z.object({
  profile: zProfile,
  draft: zDraft.nullable(),
  session: zInterrogationSession.nullable(),
  /** Mentor-approved guidelines retrieved for the current scope (dynamic few-shot). */
  activeGuidelines: z.array(zGuideline),
  /** Rolling summary of older conversation turns; structured state above stays canonical. */
  rollingSummary: z.string(),
});
export type AgentState = z.infer<typeof zAgentState>;

/** One ReAct step the model emits. Validate every step through this before acting. */
export const zReActStep = z.object({
  thought: z.string(),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("call_tool"), tool: zToolName, args: z.unknown() }),
    z.object({ type: z.literal("ask_user"), question: z.string() }),
    z.object({ type: z.literal("finish"), shortlistSummary: z.string() }),
  ]),
});
export type ReActStep = z.infer<typeof zReActStep>;

export const MAX_AGENT_STEPS = 6; // AGENTS.md §3 — bound latency/cost.

/* ────────────────────────────────────────────────────────────────────────
 * LLM CALL CONTRACT — every structured call validates here
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Parse LLM JSON output against a schema. On failure, the caller re-prompts ONCE
 * with the validation error, then degrades gracefully. Never JSON.parse raw into logic.
 */
export function validateLlmOutput<T>(schema: z.ZodType<T>, raw: unknown):
  { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(raw);
  return r.success ? { ok: true, data: r.data } : { ok: false, error: r.error.message };
}

/** Verification pass (CoVe-lite): every claim must be grounded or it is dropped/flagged. */
export const zVerifiedClaim = z.object({
  claim: z.string(),
  grounded: z.boolean(),
  groundedIn: z.enum(["tool_source", "student_answer", "none"]),
});
export type VerifiedClaim = z.infer<typeof zVerifiedClaim>;
