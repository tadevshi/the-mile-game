# MR4 Review Chain — Archived

Issue: https://github.com/tadevshi/the-mile-game/issues/108
Status: historical review-plan manifest archived at the user's direction; this file has no task completion status and is not a completion certificate.
Final integrated target: `main` at `97e22bf72a55e86c1127244c884df737ba1df386`.
Original task path: `odd/tasks/event-privacy-mr4-chain.md`.

## Closure

- Moved from `odd/tasks/` to `odd/archive/` at the user's request, limited to files that were in the task directory.
- Retain the child-slice plan below as historical context; completion and verification status remain in the corresponding task records.
- The earlier instruction to keep issue #108 open is historical; the user later directed its closure after manual validation.

## Original chain manifest

Review chain for MR4, the legacy API and legacy administration enforcement unit of the approved eight-MR privacy sequence. It continues the MR3 chain, so it is based on the last MR3 slice (`feat/event-privacy-mr3-06-docs-record`, PR #119) and merges after the MR3 chain.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Base branch: `feat/event-privacy-mr3-06-docs-record` (the tip of the MR3 chain).
- Continuation tracker branch: `feat/event-privacy-mr4-tracker`.
- Scope: enforce the persisted event visibility on the legacy HTTP routes and bound the legacy administration surface.
- Explicitly deferred: WebSocket admission and recipient isolation, media/cache protection, and private-visibility activation or UI.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 9 | `feat/event-privacy-mr4-01-legacy-visibility` | Legacy visibility guard and its enforcement on the legacy read, write and list routes (T1) | 432 / 400 | Tracker branch |
| 2 of 9 | `feat/event-privacy-mr4-02-visibility-fixture` | Legacy visibility test fixture (T1) | 375 / 400 | Child 1 |
| 3 of 9 | `feat/event-privacy-mr4-03-legacy-read-tests` | Legacy read policy tests (T1) | 258 / 400 | Child 2 |
| 4 of 9 | `feat/event-privacy-mr4-04-legacy-write-tests` | Legacy write denial and optional-auth tests (T1) | 280 / 400 | Child 3 |
| 5 of 9 | `feat/event-privacy-mr4-05-legacy-admin` | Legacy administration scope and its wiring (T2) | 248 / 400 | Child 4 |
| 6 of 9 | `feat/event-privacy-mr4-06-admin-fixture` | Legacy administration test fixture (T2) | 256 / 400 | Child 5 |
| 7 of 9 | `feat/event-privacy-mr4-07-admin-scoping-tests` | Legacy administration scoping tests (T2) | 305 / 400 | Child 6 |
| 8 of 9 | `feat/event-privacy-mr4-08-preservation-docs` | Scoped administration preservation tests and the API documentation (T3) | 252 / 400 | Child 7 |
| 9 of 9 | `feat/event-privacy-mr4-09-review-fixes` | Review fixes: legacy postcards keep their event, private players stay out of the legacy ranking broadcast, fail-closed player lookups (T3) | 130 / 400 | Child 8 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. Child 1 is 32 lines above the review budget because the guard and its enforcement are one behavior. No child adds a route or UI that can write the event visibility: events stay public by default and the persisted value is enforced read-side only. Merge the MR3 chain first, then this chain.
