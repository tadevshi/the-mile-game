# Event visibility and guest invitations

Guest membership links an EventHub account to an event without granting any
administrative permissions. It is independent of collaborators and quiz players.
Event-scoped HTTP content and legacy player/ranking/postcard/description aggregates
now enforce visibility. Other legacy endpoints, media/WebSocket protection and the
guest-join UI remain subsequent work.

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

## Visibility persistence

Migration `015_event_visibility` adds the first-class `events.visibility` column:
non-null, exactly `public` or `private`, with a database default of `public`.
All existing events remain public. Apply project migrations before running the
updated backend; rolling back 015 removes the column and its visibility values.

`Event.Visibility` serializes as `visibility`. `EventRepository.Create` keeps its
existing signature and creates public events. All event lookup/list methods
return the stored visibility. `Update` accepts explicit `public`/`private`;
an empty field means preserve the stored value, so existing callers that omit
the field cannot reset private events when updating unrelated fields. Other
values return `invalid event visibility` before any stored event fields change.
Database constraints also reject invalid or null stored values.

## Event-scoped HTTP access

The content routes under `/api/events/:slug` (metadata, theme, players, quiz,
ranking, postcards and POST page-view analytics) share the visibility policy.
Public events accept anonymous requests, including absent/malformed/invalid
Authorization headers under existing optional-auth semantics. Private events
require a valid JWT and owner, collaborator or invited-guest membership:

- 401: `{"error":"Authentication required"}` for unauthenticated requests.
- 403: `{"error":"Not authorized to access this event"}` for nonmembers.
- 500: `{"error":"Failed to verify permissions"}` for membership lookup failures.

Rejected requests do not reach content handlers. Event lookup retains its
existing 404/410/500 responses. Guests do not gain administrative permissions.
GET event metadata preserves its payload shape except that `secret_box_token`
and `invite_token` are omitted for anonymous users, guests and unrelated users
(including logged-in users on public events). Owners/collaborators retain those
fields; privileged dashboard responses and admin paths remain unchanged.

POST `/api/events/:slug/secret-box` remains token-only upload access, without
login/membership. `X-Secret-Token` never grants content-read access.
Scoped quiz-answer reads resolve the player before fetching answers and require
that player's event to match the requested slug's event. Missing players,
lookup failures and cross-event IDs return 404 `{"error":"Player not found"}`;
malformed IDs retain 400 `{"error":"Invalid player ID"}`. Same-event answers
retain their existing payload. Legacy/no-event-context reads are unchanged.

Owners and collaborators can now set visibility through the existing
PUT `/api/admin/events/:slug/features` API, for example:

```json
{"features":{},"visibility":"private"}
```

`visibility` is optional; exactly `public` and `private` are accepted. Other
values (including empty strings, null and nonstrings) return 400
`{"error":"invalid event visibility"}` before any event update. Omitting it
preserves stored visibility while existing feature/settings updates continue
unchanged. The existing `features` object remains required, and the response
remains the updated event. Guests remain forbidden from this administrative API.
No usable privacy-settings UI exists yet. Other legacy HTTP protection,
media/WebSocket/cache enforcement and UI are separate pending units:
**this is not complete private-event protection**.
Membership and invitation-token lifecycles are unchanged.

## Legacy player and ranking aggregates

GET `/api/players` and GET `/api/ranking` now return only public-event players,
truly event-unassociated (`NULL event_id`) legacy players, and private-event
players whose event the authenticated account owns or belongs to as a
collaborator or invited guest. Membership in one event grants no access to
another. Visibility/membership is evaluated on each read. Optional authentication
retains existing absent/invalid-token semantics (anonymous visibility).
No slug or default event is required. Fields, score-descending ordering, ranking
positions, and empty responses (`null` players, `[]` ranking) are unchanged.
Scoped routes retain their existing event-filtered behavior. Other legacy
reads/writes and administration, media, WebSocket and cache enforcement remain
pending; these two aggregate protections do not establish complete privacy.

## Legacy postcard and description aggregates

GET `/api/postcards` and GET `/api/quiz/descriptions` use optional JWT identity
and the same public/owner/collaborator/invited-guest visible-event policy.
Postcards use their own event association, falling back to the player's event
when absent; only NULL on both associations belongs to the public legacy
namespace. Descriptions follow their player's event, preserving truly
unassociated players. Membership in one event grants no access to another.
Query parameters such as `event_id` and `slug` remain ignored, not access grants;
secret-box tokens do not grant reads. Unrevealed secrets remain excluded even
for members. Existing fields, ordering (revealed secrets first then newest
postcards; oldest descriptions first), whitespace, and empty responses (`[]`
postcards, `{"descriptions":[]}`) are preserved. Scoped postcard reads are unchanged.
Record-anchored legacy reads/writes, legacy administration, media/WebSocket/cache
and frontend enforcement remain incomplete: **not deploy-ready privacy**.

## Guest persistence and subsequent access checks

Migration `014_event_guests` adds `event_guests` (unique event/account pairs)
and `event_guest_invites` (one independent token per event). Event/account deletion
cascades membership deletion; event deletion also removes the invitation.
`GuestRepository.GetByEventAndUser` and `Exists` provide membership lookup for
later event-read authorization. **Never supply GuestRepository to
AdminMiddleware**: administrative checks must continue using
CollaboratorRepository. No guest token is added to Event serialization or event
updates, so existing event APIs cannot expose or overwrite it.
