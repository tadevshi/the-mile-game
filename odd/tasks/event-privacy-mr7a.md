# MR7a — Media served by the backend under the current event policy

Scope: the first half of the issue #108 Delivery 2 unit T3c. The stored media keeps its paths, but the backend serves it and resolves every file to its event before answering, so a media URL stops being a public shortcut to the content of a private event. The native browser credential and the service worker cache are the second half (MR7b).

Base: `origin/main` (`2e974ac`, with MR3, MR4, MR5 and MR6 merged). Branch: `feat/event-privacy-mr7a-media-backend`.

Risk: item 2 (security: the media surface is the last path that can expose a private event's photos and videos to anyone who knows the URL), item 3 (the media path is shared by the public events and by the existing clients), item 5 (the delivery path involves the nginx configuration and the Docker Compose volumes), item 6 (the current tests do not cover the media delivery). Budget: the human-approved maximum of 1300 authored additions plus deletions for this unit; the unit landed at 1160.

## Specs

S1. Issue #108 Delivery 2, verbatim: "T3c: existing media URL protection, native browser credentials and coupled cache handling."

S2. Issue #108 Acceptance, verbatim: "HTTP, media and WebSocket access must enforce current event policy."

S3. Approved eight-MR sequence (Engram decision observation 1156): this unit is the media one. The later units separately cover "privacy settings, guest invitations and private-event login/return/access-denied UI" and "integrated functional and security verification". Do not expand this unit into those.

S4. Approved activation boundary (Engram decision observation 1156), verbatim: "Do not enable private through any supported admin write until scoped/legacy/WS/media protection is complete." This unit must not add a route or UI that can write the event visibility.

S5. Approved design constraint (Engram decision observation 1156), verbatim: "Preserve old media URLs, do not introduce path migration or expose API JWT in WS query."

S6. MR3, MR4, MR5 and MR6 semantics already merged (Engram decisions 1175, 1177, 1180 and 1182): a public event is readable by anyone, a private event only by its owner, its collaborators and its accepted guests; a request without a valid account identity answers 401 and an authenticated non-member answers 403; the records that belong to no event keep their current behavior; an event that ended answers 410.

S7. Issue #108 Acceptance, verbatim: "Public anonymous event access remains supported." The public events must keep working without an account, including their media.

S11. Read-only media surface map (Engram discovery observation 1111 and the fresh map of this unit): the media is served only by `frontend/nginx.conf` through an unauthenticated `location ^~ /uploads/` alias with `expires 30d` and `Cache-Control: public`; the Go backend serves no media today and only writes the files and returns their paths; the account identity exists only in `localStorage` and travels in an `Authorization` header that a native element cannot send.

S12. Human decision for this unit, verbatim: "Partir en MR7a y MR7b". The unit T3c is delivered as two units: this one, the backend media surface and its delivery, and MR7b, the native browser credential, the cache handling and the documentation.

S13. Human decision for this unit, verbatim: "Media servido por el backend bajo la politica de visibilidad" for the delivery: the backend resolves every media file to its event and answers 404 when the file belongs to no stored record, so an unknown path never reaches the disk.

## Tasks

T1 | S1, S2, S5, S6, S7, S11, S13 | done | Resolve a stored media path to its event, decide the access with the current event policy and serve the file from the uploads directory, keeping the stored paths and the anonymous access to the media of a public event | `635cca9`, `ccd2b7c`, `b8b140d`, `2115562`

T2 | S1, S2, S5, S11 | done | Deliver the media through the backend: the nginx alias becomes a proxy to the backend and the media route stays behind the global CORS policy | `eabb5a6`

T3 | S1, S2, S3, S4, S5, S7 | done | Add the focused tests for the media delivery, keep every original test passing and document the media surface | `2115562`, `docs/api/README.md`

## Log

L1. User request verbatim: "en una sesion anterior estabamos implementando la feature de security y setting para eventos publicos y privados, por vafor busca en engram lo que habiamos explorado y lo que ya tenemos implementado. nos habiamos quedado listos para continuar con la MR7".

L2. The Engram read confirmed MR1-MR6 merged, `origin/main` is `2e974ac` and issue #108 is still OPEN. The earlier exploration of the media surface (Engram discovery observation 1111) was read-only and its implementation attempt was never published.

L3. Human decisions, verbatim: "Cookie de sesión httpOnly, solo para media", "Red-only para media, cache intacto para estáticos", "Hasta 900 líneas authored" for the first ceiling of the whole unit T3c, and later "Partir en MR7a y MR7b" after the unit measured 1576 authored lines.

L4. The read-only map confirmed the residual: `frontend/nginx.conf:23` served `/uploads/` through an unauthenticated alias with `expires 30d` and `Cache-Control: public`, `frontend/vite.config.ts` cached `/uploads/*` with `CacheFirst` for seven days, and the backend served no media at all.

L5. The backend half was implemented by a bounded writer (`mwkge9ts-2-91g2`) and the delivery half by the parent. The parent review corrected three defects before any commit: the media route was registered before `r.Use(cors.New(config))`, so it escaped the global CORS policy and the handler answered with an unrestricted origin; the media session cookie was implemented twice, in the handlers and in the middleware; and the `Secure` flag was decided differently in the two places. The route is now registered after the CORS middleware, the cookie has a single source in the middleware package, and the handler sets no CORS header of its own.

L6. Evidence: the RED failure was observed before the implementation (the cookie tests failed with an empty `Set-Cookie` set and the media tests did not compile). The GREEN evidence is the focused suites of the five affected packages, the full backend suite with only the four pre-existing `internal/worker` failures (reproduced on the untouched base `2e974ac`), the green frontend suite and build, the `nginx -t` proof and the generated `dist/sw.js`. The backend suite only passes with `-p 1`: in parallel the packages collide on the same disposable database.

L7. The blind adversarial review (`jd-judge-b`) judged the delivery sound on the attacks that matter and reported seven findings. The parent closed five of them in `886cd1b` (the identity dependent answers now carry `private, no-store`; the logout no longer issues a fresh credential; a path referenced by more than one record is resolved with the strictest rule; a null byte answers 400; a file on the disk without a stored record is covered by a test) and accepted two with documentation (the media now refuses an origin outside `CORS_ALLOWED_ORIGINS`, and the `Secure` flag trusts `X-Forwarded-Proto`). The focused re-review confirmed the five closures with runtime evidence and no new open finding; its two suggestions (an invalid UTF-8 path answering 500, and the missing handler test of a shared path) were closed in `b951f85`.

L8. The manual verification in Docker on the isolated stack `milegame-mr3-manual` passed: the stack rebuilt from the worktree is healthy, the media of a public event answers 200 with the bytes, the image content type, `nosniff` and `public, max-age=2592000` through both origins, the media of a private event answers 401 without an identity, 200 with the cookie and with the Bearer token of the owner and 403 for an account that is not a member. The evidence is in `docs/verification/mr7-docker.md`.

L9. An environment incident interrupted the verification: `/tmp` is a tmpfs with the user quota enabled, the quota of the account was exhausted, and every subagent died with `Unknown system error -122` (EDQUOT) while loading its extensions, which looks like a provider crash. The human authorized releasing the stale scratch of the previous sessions in `/tmp` (about 10.5G); `/tmp` went from 13G used to 2.0G used. The files of a Go module cache are read-only, so the removal needs `chmod -R u+w` before `rm -rf`.

L10. Commits of this unit: `635cca9` the media repository, `ccd2b7c` the media policy, `b8b140d` the media handler and its route, `2115562` the handler tests, `eabb5a6` the nginx proxy and its configuration test. No publication and no merge were performed at the time of this entry.
L11. The MR7a review chain was published on the authorized destination `github.com/tadevshi/the-mile-game` with the same shape as MR3, MR4, MR5 and MR6: a draft, no-merge tracker plus focused child pull requests, each based on its immediate parent, each linked with the non-closing `Refs #108` and exactly one `type:feature` label. The tracker branch `feat/event-privacy-mr7a-tracker` adds only the 23-line manifest `odd/tasks/event-privacy-mr7a-chain.md` and its draft pull request is #139, based on `main` because the MR6 chain is already merged. The five child slices are #140 the media repository (211 lines), #141 the media policy (233), #142 the media handler and its route (178), #143 the handler tests (382) and #144 the nginx delivery (66). The unit total is 1184 authored changed lines of the 1300 the human approved. No merge was performed and issue #108 stays open.
L12. The first CI dispatch failed on the three children that carry the handler: the parent review had left the media route depending on the name of the media session cookie and on the wiring of the media session middleware, both of which belong to MR7b, so the MR7a slices did not compile on their own. The parent moved the name of the cookie to `backend/internal/services/media_cookie.go`, a package that the media route and the middleware share, returned the wiring of the middleware to MR7b, and committed the two corrections on top of the published children (no published commit was rewritten). The three heads build and the affected packages are green, and the new runs `44106812673`, `44106820236` and `44106830682` passed. Every pull request of the chain now records its own passing run on its exact head: the tracker `44105524409`, #140 `44105532568`, #141 `44105539386`, #142 `44106812673`, #143 `44106820236` and #144 `44106830682`.
