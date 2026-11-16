# MR3 Scoped-HTTP Completion Chain

Continuation of the MR3 review chain. Tracker PR #112 merged with only the persistence slice; the scoped HTTP enforcement was never published and is delivered here as focused review slices.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Target default branch: `main` (`dc8c4a08`).
- Continuation tracker branch: `feat/event-privacy-mr3-scoped-tracker`.
- Scope: current event-scoped HTTP authorization for the persisted visibility value. The persistence slice already merged in PR #113.
- Explicitly deferred: legacy API/admin enforcement (next unit), WebSocket protections, media/cache protections, private-visibility activation or UI.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 5 | `feat/event-privacy-mr3-02-visibility-policy` | Scoped visibility middleware and policy tests (401 anonymous, 403 authenticated non-member, owner/collaborator/accepted guest allowed) | 246 / 400 | Continuation tracker |
| 2 of 5 | `feat/event-privacy-mr3-03-scoped-routes` | Scoped route wiring and route policy tests, keeping the token-only Secret Box upload outside the content gate | 190 / 400 | Child 1 |
| 3 of 5 | `feat/event-privacy-mr3-04-record-isolation` | Event association checks for scoped player/answer reads and isolation tests | 225 / 400 | Child 2 |
| 4 of 5 | `feat/event-privacy-mr3-05-page-view` | Scoped page-view authorization plus the Docker build target that compiles the whole API package | 84 / 400 | Child 3 |
| 5 of 5 | `feat/event-privacy-mr3-06-docs-record` | Safe DTO assertion, API/migration documentation and the MR3 verification record | 90 / 400 | Child 4 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. No child adds an admin write path for private visibility: events stay public by default, and the persisted value is enforced read-side only. Do not merge the continuation tracker until the full chain is integrated.
