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

T1 | S1, S4, S5, S8 | pending | Write the visibility from the administration: a validated field in the admin request, the column in the repository update that preserves the current value for every other caller, an administrative response that exposes the value and an administrative read that returns it | pending

T2 | S1, S5 | pending | Add the switch to the event settings of the admin panel, with the API client and the types that carry the value | pending

T3 | S2, S3, S7 | pending | Retire the statements that the activation made obsolete and keep the ones that still hold: the repository test that demanded the write never happened, the comment of the model, the documentation of the API and of the migrations | pending

T4 | S1, S2, S4, S6 | pending | Verify the unit with the focused tests, the full suites, an independent review and a manual check in Docker, and record the evidence | pending

## Log

L1. User request verbatim: "ya Mr7 esta completamente mergeado, sincroniza y prepara MR8".

L2. The sync confirmed the state: MR7a and MR7b are merged in `main` (`39a6b28`), the MR7 chain carried the tracker #145 and the children #146 to #151, every head ran the CI in green, and issue #108 is still OPEN.

L3. The read-only map of the three surfaces (Engram discovery, task `mwob0hjg-2-q00d`) found the seams. The administrative write belongs to `PUT /api/admin/events/:slug/features` (`backend/internal/handlers/admin_event_handlers.go:57`), which the owner and the collaborators reach through `AdminMiddleware`; the repository `Update` (`backend/internal/repository/event_repository.go:175`) does not write `is_public` yet; the administrative responses return the public DTO, which hides the value; the admin panel loads the event with the public endpoint, so it cannot see the value either. The invited guest lifecycle of MR2 is complete (model, token, rotation, acceptance, admin UI), and the frontend guard is split: `ProtectedRoute` returns with `state.from` while `LoginPage` reads the `return_to` query, the axios layer replaces the location on a 401 and loses the destination, and `EventLoader` maps 401 and 403 to the same generic error. That is the MR8b half.

L4. Human decisions for this unit, verbatim: "Partir en MR8a y MR8b" for the cut, "Owner + colaborador" for who may write, and "Login con retorno + pista de invitación" for what a visitor finds (that last one belongs to MR8b).

L5. The activation boundary of S4 is open because the protections are merged: `main` carries the scoped HTTP enforcement, the legacy enforcement, the WebSocket admission, the global payload filtering, the media delivery with its native credential and the cache handling. The independent review and the manual Docker verification of MR7 are recorded in `odd/tasks/event-privacy-mr7a.md` and `odd/tasks/event-privacy-mr7b.md`.
