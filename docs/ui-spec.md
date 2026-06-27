# SoPilot — UI Spec (giao diện)

Visual reference for the build. Pairs with `design-tokens.json` (the look) and `page-content.json` (the words). Implement in **Tailwind + React**. The live reference is `SoPilot App.dc.html` (interactive) and `SoPilot Branding.dc.html` (all screens on one board).

> Token names below (e.g. `clay`, `ink`, `display-xl`, `space-6`) refer to entries in `design-tokens.json`. String IDs (e.g. `scr01_intake.title`) refer to `page-content.json`.

---

## 0. Information architecture

**One page, a state machine — not a multi-page site.** Five states in fixed order:

`Intake → Shortlist & Fit → Draft → Interrogation → Before/After`

- No top nav, no routing. The whole experience is one continuous flow.
- A persistent **stepper** shows progress; a single **back** affordance steps one state back.
- The signature path is **Interrogation → Before/After**. Everything else is intentionally quiet so this lands.

State held in one store: `{ screen: 0..4, intakeInput, messages, draftText, turn, answerInput, ttsOn, generating, revealed }`.

---

## 1. Global chrome

### Header (sticky, `z-30`, `paper` @ 88% + backdrop-blur, bottom border `line`)
Three zones in a `max-w-[1180px]` centered row, `px-8 py-4`:
1. **Logo** (left): a `clay` rounded-md square, 30px, white `S` in `display` 800, rotated `-6deg`; wordmark "SoPilot" in `display` 700, 20px.
2. **Stepper** (center, `flex-1`, max 720px): see §2.
3. **Lang toggle** (right): pill on `indigo-tint`, two segments `VI` / `EN` in `label-mono`; active segment = `indigo` bg, `paper` text. (Visual for the demo; VI is primary.)

### Back row
Below header, same max width, `pt-[18px]`. Shows only when `screen > 0`. `indigo` text button: `← Quay lại · Back` (content `global.back`). Left `←` glyph, EN in `faint`.

### Main
`max-w-[1180px]` centered, `px-8 pb-20 pt-5`. One screen renders at a time (fade-up on enter, §7).

---

## 2. Stepper (the signature element: *hành trang* / packing the journey)

A horizontal journey, 5 stops, in the header center zone.

- Track: a 2px `line` rail behind the nodes; an overlaid `clay` fill whose width = `screen / 4 * 88%`, animated `0.5s`.
- Each stop is a button (clickable to jump): a 38px rounded-`md` node + VI label (`display` 600, 12.5px) + EN sub-label (`label-mono` 9px, `faint`). **Both labels `white-space:nowrap`** (do not let them wrap — they overlap otherwise).
- Node states:
  - **upcoming**: `paper` bg, `faint` text, `line` border.
  - **current**: `clay` bg, `paper` text, `clay` border; VI label `ink`.
  - **done**: `ink` bg, `paper` text (glyph `✓`), `clay` border; VI label `muted`.
- Labels from `global.stepper`.

---

## 3. SCR-01 Intake (`scr01_intake`)

**Beat:** "this thing already gets me." Two-column grid `1fr 380px`, `gap-6`, items-start.

### Left — chat thread (card: `surface`, `line` border, `rounded-xl`, fixed height ~560px, `flex-col`, overflow hidden)
- Scroll area `flex-1 overflow-y-auto p-6`, messages `gap-4`.
- **Agent bubble**: `indigo-tint`-ish (`#EFEAF2`), `rounded-[14px_14px_14px_4px]`, `p-[15px_18px]`; optional eyebrow label (`label-mono` 10px, `muted`); text `body-sm`+ in `ink`. May carry **source chips** (see §8).
- **User bubble**: `ink` bg, `paper` text, `rounded-[14px_14px_4px_14px]`, right-aligned, max-width 82%.
- **Typing indicator**: 3 `muted` dots, `dots` animation staggered (§7).
- Each message animates in with `tokenStream`.
- **Input dock** (bottom, `line` top border, `paper` bg): a `surface` rounded-lg field with a textarea (`scr01_intake.inputPlaceholder`) + a 40px `ink` send button (`↑`).

### Right — Profile summary card (`ink` bg, `paper` text, `rounded-xl`, `p-6`, sticky `top-24`)
- Header row: eyebrow `scr01_intake.profileCard.heading` in `clay`; count (e.g. "5 mục") in `faint`, `label-mono`.
- Name (`display` 700, 22px) + sub (`body-sm`, `#C9C3D4`).
- Divider (`#4A4063`).
- **Facts list** (`gap-[13px]`): each row = an 18px rounded square icon + text. The text column **must be `min-w-0 flex-1`** so long strings wrap instead of overlapping the gap flag.
  - `captured`: icon `✓` on `sage`.
  - `gap`: icon `⚑` on `#3A3052` in `amber`; below the text, an amber gap line `⚑ {gap}` (`label-mono` 10.5px).
