# DESIGN_BRIEF.md — SoPilot UI/UX (designer prompt)

> **How to use this file:** paste it into an AI design tool (Claude in Design / Figma AI / v0) or hand it to a human designer. It pins the brief and the hard constraints; the *visual* choices are yours within them.
> **Consistency:** screens map 1:1 to `PRD.md` (SCR-01..SCR-05). Constraints follow `AGENTS.md`. Do not design anything on the out-of-scope list (§12).

---

## 1. The assignment (read once, keep in mind throughout)
Design the interface for **SoPilot** — a web app that helps a Vietnamese student turn a messy profile into an authentic, Western-framed Statement of Purpose (SoP). The interface has exactly one job: **make a nervous student feel safe being challenged by an AI interviewer, and make the transformation of their essay visible and earned.** This is built for a *live hackathon demo*, so the design must read clearly on a projector/screen-share and never have dead, confusing moments.

## 2. Ground every choice in the subject (do not skip)
- **Who:** "Minh," 18, smart, real achievements, shaky confidence in English framing. Mobile-and-laptop native. Reads Vietnamese first, English second.
- **The world to draw from:** the study-abroad journey, preparation/"packing" (*hành trang*), the move from list-y/humble Vietnamese framing to specific/reflective Western framing, and the emotional arc: **messy → structured → questioned (tension) → transformed (pride/relief).**
- Let distinctive design come from *this* world — not from generic edtech. Every structural device should encode something true about that journey, not decorate.

## 3. The signature moment (spend your boldness here)
The **Interrogation (SCR-04) → Before/After (SCR-05)** sequence is the heart of the product and the climax of the demo. Design everything else to be quiet and disciplined so this lands. Ideas (optional, pick or beat them):
- Interrogation as a focused, one-question-at-a-time spotlight — the draft sentence under examination is visually "pulled out" and pressure-tested; the rest dims.
- Before/After as a living diff where the student sees *their own words* being elevated (highlight what was added from their answers, not replaced by a machine).
- The Stepper as a journey/progress that pays off at the reveal.

## 4. Personality & tone
**A coach, not an essay mill.** Trustworthy, warm, quietly rigorous. The interrogation must feel like a mentor who believes in you and pushes hard — *challenging, never hostile or discouraging*; always resolve toward encouragement. Avoid: corporate-edtech blandness, childish/playful toy feel, and anything that feels like a cheating tool.

## 5. Creative direction & anti-defaults (important)
- Pin a deliberate palette (4–6 named hex), a deliberate type pairing (a characterful display used with restraint + a clean body face + a utility face for labels/data), a clear type scale, and ONE signature element the product is remembered by. State your choices.
- **Do not reach for the current AI-design defaults** unless you can justify them for *this* brief: (1) cream background + high-contrast serif + terracotta accent; (2) near-black + single acid-green/vermilion accent; (3) broadsheet hairline-rule newspaper layout. If an axis is free, don't spend it on these.
- Match complexity to vision; if minimal, win on spacing/type precision. Remove one accessory before shipping.

## 6. ⚠ Vietnamese typography (HARD requirement)
Every typeface used for display AND body MUST render Vietnamese diacritics correctly and beautifully — stacked marks like ế, ộ, ữ, ằ, ị. Test real Vietnamese strings before committing (e.g. *"Hành trang du học của bạn"*, *"Tôi đã thiết kế mạch cảm biến"*). Reject any font that breaks, clips, or awkwardly spaces diacritics. Line-height must give marks room. This is a frequent, demo-killing mistake — verify it explicitly.

## 7. Information architecture
**Single-page Stepper (a state machine), not a multi-page site.** Five states in order, with a visible progress indicator and a one-step "back":
`Intake → Shortlist & Fit → Draft → Interrogation → Before/After`
No top nav, no routing between sections. The whole experience is one continuous flow.

## 8. Screens to design — P0 (purpose · key elements · emotional beat · states)
**SCR-01 Intake Chat** — *purpose:* collect a messy, bilingual profile conversationally. *Elements:* chat thread (agent + user), input that accepts long paste, a building "profile summary card" with gap flags, source chips when criteria are fetched. *Beat:* "this thing already gets me." *States:* empty/first-prompt, streaming reply, agent asking a follow-up, summary ready.

