# MR7b Review Chain

Review chain for MR7b, the issue #108 Delivery 2 unit T3c second half: the native browser credential and the coupled cache handling. The MR7a chain is merged, so this chain is based on `main`.

- Parent issue: #108 (`Refs #108`; keep the issue open).
- Base branch: `main` (the tip of the merged MR7a chain, `2110586`).
- Continuation tracker branch: `feat/event-privacy-mr7b-tracker`.
- Scope: a native element (`<img>`, `<video>`, a poster, a download) cannot send an `Authorization` header, so the account identity travels in an httpOnly cookie scoped to `/uploads`. The service worker stops caching the media.
- Explicitly deferred: the final private-visibility activation with its login, return and denial UX, and the integrated functional and security verification.

## Ordered child slices

| Position | Branch | Review slice | Budget | Base / dependency |
|---|---|---|---:|---|
| 1 of 6 | `feat/event-privacy-mr7b-01-media-session-cookie` | Issue the httpOnly media session cookie and renew it on the authenticated calls (T1) | 261 / 400 | Tracker branch |
| 2 of 6 | `feat/event-privacy-mr7b-02-auth-cookie` | Deliver the cookie with the login, register and refresh responses, and clear it on logout (T1) | 199 / 400 | Child 1 |
| 3 of 6 | `feat/event-privacy-mr7b-03-media-cache` | Keep the media out of the service worker cache and document the delivery rules (T2, T3) | 136 / 400 | Child 2 |
| 4 of 6 | `feat/event-privacy-mr7b-04-review-fixes` | Close the findings of the independent review: the cache rule of the identity answers, the logout credential, the shared path, the malformed path and the test gap (T2) | 419 / 400 | Child 3 |
| 5 of 6 | `feat/event-privacy-mr7b-05-review-fixes-frontend` | Keep the HEAD of the media route and the shared name of the media cookie (T2) | 87 / 400 | Child 4 |
| 6 of 6 | `feat/event-privacy-mr7b-06-docs-and-evidence` | Record the manual verification and the unit task documents (T3) | 165 / 400 | Child 5 |

Each child is reviewed against its immediate parent and uses `Refs #108` plus exactly one `type:feature` label. The unit total is 1267 authored changed lines.

The slices keep the order of the verified branch, so every slice applies without a conflict and the tree of the chain tip is identical to the verified branch.
