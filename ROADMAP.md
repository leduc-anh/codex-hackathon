## Status

Current sprint: S2 · P0 done: 15%

## S1 0-2h: Vite Scaffold + Contracts Wiring

Completes: T-001, T-002, T-003

Exit criterion: The locked Vite React TypeScript Tailwind app shape exists, the single-page Stepper shell can hold ST_INTAKE through ST_RESULT, and all shared shapes import from contracts.ts instead of local redefinitions.

## S2 2-4h: LLM Client + Tool Interfaces

Completes: T-004, T-005, T-006, T-007, T-008

Exit criterion: Structured LLM calls validate through Zod with one repair attempt; the three allowed tools exist with contract-compatible I/O; criteria are sourced; score_fit is deterministic TypeScript; feedback logging is anonymized.

## S3 4-7h: ReAct Intake Agent

Completes: T-009, T-010, T-011, T-012, T-024

Exit criterion: A messy bilingual Minh profile produces a validated Profile with target country, level, at least one gap, sourced criteria, a non-empty shortlistSummary, abstention behavior, and no raw tool traces.

## S4 7-10h: Intake + Shortlist Screens

Completes: T-013, T-014, T-023

Exit criterion: SCR-01 and SCR-02 render the intake summary and fit output with FitBand, met counts, checks, gaps, visible source links, and no percentage anywhere.

## S5 10-13h: Draft Workspace

Completes: T-015, T-016

Exit criterion: SCR-03 creates a valid Draft from pasted text or a plain AI scaffold that uses only facts from Profile.

## S6 13-17h: Interrogation

Completes: T-017, T-018, T-019

Exit criterion: SCR-04 runs a lightweight avatar/text interrogation with 3 to 6 sentence-tied questions and captures at least two extracted specifics, while degrading to text-only if voice or avatar fails.

## S7 17-20h: Rewrite + Verification

Completes: T-020, T-021, T-022

Exit criterion: SCR-05 renders before/after output with at least two grounded, explained ChangeItems, a framing score delta, and CoVe-lite removal or flagging of ungrounded claims.

## S8 20-22h: Degrade + Demo Hardening

Completes: T-025, T-026

Exit criterion: Search, generation, avatar, and TTS failures do not crash the Stepper; first LLM and search calls are pre-warmed and the demo path feels responsive enough for presentation.

## S9 22-24h: Backup Demo Video

Completes: T-027

Exit criterion: End-to-end P0 flow is rehearsed and a pre-recorded backup demo video exists, including record backup demo video (REQ-702).