**SCR-02 Shortlist & Fit** — *purpose:* show fit per school/scholarship. *Elements:* per-target card with a **qualitative band** (e.g. reach / competitive / strong match — **never a %**), met/unmet criteria checklist, concrete gaps, clickable source links. *Beat:* "honest, and I know what to fix." *States:* loading, insufficient-data band, results.

**SCR-03 Draft Workspace** — *purpose:* get a first SoP in. *Elements:* large editor (paste) + a clear "draft it for me" option, target shown. *Beat:* low-pressure start. *States:* empty, scaffolding (streaming), draft ready.

**SCR-04 Interrogation (signature)** — *purpose:* the avatar challenges the draft, one pointed question at a time; student answers by text (voice = later). *Elements:* a **light animated avatar** with a clear "speaking" state (driven by ElevenLabs TTS), the targeted sentence highlighted, a single-question focus, the answer input, progress through 3–6 turns. *Beat:* productive tension → "I have a real story." *States:* avatar speaking, awaiting answer, **degraded = TTS off → text-only interrogator (must still feel intentional, not broken)**, turn complete.

**SCR-05 Before/After (the reveal / closing slide)** — *purpose:* show the earned transformation. *Elements:* side-by-side original vs rewrite, highlighted changes each with a short "why this is stronger" note, a framing-score movement, and a clear line that *every new detail came from the student*. *Beat:* pride + "the AI didn't fake this." *States:* generating, revealed.

## 9. Screens — P1 (only if time): Profile edit · Export · one-Guideline demo · one-section landing.

## 10. States for EVERY screen (don't leave these to chance)
- **Loading / streaming:** tokens stream in; show a calm, intentional in-progress state, not a spinner-only blank.
- **Degraded (REQ-701):** when voice/search/generation falls back, the UI continues and looks deliberate — failure gives *direction*, not an apology or a dead end.
- **Empty:** an invitation to act, in the interface's voice.
- **Error:** plain language, what happened + the next move. Errors don't apologize and are never vague.

## 11. Motion (deliberate, not decorative)
Token streaming in chat/rewrite; the avatar's speaking indicator; an orchestrated **Before/After reveal** (the single moment worth animating). Keep everything else still. Respect `prefers-reduced-motion`.

## 12. Out of scope — do NOT design
Dashboards, login/account screens, settings, billing, notifications, the B2B/center console, a full marketing site (beyond one optional landing section), multi-application management, admin. (Mirrors `AGENTS.md §6`.)

## 13. Buildability constraints (critical — 1–2 devs, Tailwind, 24h)
- The frontend is **Tailwind CSS**. Express the design as **tokens that map cleanly to Tailwind** (spacing on a 4px scale, a small color set, standard radii, a defined type scale). Avoid values that fight the utility system.
- **No bespoke/custom design system, no heavy custom illustration** that 1–2 devs can't build in a day. Favor a tight set of reusable components (card, chip/source-tag, message bubble, button, highlight/diff token, avatar frame, stepper).
- Quality floor without fanfare: responsive down to mobile, visible keyboard focus, adequate contrast, readable base font size, legible when projected.

## 14. Copy / microcopy (design material, bilingual)
- UI must support **Vietnamese and English**; design with the *longer* of the two strings so layouts don't break.
- Interface voice: plain verbs, sentence case, active voice. A button says exactly what happens ("Start interrogation," not "Submit"); the same name persists through the flow.
- Name things by what the user controls, not how the system works. Be specific over clever.
- Examples to set the tone (refine, don't treat as final): intake placeholder — *"Paste anything about you — grades, clubs, that project you're proud of. Vietnamese or English."*; interrogation prompt label — *"Defend this line."*; before/after banner — *"Every new sentence here is yours."*

## 15. Deliverables (in priority order)
1. Low-fi wireframes of the 5 P0 screens + the Stepper flow.
2. A token sheet: palette (named hex), type pairing + scale, spacing, radii, component states — Tailwind-mappable.
3. Hi-fi of the **signature path**: SCR-04 Interrogation and SCR-05 Before/After (including degraded + reveal states).
4. Hi-fi of SCR-01–03 + all states from §10.
5. (Optional) a clickable prototype of the full flow for the demo.

---
**Before you hand off:** check the brief test — would another designer, given any "AI app" prompt, arrive at your design? If yes, the choices aren't specific to SoPilot yet. Make them specific to *this* student, *this* journey, *this* reveal.