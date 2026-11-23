# MR7b — Native browser credential and coupled cache handling — Archived

Issue: https://github.com/tadevshi/the-mile-game/issues/108
Status: T1–T3 completed and integrated in `main`; issue #108 was closed at the user's direction after manual confirmation.
Final integrated target: `main` at `97e22bf72a55e86c1127244c884df737ba1df386`.
Original task path: `odd/tasks/event-privacy-mr7b.md`.

## Closure

- The implementation and delivery work recorded in T1–T3 is present in the merged privacy sequence on `main`.
- The media credential, cache-policy, test, documentation, and Docker evidence remains in the task log below; the later MR8b closure record captures the final integrated HTTP/media/WebSocket and Orca checks.
- Earlier statements below that the branch was unpublished or unmerged describe the state at that log entry and are superseded by the merged-main state.

## Original task record

Scope: the second half of the issue #108 Delivery 2 unit T3c. After MR7a the media is served by the backend under the current event policy, but a native browser element cannot send the `Authorization` header that carries the account identity, and the service worker still caches the media. This unit delivers the identity to the native media requests and couples the cache handling to the policy.

Base: the tip of MR7a (`feat/event-privacy-mr7a-media-backend`). Branch: `feat/event-privacy-mr7b-media-credential`.

Risk: item 2 (security: the credential reaches a surface that the API does not use), item 3 (the service worker rule and the API client are shared by the whole frontend), item 4 (the credential is a new transport for the account identity), item 6 (the current frontend tests do not cover the delivery configuration). Budget: the human-approved maximum of 600 authored additions plus deletions for this unit; with the findings of the independent review, the manual verification and the re-review it landed above that ceiling, and the human decided to trim the evidence and the task records instead of cutting the proof.

## Specs

S1. Issue #108 Delivery 2, verbatim: "T3c: existing media URL protection, native browser credentials and coupled cache handling."

S2. Issue #108 Acceptance, verbatim: "HTTP, media and WebSocket access must enforce current event policy."

S5. Approved design constraint (Engram decision observation 1156), verbatim: "Preserve old media URLs, do not introduce path migration or expose API JWT in WS query."

S6. MR3, MR4, MR5 and MR6 semantics already merged (Engram decisions 1175, 1177, 1180 and 1182): a public event is readable by anyone, a private event only by its owner, its collaborators and its accepted guests; a request without a valid account identity answers 401 and an authenticated non-member answers 403.

S7. Issue #108 Acceptance, verbatim: "Public anonymous event access remains supported." The public events must keep working without an account, including their media.

S8. Human decision for this unit, verbatim: "Cookie de sesión httpOnly, solo para media". The identity reaches the native browser media requests through an httpOnly session cookie that the login, register and refresh responses set, and that the backend accepts only on the media route. The API keeps the Bearer token; the cookie is never read by the API routes.

S9. Human decision for this unit, verbatim: "Red-only para media, cache intacto para estáticos". The media stops being cached by the service worker, the backend marks the media of a public event as publicly cacheable and the media of a private event as not storable, and the static assets keep their current caching rules.

S12. Human decision on the delivery, verbatim: "Partir en MR7a y MR7b". This unit is the second half: the native credential, the cache handling and the documentation.

## Tasks

T1 | S1, S2, S6, S8 | done | Deliver the identity to the native browser media requests: issue the httpOnly session cookie on login, register and refresh, renew it on the authenticated API calls, clear it on logout, and accept it only on the media route | `7e9ef87`, `731e0bd`

T2 | S1, S2, S7, S9 | done | Couple the cache handling to the policy: the service worker stops caching the media, the public media stays publicly cacheable and the private media is not storable | `3150c23`, `eedb3d3`

T3 | S1, S2, S3, S4, S5 | done | Add the focused tests for the credential and the cache rules, keep every original test passing and document the media surface | `78ac40b`, `docs/api/README.md`

## Log

L1. The scope of this unit comes from the human decision "Partir en MR7a y MR7b" of the unit T3c, whose whole measured size was 1576 authored lines against the 900 ceiling that the human had approved for it.

L2. Human decisions, verbatim: "Cookie de sesión httpOnly, solo para media" and "Red-only para media, cache intacto para estáticos".

L3. The cookie is scoped to `Path=/uploads`, so it never travels to the API routes and it cannot be used to change any state. Its value is the access token, its lifetime is the lifetime of that token and it is renewed by the authenticated API calls, so a session restored from the local storage also reaches the media of a private event.

L4. The service worker keeps its static asset rules and its network-only rules for the API and for the dynamic pages; only the media rule changes, from `CacheFirst` for seven days to `NetworkOnly`. The media that the browser cached before this change stays in the cache storage of the previous service worker, but no service worker reads it anymore.

L5. The frontend sends the cookie to the API with `withCredentials`, so a cross-origin development setup stores it; the production setup is same-origin through the nginx proxy.

L6. The blind adversarial review judged the credential sound: it is issued with the agreed attributes, renewed by the authenticated calls, cleared by the logout, read only by the media route and never granting access to another event. Its finding JD-B-002 (the logout response issued a fresh cookie before clearing it) was closed in `886cd1b`: the middleware skips the logout route and a test covers it.

L7. The manual verification in Docker found a real defect of this unit that no automated test had caught: workbox applies the first matching rule, and the static assets rule (`CacheFirst` for `js|css|png|jpg|svg|woff|woff2`) came before the media rule, so the uploaded images of a private event were still stored by the service worker. The parent fixed it in `eedb3d3`: the media rule is now the first runtime caching rule and the static assets rule excludes `/uploads/` explicitly, so a future reordering cannot reopen the leak. The frontend test evaluates the real patterns and asserts that the first rule matching an uploaded image is `NetworkOnly`, that no `CacheFirst` rule matches it, and that the assets of the application keep their cache.

L8. The frontend image build also needed a `frontend/.dockerignore` that excludes `node_modules` and `dist`: a local symlink of the parent broke `COPY . .` with `cannot replace to directory .../app/node_modules with file`.

L9. The manual verification in Docker confirmed the credential on the served stack: the login response sets `eventhub_media_session` with `HttpOnly`, `SameSite=Lax`, `Path=/uploads`, `Max-Age=900` and no `Domain`, the browser sends it only to the `/uploads` paths and never to the root or to the API routes, and the media of a private event answers 200 for the owner that carries it. The evidence is in `docs/verification/mr7-docker.md`.

L10. Commits of this unit: `7e9ef87` the media session cookie middleware and its tests, `731e0bd` the cookie on the login, register, refresh and logout responses, `3150c23` the service worker rule, the API client credentials and the configuration tests, `78ac40b` the documentation of the media delivery rules, `886cd1b` the fixes of the review findings, `eedb3d3` the service worker cache fix, `8ed85ec` the HEAD route and `b951f85` the fixes of the re-review. No merge was performed.
L11. The MR7b branch (`feat/event-privacy-mr7b-media-credential-v2`, 1128 authored changed lines) is ready and consistent with the corrections that the CI of MR7a exposed: the name of the media session cookie lives in the shared `services` package and the wiring of the media session middleware belongs to this unit. It is not published: it follows the merge of the MR7a chain, as the MR5 and MR6 units did.
