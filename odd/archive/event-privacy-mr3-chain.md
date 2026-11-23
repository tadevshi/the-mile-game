# MR3 Review Chain — Archived

Issue: https://github.com/tadevshi/the-mile-game/issues/108
Status: historical review-plan manifest archived at the user's direction; this file has no task completion status and is not a completion certificate.
Final integrated target: `main` at `97e22bf72a55e86c1127244c884df737ba1df386`.
Original task path: `odd/tasks/event-privacy-mr3-chain.md`.

## Closure

- Moved from `odd/tasks/` to `odd/archive/` at the user's request, limited to files that were in the task directory.
- Retain the child-slice plan below as historical context; completion and verification status remain in the archived task record, including its preserved blockers.
- The earlier instruction to keep issue #108 open is historical; the user later directed its closure after manual validation.

## Original chain manifest

This draft tracks the ordered review slices for MR3. Keep the tracker draft/no-merge until every child slice has been reviewed and integrated in order.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Target default branch: `main`.
- Tracker branch: `feat/event-privacy-mr3-tracker`.
- Scope: default-public visibility persistence and current scoped HTTP authorization only.
- Explicitly deferred: legacy API/admin enforcement, WebSocket protections, media/cache protections, private-visibility activation or UI.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 8 | `feat/event-privacy-mr3-01-persistence` | Migration 015, default-public model/repository persistence and migration/repository tests (T1, S1-S2) | 242 / 400 | Tracker branch |
| 2 of 8 | `feat/event-privacy-mr3-02-visibility-policy` | Scoped visibility middleware and policy tests (T2, S3, S6) | 246 / 400 | Child 1 |
| 3 of 8 | `feat/event-privacy-mr3-03-scoped-routes` | Current scoped route wiring and route policy tests, including token-only Secret Box upload separation (T2, S3, S5-S6) | 190 / 400 | Child 2 |
| 4 of 8 | `feat/event-privacy-mr3-04-record-isolation` | Event association checks for scoped player/answer reads and isolation tests (T2-T3, S3) | 225 / 400 | Child 3 |
| 5 of 8 | `feat/event-privacy-mr3-05-docs-dto` | Safe DTO assertion and API/migration documentation (T3, S2-S5) | 72 / 400 | Child 4 |
| 6 of 8 | `feat/event-privacy-mr3-06-page-view` | Scoped page-view authorization and route policy tests (T2-T3, S3, S5) | 93 / 400 | Child 5 |
| 7 of 8 | `feat/event-privacy-mr3-07-docker-build` | Build the complete API package in Docker (T2, S3) | 11 / 400 | Child 6 |
| 8 of 8 | `feat/event-privacy-mr3-08-verification-record` | Final task/verification record only (T3, S4-S6) | 25 / 400 | Child 7 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. Do not merge the tracker until the full chain is integrated and required checks have been reviewed. No child adds an admin write path for private visibility.
