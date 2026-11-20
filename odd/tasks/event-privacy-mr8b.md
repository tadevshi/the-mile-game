# MR8b — The private event experience of a visitor

Scope: the second half of the issue #108 Delivery 2 unit T4. After MR8a an event can be private, and the backend answers 401 for a request without an identity and 403 for an authenticated account that is not a member. The frontend does not know the difference: it shows a generic error, and the axios layer sends the visitor to the login without remembering where they were. This unit gives the visitor a real experience: a private event view with a login that keeps the destination, an access denied view, and the hint to ask the organizer for an invitation.

Base: `origin/main` (`5210e31`, with MR3 to MR8a merged). Branch: `feat/event-privacy-mr8b-visitor-experience`.

Risk: item 3 (the loader, the axios layer, the protected route and the authentication pages are shared by the whole frontend), item 4 (the return channel changes the behaviour of the login and of the registration), item 6 (the current frontend tests do not cover the error states of the loader nor the return channel). Budget: 700 authored additions plus deletions, the default taken after the questionnaire of the scope was cancelled.

## Specs

S1. Issue #108 Delivery 2, verbatim: "T4: privacy settings, guest invitations and private-event login/return/access-denied UI." This unit is the login, return and access-denied half; the privacy settings and the guest invitations arrived with MR2 and MR8a.

S2. Issue #108 Acceptance, verbatim: "Private anonymous visitors must log in; unrelated accounts are denied."

S3. The backend contract that already exists: the scoped routes of a private event answer 401 with `{"error":"Authentication required"}` for a request without a valid account identity and 403 with `{"error":"Not authorized to view this event"}` for an authenticated account that is not a member of the event. The frontend must tell those two apart and must not confuse either with the 404 of a missing event or the 410 of an ended one.

S4. Human decision for this unit, verbatim: "Login con retorno + pista de invitación". The visitor finds a login that returns to the page they were on, and a hint that the organizer can invite them.

S5. The return destination travels in the `return_to` query parameter, the channel that the page of the invited guest already uses (`/guest-join/:slug?token=`). The router state that the protected route used is not a second channel: there is one channel.

S6. The destination is always a path of the same origin. A destination that points elsewhere is ignored, exactly as the registration page already does with the invitation paths.

S7. The invitation hint points at the existing guest path of MR2; the unit does not invent a second way to join an event.

S8. The new strings are translated: the project has the translation files for Spanish and English, and the authentication pages already use them.

## Tasks

T1 | S1, S2, S3 | pending | Teach the loader to tell the private event (401) from the denied event (403), from the missing event (404) and from the ended one (410), and to render the new views instead of the generic error | pending

T2 | S1, S4, S7 | pending | Add the private event view with the login that keeps the destination and the invitation hint, and the access denied view | pending

T3 | S5, S6 | pending | Unify the return channel in the query parameter: the protected route, the login, the registration and the redirect of the axios layer keep the destination | pending

T4 | S1, S8 | pending | Add the translations of the new strings in Spanish and English | pending

T5 | S1, S2, S5, S6 | pending | Cover the states of the loader, the views and the return channel with the focused tests, keep every original test passing, verify with the full suite and record the evidence | pending

## Log

L1. The MR8a chain was merged: the tracker #152 and the children #153 to #157 are merged, every head ran the CI in green, and `main` is `5210e31`. Issue #108 is still OPEN.

L2. The read-only map of the frontend seams (task `mwplklhv-9-xedf`) found the structural reason of the missing experience: the axios layer reacts to a 401 before the error reaches the loader, so the loader never sees it; the loader classifies only in the catch, where 404 becomes "not found", 410 becomes "ended" and everything else becomes the generic error; the protected route remembers the destination in the router state while the login page reads the `return_to` query, so the state is lost; the registration only accepts the invitation paths as a destination; and the redirect of the axios layer replaces the location without the destination.

L3. Human decisions for this unit, verbatim: "Login con retorno + pista de invitación". The questionnaire that asked for the remaining details (the registration in the private view, the translation of the new strings and the ceiling of the unit) was cancelled, so the parent took the recommended defaults and recorded them here: the private view offers the login and the link to the registration, the new strings are translated in Spanish and English, and the ceiling of the unit is 700 authored additions plus deletions.
