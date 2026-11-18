# MR7a Review Chain

Review chain for MR7a, the issue #108 Delivery 2 unit T3c first half: the stored media is served by the backend under the current event policy. The MR5 and MR6 chains are merged, so this chain is based on `main`.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Base branch: `main` (the tip of the merged MR6 chain).
- Continuation tracker branch: `feat/event-privacy-mr7a-tracker`.
- Scope: the media was served by an unauthenticated nginx alias with a public cache; the backend now resolves every stored media path to its event and applies the current event policy before answering.
- Explicitly deferred: the native browser credential and the service worker cache (MR7b), the final private-visibility activation with its login, return and denial UX, and the integrated verification.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 5 | `feat/event-privacy-mr7a-01-media-repository` | Resolve a stored media path to the event that owns it, over every stored reference (T1) | 211 / 400 | Tracker branch |
| 2 of 5 | `feat/event-privacy-mr7a-02-media-policy` | Apply the current event visibility to the stored media, with the coupled cache rules (T1) | 233 / 400 | Child 1 |
| 3 of 5 | `feat/event-privacy-mr7a-03-media-handler` | Serve the media under that policy, keeping the stored paths and the anonymous access to a public event (T1) | 178 / 400 | Child 2 |
| 4 of 5 | `feat/event-privacy-mr7a-04-media-handler-tests` | Focused tests of the media delivery over real HTTP and a real database (T3) | 382 / 400 | Child 3 |
| 5 of 5 | `feat/event-privacy-mr7a-05-nginx-delivery` | Deliver the media through the backend: the nginx alias becomes a proxy (T2) | 66 / 400 | Child 4 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. The unit total is 1184 authored changed lines of the 1300 the human approved.

No child adds a route or UI that can write the event visibility, and no child changes the stored media paths: the private event stays unreachable through its media URL only because of the policy, which the next unit completes with the native credential and the cache handling.