- Primary CTA (full width, `clay`): `scr01_intake.profileCard.cta` → advances to Shortlist.

States: empty (invitation `states.empty.intake`), streaming reply (typing dots), agent follow-up, summary-ready (card filled + CTA active).

---

## 4. SCR-02 Shortlist & Fit (`scr02_shortlist`)

**Beat:** "honest, and I know what to fix." Title + subtitle, then a `flex-col gap-[18px]` of **target cards** (`surface`, `line`, `rounded-xl`, `p-[24px_26px]`).

Each card:
- Header row: name (`display` 700, 21px) + sub (`body-sm`, `muted`) on the left; a **fit band pill** on the right (see §8). **Band is qualitative — never a %.**
- Criteria grid `2 cols, gap-[14px_28px]`: each = an 18px rounded mark + text.
  - met: `✓` on `sage` tint, text `ink`.
  - unmet: `○` on `amber` tint, text `muted`.
- **Gap callout**: `gapCallout` tokens — amber-tinted, left-border, `rounded-[0_8px_8px_0]`, `p-[12px_16px]`. Eyebrow `scr02_shortlist.gapLabel`, then the gap sentence.
- **Source chips** row (§8), prefixed `nguồn ·`.

Footer CTA (`clay`): `scr02_shortlist.cta` → Draft.

States: loading (skeleton cards / streaming), insufficient-data band (`states.insufficientData`), results.

---

## 5. SCR-03 Draft Workspace (`scr03_draft`)

**Beat:** low-pressure start. Header row: title + subtitle on the left; a small `indigo-tint` "Writing for" chip on the right (`scr03_draft.writingForLabel` + `writingForValue`).

Editor card (`surface`, `line`, `rounded-xl`, overflow hidden):
- Toolbar (`paper`, `line` bottom): label `scr03_draft.editorLabel` (`label-mono`); a `indigo`-on-`indigo-tint` button `✦ {draftItButton}`.
- Big textarea (~380px), `body` 16px, placeholder `scr03_draft.editorPlaceholder`.
- Footer (`line` top): live word count (`{n} {wordCountLabel}`, `label-mono`) + primary CTA `scr03_draft.cta` → Interrogation.

Behavior:
- **Paste path**: user types/pastes; word count updates.
- **"Draft it for me"**: streams `scr03_draft.sampleDraft` token-by-token into the textarea (scaffolding state).

States: empty, scaffolding (streaming), draft-ready.

---

## 6. SCR-04 Interrogation — **signature** (`scr04_interrogation`)

**Beat:** productive tension → "I have a real story." Two-column grid `300px 1fr`, `gap-8`, items-start.

### Left — Avatar (sticky `top-24`, centered)
A **light illustrated mentor**, "Cô Linh" (built from CSS shapes, no heavy illustration):
- 132px circle, `#EFE6FA` bg, `#D6C9EC` border, overflow hidden. Inside: hair (dark rounded block), face (`#EAD3BE`), **glasses** (two `ink` rounded rectangles + bridge — signals "mentor/teacher"), two blinking eyes (`blink` anim), a mouth (`clay`) that animates `avatarMouth` while speaking.
- **Speaking rings**: 2 concentric `indigo` rings pulsing outward (`avatarSpeakRing`), shown only while speaking.
- Name `Cô Linh` (`display` 700) + role.
- **Status pill**: speaking = `avatarSpeaking` tokens + pulsing dot ("Đang nói · Speaking"); awaiting = `avatarAwaiting` tokens ("Đang chờ bạn · Awaiting you").
- **TTS toggle button** (`ttsToggle`): toggles the degraded text-only mode. When off, show `degradedNote` below. *Speaking* = `ttsOn && not done`.

### Right — Spotlight + question + answer
- Row: turn label `{turnLabel} {n} / {total}` (`label-mono`) + **progress pips** (one bar per turn: done = `clay`, current = `indigo`, upcoming = `line`).
- **The draft, with the current sentence pulled out**: the full draft renders in a `surface` card at `faint` color (dimmed); the sentence under examination is highlighted (`clay-tint` bg + 4px tint halo, `ink` bold). This is the "pull-out spotlight." Sentences = `turns[].targetSentence`.
- **The question** (`ink` card, `paper` text, little caret on top): eyebrow `turns[].promptLabel` in `clay`; the question VI (`display` 600, 23px); the EN below in `#C9C3D4`. Animates in `fadeUp` each turn.
- **Answer input**: `surface` field + textarea (`answerPlaceholder`). Below: reassurance line (`reassurance`, VI then muted EN) on the left; submit button on the right (`submitButton`, last turn = `finishButton`).

