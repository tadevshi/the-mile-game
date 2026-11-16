# MR6 Review Chain

Review chain for MR6, the issue #108 Delivery 2 unit T3b: the current-recipient authorization and filtering for the global WebSocket messages. It continues the MR5 chain, so it is based on the last MR5 slice (`feat/event-privacy-mr5-05-review-fixes`, PR #135) and merges after the MR5 chain.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Base branch: `feat/event-privacy-mr5-05-review-fixes` (the tip of the MR5 chain).
- Continuation tracker branch: `feat/event-privacy-mr6-tracker`.
- Scope: the global broadcasts reach only the connections without a room, and their payload must carry only what a client without an identity may see.
- Explicitly deferred: the media and cache protection, the final private-visibility activation with its login, return and denial UX, and the integrated verification.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 2 | `feat/event-privacy-mr6-01-global-filtering` | Filter the three global broadcasts with the anonymous visibility decision, plus the policy and handshake tests (T1, T2) | 281 / 400 | Tracker branch |
| 2 of 2 | `feat/event-privacy-mr6-02-review-fixes` | Review fixes: an ended event is not visible to an observer, the secret reveal is covered by a handshake test, the reveal logs the delivered count (T2) | 43 / 400 | Child 1 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. The unit total is 326 authored changed lines of the 600 the human approved.

No child adds a route or UI that can write the event visibility, no child touches the media or cache surface, and the room delivery is untouched: a client admitted to a room keeps receiving the messages of its room, including the private-event ones. Merge the MR5 chain first, then this chain.
