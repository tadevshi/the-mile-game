# MR5 Review Chain — Archived

Issue: https://github.com/tadevshi/the-mile-game/issues/108
Status: historical review-plan manifest archived at the user's direction; this file has no task completion status and is not a completion certificate.
Final integrated target: `main` at `97e22bf72a55e86c1127244c884df737ba1df386`.
Original task path: `odd/tasks/event-privacy-mr5-chain.md`.

## Closure

- Moved from `odd/tasks/` to `odd/archive/` at the user's request, limited to files that were in the task directory.
- Retain the child-slice plan below as historical context; completion and verification status remain in the corresponding task records.
- The earlier instruction to keep issue #108 open is historical; the user later directed its closure after manual validation.

## Original chain manifest

Review chain for MR5, the issue #108 Delivery 2 unit T3a: authenticated WebSocket room admission, current-policy per-room delivery, expiry and browser credential lifecycle. It continues the MR4 chain, so it is based on the last MR4 slice (`feat/event-privacy-mr4-09-review-fixes`, PR #129) and merges after the MR4 chain.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Base branch: `feat/event-privacy-mr4-09-review-fixes` (the tip of the MR4 chain).
- Continuation tracker branch: `feat/event-privacy-mr5-tracker`.
- Scope: make the WebSocket an authenticated, policy-checked entry point and give the room-bound clients a per-room delivery guarantee.
- Explicitly deferred: the global recipient filtering for the observers without a room, the media and cache protection, and the final private-visibility activation with its login, return and denial UX.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 5 | `feat/event-privacy-mr5-01-ticket-endpoint` | Admission ticket service and the authenticated endpoint that issues it (T1) | 194 / 400 | Tracker branch |
| 2 of 5 | `feat/event-privacy-mr5-02-browser-credential` | Browser credential lifecycle: mint over the authenticated surface, present it in the subprotocol, renew on reconnect, keep the socket bound to the event of the page (T3) | 248 / 400 | Child 1 |
| 3 of 5 | `feat/event-privacy-mr5-03-room-admission` | Admission before the upgrade and the per-room delivery guarantee, with the room policy and the real-handshake tests (T2) | 499 / 400 | Child 2 |
| 4 of 5 | `feat/event-privacy-mr5-04-ticket-coverage-docs` | Ticket coverage and the WebSocket admission documentation (T4) | 113 / 400 | Child 3 |
| 5 of 5 | `feat/event-privacy-mr5-05-review-fixes` | Review fixes: a ticket is only minted for a reachable event, and a public room stays open for a foreign ticket (T4) | 228 / 400 | Child 4 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. Child 3 is 99 lines above the review budget because the admission, the policy and its real-handshake tests are one behavior. The unit total is 1254 authored changed lines of the 1323 the human approved.

No child adds a route or UI that can write the event visibility, no child touches the media or cache surface, and the global recipients are still unfiltered: that is the next unit. Merge the MR4 chain first, then this chain.
