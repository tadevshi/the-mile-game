# MR8a Review Chain — Archived

Issue: https://github.com/tadevshi/the-mile-game/issues/108
Status: historical review-plan manifest archived at the user's direction; this file has no task completion status and is not a completion certificate.
Final integrated target: `main` at `97e22bf72a55e86c1127244c884df737ba1df386`.
Original task path: `odd/tasks/event-privacy-mr8a-chain.md`.

## Closure

- Moved from `odd/tasks/` to `odd/archive/` at the user's request, limited to files that were in the task directory.
- Retain the child-slice plan below as historical context; completion and verification status remain in the corresponding task records.
- The earlier instruction to keep issue #108 open is historical; the user later directed its closure after manual validation.

## Original chain manifest

Review chain for MR8a, the issue #108 Delivery 2 unit T4 first half: the administrative activation of the private event. The MR7 chain is merged, so this chain is based on `main`.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Base branch: `main` (the tip of the merged MR7 chain, `39a6b28`).
- Continuation tracker branch: `feat/event-privacy-mr8a-tracker`.
- Scope: the visibility of an event is persisted and enforced since MR3, and the HTTP, legacy, WebSocket and media surfaces protect it since MR3 to MR7. What did not exist is the administrative write that makes an event private, and the switch of the admin panel. This chain adds both.
- Explicitly deferred: the experience of a visitor that meets a private event (the login with return, the denied view and the invitation hint), which is MR8b, and the integrated functional and security verification that closes the issue.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 5 | `feat/event-privacy-mr8a-01-admin-write` | Write the visibility from the administration: a validated field, an administrative response that exposes the value, an administrative read that returns it, and the unit document (T1) | 490 / 400 | Tracker branch |
| 2 of 5 | `feat/event-privacy-mr8a-02-admin-switch` | The switch of the event settings in the admin panel, with the API client and the types (T2) | 263 / 400 | Child 1 |
| 3 of 5 | `feat/event-privacy-mr8a-03-review-fixes-backend` | The backend findings of the independent review: the visibility leaves the generic update, the dead field of the request goes, the media administration answers the administrative DTO, and the route policy test (T1, T3) | 602 / 400 | Child 2 |
| 4 of 5 | `feat/event-privacy-mr8a-04-review-fixes-frontend` | The panel findings of the independent review: the visibility travels only when the switch was moved, a late response cannot override what the panel wrote, the switch asserts nothing before the read resolves, and the state resets with the slug (T2) | 291 / 400 | Child 3 |
| 5 of 5 | `feat/event-privacy-mr8a-05-docs-and-evidence` | The documentation of the activation, the accepted boundaries and the record of the manual verification (T3, T4) | 149 / 400 | Child 4 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. The unit total is 1647 authored changed lines.

The child 3 carries the production half of the backend findings and its tests together, because they are one behavior: the visibility leaves the generic update and gets its own statement.
