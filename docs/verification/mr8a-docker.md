# MR8a — Manual Docker verification of the administrative activation of the private event

## Result

The manual verification of the MR8a administrative activation of the private
event **passed** on the reviewed source, with plain HTTP against the isolated
Compose stack `milegame-mr3-manual` (containers `milegame-mr3-manual-db`,
`-api`, `-web`; web on `127.0.0.1:8083`, API on `127.0.0.1:8090`). No browser
was used: every request was a `curl` call with a cookie jar.

All seven requested checks answered the expected status:

| # | Check | Observed |
|---|-------|----------|
| 1 | Stack health after the rebuild | web `GET /` → **200**; API `GET /health` → **200** `{"status":"ok",...}` |
| 2 | Administrative read and write | `GET /api/admin/events/:slug` → **200** with `"is_public": true`; `PUT .../features` with `"is_public": false` → **200**; the administrative read then answers `"is_public": false` |
| 3 | Stored effect | anonymous `GET /api/events/:slug/quiz/questions` → **401**; anonymous `GET /uploads/logos/<file>` → **401**; the owner with the Bearer token → **200** |
| 4 | Validation | `PUT .../features` with `"is_public": "yes"` → **400** and the stored value stays `false`; `PUT .../features` without the field → **200** and the stored value stays `false` |
| 5 | Authorization | the same write with a non-member account → **403**; without any credential → **401**; the stored value stays `false` |
| 6 | Public read stays honest | anonymous `GET /api/events/:slug` → **200** with a body that does **not** carry `is_public` (0 occurrences) |
| 7 | Restoration and cleanup | the event was restored to public (`"is_public": true`), the uploaded media was deleted, the disposable event and the two disposable accounts were deleted, and the pre-existing rows of the database were left untouched |

Reviewed source: worktree `.mr7`, branch `feat/event-privacy-mr8a-activation`,
tip `bbe3bbf` (`docs(events): document the administrative activation of the
private event`). The product code under verification is `ba7c8fa`
(`feat(events): let the administration write the visibility of the event`) plus
`4fc466c` (`feat(admin): add the visibility switch to the event settings`);
`bbe3bbf` only touches `docs/api/*` and `docs/guides/MIGRATIONS.md`, so both
image build contexts of the tip are the reviewed source.

## Deviations from the given instructions (recorded, not worked around)

1. **The Compose files of the previous verification were gone.** `/tmp/mr7-docker`
   did not exist at the start of the run (`ls: cannot access '/tmp/mr7-docker/': No such file or directory`).
   They were recreated exactly as described in the instructions, inside the
   scratch `/tmp/mr8a-docker-scratch`: `compose.override.yml` (container names
   `milegame-mr3-manual-db` / `-api` / `-web`, the API mapping
   `127.0.0.1:8090:8080`, and the frontend build context pointing at
   `.../.mr7/frontend`) and `runtime.env` (mode `600`) with `DB_USER=user`,
   `DB_PASSWORD=mr3-disposable-local`, `DB_NAME=milegame`, the `JWT_SECRET` of
   the running container (read with
   `docker inspect milegame-mr3-manual-api --format '{{range .Config.Env}}{{println .}}{{end}}'`),
   `BACKEND_PORT=8080`, `FRONTEND_PORT=8083` and the CORS list. The scratch is
   left in place with the evidence of the run (112 KB).
2. **The database container was stopped when the run started**
   (`milegame-mr3-manual-db` reported `exited 255`), so the API was in a restart
   loop with `database not ready after 20 attempts`. It was started again with
   the same project and the same volume (`milegame-mr3-manual_postgres_data`);
   the stored password `mr3-disposable-local` kept working and the data of the
   previous verifications was intact.
3. **`PUT /api/admin/events/:slug/features` requires the `features` key.** The
   handler answers `400 {"error":"Invalid request: 'features' is required"}` for
   a body without it, so every body of this verification carries
   `"features":{"quiz":true,"corkboard":true}` next to `"is_public"`. The
   visibility field is what varies between the requests.
4. **`DELETE /api/admin/events/:slug/media` reads `type` from the query string.**
   A first attempt with the form field in the body answered
   `400 {"error":"Invalid type. Must be 'logo' or 'background'"}`; the same
   request as `?type=logo` answered **200**. This is the behaviour of the
   reviewed source, not a defect of the change under verification.
5. **Step 6 had to be read in two moments.** While the event is private, the
   anonymous `GET /api/events/:slug` is event content and answers **401**
   (`{"error":"Authentication required"}`), so it cannot show the public body.
   The check of the public body was therefore made after the event was restored
   to public: **200** and the body carries no `is_public` at all.
## Build, recreation and image identity

```sh
cd /home/tadashi/orca/workspaces/the-mile-game/security-for-for-public-views/.mr7
docker compose --env-file <runtime.env> -p milegame-mr3-manual \
  -f docker-compose.yml -f <compose.override.yml> build backend frontend
docker compose --env-file <runtime.env> -p milegame-mr3-manual \
  -f docker-compose.yml -f <compose.override.yml> \
  up -d --no-deps --force-recreate --wait --wait-timeout 180 backend frontend
```

Both commands exited 0. The api image was `sha256:70bccce7...` and the web image
`sha256:0bbf2931...`; the served web bundle carries the reviewed `is_public`
switch. Only the api and the web were recreated; the database container and the
volumes of the project were reused, and no other stack was touched.

## The requests that carried the evidence

| Request | Observed |
|---------|----------|
| `GET /api/admin/events/:slug` (owner) | 200, `"is_public": true` |
| `PUT /api/admin/events/:slug/features` with `"is_public": false` | 200, the administrative read then answers `"is_public": false` |
| `GET /api/events/:slug/quiz/questions` (anonymous) | 401 `{"error":"Authentication required"}` |
| `GET /uploads/logos/<file>` (anonymous) | 401, `Cache-Control: private, no-store` |
| `GET /api/events/:slug/quiz/questions` (owner Bearer) | 200 `{"questions":[]}` |
| `PUT .../features` with `"is_public": "yes"` | 400 `{"error":"Invalid request: 'is_public' must be a boolean"}`, the stored value stays false |
| `PUT .../features` without `is_public` | 200, the stored value stays false |
| `PUT .../features` (non-member) | 403 `{"error":"Not authorized. You are not the owner or a collaborator of this event"}` |
| `PUT .../features` (no credential) | 401 `{"error":"Missing authorization header"}`, the stored value stays false |
| `GET /api/events/:slug` (anonymous, public event) | 200, the body carries no `is_public` (0 occurrences) |
| `PUT .../features` with `"is_public": true` (restore) | 200 |
| `DELETE /api/admin/events/:slug/media?type=logo` | 200, the uploads folder of logos is empty |
| `DELETE /api/admin/events/:slug` | 200 `{"message":"Event deleted"}` |
| deletion of the two disposable accounts | 2 rows deleted |

## Final state of the disposable database

Six pre-existing events, all of them public, and ten pre-existing users were
left untouched. Every row created by this run was removed: the event, its two
accounts and its uploaded media. The scratch directory of the run (with the
runtime file that holds the `JWT_SECRET` of the disposable runtime and the
cookie jars) was removed by the parent after this evidence was collected.
