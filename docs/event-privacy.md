# Event guest invitations

Guest membership links an EventHub account to an event without granting any
administrative permissions. It is independent of collaborators and quiz players.
This backend slice does **not** restrict event visibility; private-event access
checks, media/WebSocket protection and the guest-join UI are subsequent work.

## API

All endpoints below require `Authorization: Bearer <access_token>`.

| Method | Endpoint | Permission and behavior |
| --- | --- | --- |
| GET | `/api/admin/events/:slug/guests/invite` | Event owner only. Read current guest invitation; create one if absent. |
| POST | `/api/admin/events/:slug/guests/invite` | Event owner only. Generate/replace the guest invitation. |
| POST | `/api/guests/accept?token=TOKEN` | Any authenticated account. Link that account to the token's event, idempotently. No body required. |

Invite management returns HTTP 200:

```json
{"token":"UUID","share_url":"https://your-app/guest/join/event-slug?token=UUID"}
```

Share URLs reuse collaborator `APP_BASE_URL` configuration (default
`http://localhost:8081`) but use `/guest/join/:slug?token=...` for the future UI.
GET reuses the existing token; POST invalidates the previous link. Invitations
are shared/multi-use and remain valid until rotated. Rotation does not revoke
accounts already linked to the event. Collaborator and secret-box tokens are
unaffected and cannot be used for guest acceptance.

Acceptance returns HTTP 200, including on repeat acceptance:

```json
{"message":"Successfully joined event","event":{"id":"event-uuid","slug":"event-slug","name":"Event name"},"user_id":"authenticated-account-uuid"}
```

The event summary is an explicit allowlist: no secret-box, collaborator, or guest
token is returned. The account comes from authentication, not request input.
Missing authentication returns 401. Missing invitation token returns 400
`{"error":"Token is required"}`; invalid/rotated tokens return 404
`{"error":"Invalid or expired invitation"}` without creating membership.
Non-owner invite management returns 403, including for collaborators and guests.
Repository failures return 500. Guests remain forbidden from admin endpoints;
existing owners/collaborators keep their administrative access.

## Persistence and subsequent access checks

Migration `014_event_guests` adds `event_guests` (unique event/account pairs)
and `event_guest_invites` (one independent token per event). Event/account deletion
cascades membership deletion; event deletion also removes the invitation.
`GuestRepository.GetByEventAndUser` and `Exists` provide membership lookup for
later event-read authorization. **Never supply GuestRepository to
AdminMiddleware**: administrative checks must continue using
CollaboratorRepository. No guest token is added to Event serialization or event
updates, so existing event APIs cannot expose or overwrite it.
