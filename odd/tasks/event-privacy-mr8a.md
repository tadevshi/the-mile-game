# MR8a — Administrative activation of the private event

Scope: the first half of the last privacy unit. The visibility is persisted and enforced since MR3, and the HTTP, legacy, WebSocket and media surfaces protect it since MR3 to MR7. What does not exist is the administrative write that makes an event private, and the admin panel that would use it. This unit adds that write, the admin response that exposes the current value, and the switch in the event settings. The experience of a visitor that meets a private event is the second half (MR8b).

Base: `origin/main` (`39a6b28`, with MR3, MR4, MR5, MR6, MR7a and MR7b merged). Branch: `feat/event-privacy-mr8a-activation`.

Risk: item 1 (the write changes stored data: it makes an event unreachable for anyone without a membership), item 2 (security: the write is the boundary that the whole sequence protected), item 3 (the repository `Update` is shared by several callers), item 6 (the current tests assert that the visibility is never written). Budget: to be approved by the human before the first write.

## Specs

S1. Issue #108 Delivery 1, verbatim: "Default-public event visibility persistence and validated owner/collaborator settings." MR8a completes the second half of that line: the validated owner/collaborator setting of the visibility.

S2. Issue #108 Delivery 2, verbatim: "T4: privacy settings, guest invitations and private-event login/return/access-denied UI." This unit is the administrative activation of the privacy settings; the login, return and access-denied experience belongs to MR8b.

S3. Issue #108 Acceptance, verbatim: "Invited guests may read/play but cannot administer; owners/collaborators retain administration." A guest never gains the write, and the collaborator keeps it exactly as it keeps the rest of the administration.

S4. Approved activation boundary (Engram decision observation 1156), verbatim: "Do not enable private through any supported admin write until scoped/legacy/WS/media protection is complete." That condition is met: the scoped HTTP routes (MR3), the legacy routes and the legacy administration (MR4), the WebSocket admission and the global payloads (MR5 and MR6) and the media delivery with its native credential and cache handling (MR7) are merged in `main`. This unit opens the boundary and nothing else.

S5. Human decision for this unit, verbatim: "Owner + colaborador". The owner and the collaborators of the event may change the visibility, exactly as they may change the features and the settings of the event. A guest never may.

S6. Human decision for this unit, verbatim: "Partir en MR8a y MR8b". The unit T4 is delivered as two units: this one, the administrative write and the admin panel, and MR8b, the experience of the visitor.

S7. The public response keeps hiding the visibility. The allowlist of `models.PublicEventResponse` is a security property: an anonymous client never learns whether an event is private. The administrative responses may expose it, because the caller is the owner or a collaborator.

S8. The write is validated. An invalid value is a bad request and the stored visibility does not change. An omitted value preserves the current one, so a caller that does not know about the visibility never changes it by accident.

## Tasks

T1 | S1, S4, S5, S8 | done |  Write the visibility from the administration: a validated field in the admin request, the column in the repository update that preserves the current value for every other caller, an administrative response that exposes the value and an administrative read that returns it | `ba7c8fa`, `d6776cb` |

T2 | S1, S5 | done |  Add the switch to the event settings of the admin panel, with the API client and the types that carry the value | `4fc466c`, `69dadad` |

T3 | S2, S3, S7 | done |  Retire the statements that the activation made obsolete and keep the ones that still hold: the repository test that demanded the write never happened, the comment of the model, the documentation of the API and of the migrations | `ba7c8fa`, `bbe3bbf`, `f75100d` |

T4 | S1, S2, S4, S6 | done |  Verify the unit with the focused tests, the full suites, an independent review and a manual check in Docker, and record the evidence | `f5481b9`, `2d6c7c7` |

## Log

L1. User request verbatim: "ya Mr7 esta completamente mergeado, sincroniza y prepara MR8".

L2. The sync confirmed the state: MR7a and MR7b are merged in `main` (`39a6b28`), the MR7 chain carried the tracker #145 and the children #146 to #151, every head ran the CI in green, and issue #108 is still OPEN.