Turn flow: 4 turns (3–6 supported). On submit, advance `turn`. After the last, show the **complete** state (`scr04_interrogation.complete`): centered eyebrow/title/body + CTA → Before/After.

States: avatar speaking, awaiting answer, **degraded = TTS off → text-only** (must look intentional, not broken), turn complete.

---

## 7. SCR-05 Before/After — the reveal (`scr05_reveal`)

**Beat:** pride + "the AI didn't fake this." This is the one moment worth animating.

### Generating state
Centered: 3 pulsing `clay` dots + title/body (`scr05_reveal.generating`). Hold ~2s, then reveal.

### Revealed state
1. **Banner** (`ink` card): eyebrow `banner.eyebrow` (`clay`); title `banner.title` (`display` 700, 28px); body `banner.body`. On the right, a **framing movement** chip (`#3A3052`): `framing.from` (Liệt kê / list-y, in `faint`) → `clay` arrow → `framing.to` (Phản chiếu / reflective, in a soft green). This is the "framing-score movement" — qualitative, not a number.
2. **Side-by-side** grid `1fr 1fr`, `gap-5`:
   - **Before** (`surface`, `line`): label `beforeLabel` + dot; text in `muted` (the original `beforeText`).
   - **After** (`surface`, `clay` 1.5px border, `reveal` shadow): label `afterLabel` in `clay`; the rewrite. Parse `afterText`: spans in `[brackets]` render with `diffAdded` highlight (these are the student's own answers woven back in); everything else is `ink`.
3. **Why-stronger notes** grid `3 cols`, `gap-[14px]`: each card (`surface`, `clay` left-border) = the quoted added phrase (highlighted) + the `why` reason + a `↑ {from}` attribution in `clay`. Heading `whyHeading`.
4. **Actions**: primary `Xuất bản luận · Export SoP` (`ink`); secondary `Chất vấn thêm · Push further` (`indigo` outline) → back to Interrogation.

The line that every new detail came from the student is the emotional core — keep `banner.title` + the `↑ from` attributions prominent.

States: generating, revealed.

---

## 8. Component inventory (reusable kit — build these once)

| Component | Notes |
|---|---|
| **Button** | primary (`clay`/`paper`), secondary (outline `ink` or `indigo`), text/link (`indigo`). Label says what happens; name persists across the flow. `rounded-md`, weight 600. |
| **Stepper** | §2. The signature element. |
| **Message bubble** | agent vs user variants, §3. |
| **Card** | `surface` + `line` + `rounded-xl`. Dark variant = `ink` (profile, banner, question). |
| **Source chip** | `indigo-tint` bg, `indigo` text, `label-mono` 11px, 5px dot, `rounded-md`. Optional `nguồn ·` prefix. |
| **Fit band pill** | qualitative band, `semantic.fitBand.*` tokens, dot + tracked label, `rounded-pill`. **Never a %.** |
| **Criteria row** | met `✓`/sage, unmet `○`/amber. |
| **Gap callout** | amber left-border block, `semantic.gapCallout`. |
| **Diff / highlight token** | `diffAdded` — `clay-tint` bg + `clay` underline. The atom of the reveal. |
| **Avatar frame** | CSS-shape mentor + speaking rings + status pill, §6. |
| **Progress pips** | per-turn bars, §6. |

---

## 9. Motion (deliberate)
Use `design-tokens.json#motion`. The only orchestrated moment is the **Before/After reveal**. Everything else: token streaming in chat & draft, the avatar speaking indicator, the progress bar, typing dots. **Respect `prefers-reduced-motion`** (disable all animation).

## 10. Quality floor
- Responsive down to mobile (the two-column screens stack; chat and editor go full width; stepper may condense to dots + current label).
- Visible keyboard focus (2px `indigo` ring, offset 2px). Adequate contrast. Base font ≥ 16px. Legible when projected (this is a live demo).
- Hit targets ≥ 44px on touch.

## 11. Copy rules (enforce in code & content)
- Vietnamese primary, English secondary; design to the longer string.
- **No em-dashes (—).** Use `.`/`,`/`·`.
- Fit = qualitative band, never a percentage.
- Errors don't apologize and aren't vague: state what happened + the next move (`page-content.json#states`).