L3. The read-only map of the three surfaces (Engram discovery, task `mwob0hjg-2-q00d`) found the seams. The administrative write belongs to `PUT /api/admin/events/:slug/features` (`backend/internal/handlers/admin_event_handlers.go:57`), which the owner and the collaborators reach through `AdminMiddleware`; the repository `Update` (`backend/internal/repository/event_repository.go:175`) does not write `is_public` yet; the administrative responses return the public DTO, which hides the value; the admin panel loads the event with the public endpoint, so it cannot see the value either. The invited guest lifecycle of MR2 is complete (model, token, rotation, acceptance, admin UI), and the frontend guard is split: `ProtectedRoute` returns with `state.from` while `LoginPage` reads the `return_to` query, the axios layer replaces the location on a 401 and loses the destination, and `EventLoader` maps 401 and 403 to the same generic error. That is the MR8b half.

L4. Human decisions for this unit, verbatim: "Partir en MR8a y MR8b" for the cut, "Owner + colaborador" for who may write, and "Login con retorno + pista de invitación" for what a visitor finds (that last one belongs to MR8b).

L5. The activation boundary of S4 is open because the protections are merged: `main` carries the scoped HTTP enforcement, the legacy enforcement, the WebSocket admission, the global payload filtering, the media delivery with its native credential and the cache handling. The independent review and the manual Docker verification of MR7 are recorded in `odd/tasks/event-privacy-mr7a.md` and `odd/tasks/event-privacy-mr7b.md`.
L6. The RED evidence was observed before the implementation: the cookie of the backend half failed to compile (`NewMediaRepository undefined`, `MediaPolicy undefined`, `MediaHandler undefined`) and the behavioral RED showed the administrative read answering 404, the write accepting an invalid value with 200 and the response without the visibility. The GREEN evidence is the focused suites of the affected packages, the full backend suite with every package in green, the frontend suite and build, and the manual verification in Docker.
L7. The manual verification in Docker (`mwopc66w-6-qtuy`, stack `milegame-mr3-manual`) passed the seven checks with real HTTP: the administrative read carries `is_public`, the write persists it, a private event answers 401 for an anonymous client on the scoped content and on the media and 200 for the owner, an invalid value answers 400 with the stored value untouched, an omitted value preserves it, a non-member answers 403 and an anonymous request 401, and the anonymous public read never carries `is_public`. The evidence is in `docs/verification/mr8a-docker.md`.
L8. The blind adversarial review (`jd-judge-b`, task `mwopc66u-5-p2bm`) judged the unit sound on the five attacks that matter: only the owner and the collaborators write the visibility, the guest never gains it, the value is reachable only through the two administrative endpoints, the owner is not locked out of the event it just made private, and every other caller of the repository update preserves the stored visibility. It reported seven findings and the parent closed five of them.
L9. The findings that are closed. F1: the panel sent the visibility it knew even when the administrator never moved the switch, so a stale panel re-published a private event; the panel now sends it only when the switch was moved. F2: after a save the panel dropped its guard and a late response of the initial read overrode the decision of the administrator; the value the panel wrote is now frozen against the later responses. F5: the generic repository update wrote the visibility for every caller, which made "load before save" a convention without a guard; the column left that statement and the visibility has its own explicit write, so a caller that saves an event it never loaded cannot make it private. F6: the dead field of the request struct, which made an absent value and a `null` look the same, was removed. F7: the media administration answered with the public DTO while the features write answered with the administrative one; both answer the same shape now. F8: the switch asserted "public" before the administrative read resolved; it stays disabled and asserts nothing until the value is known. F9: the visibility state survived a change of the slug; it is now derived per slug.
L10. The findings that are accepted and recorded instead of fixed. F3: the status codes tell a caller that is not a member that an event exists and that it is private (`401` for an anonymous request, `403` for an account that is not a member, `200` for a public event). The value itself is never disclosed outside the administration, and the difference of the codes is what a private event necessarily looks like from the outside; it is now written down in the API documentation instead of being an accident of the activation. F10: a collaborator can also set the visibility back to public, exactly as the owner can, and the owner has no veto over it. That is the consequence of the decision S5 and it is documented in the same place as the other accepted boundaries.
L11. The review also found a gap in the tests: the real wiring of the new administrative read was not exercised. The route policy test of the `cmd/api` package now builds the same group and the same registration that production uses and proves the matrix: no credential answers 401, an account that is not a member answers 403, an accepted guest answers 403, a collaborator answers 200 and the owner answers 200.
L12. The unit total is 1647 authored changed lines (1461 of product and tests, 107 of the manual verification, 54 of the unit document and 25 of the API documentation): the administrative write with its tests, the switch of the panel with its tests, the documentation of the activation, the evidence of the manual verification and the findings of the review with their fixes. No publication and no merge were performed at the time of this entry.
