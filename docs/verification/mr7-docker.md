# MR7 — Manual Docker verification of the media delivery

## Result

The manual verification of the MR7 media protection passed on the reviewed source
with real HTTP against the isolated Compose stack `milegame-mr3-manual`. The
run covered the six requested checks: the health of the stack, the media of a
public event for an anonymous client, the media of a private event for an
anonymous client, for its owner (with the cookie and with the Bearer token) and
for an account that is not a member, the attributes of the media session cookie,
the served service worker and the restoration of the disposable fixture.

Reviewed source: `eedb3d3` (`fix(frontend): keep the media out of the static
asset cache`). The clean committed HEAD of the branch was `586c674`, one
documentation-only commit later; `git diff --stat eedb3d3..HEAD` showed a single
added line in `odd/tasks/event-privacy-mr7b.md`, so the product code and both
image build contexts were identical to `eedb3d3`. The discrepancy is recorded
here instead of claiming that HEAD was literally `eedb3d3`.

## Build, recreation and image identity

```sh
cd /home/tadashi/orca/workspaces/the-mile-game/security-for-for-public-views/.mr7
docker compose --env-file /tmp/mr7-docker/runtime.env -p milegame-mr3-manual \
  -f docker-compose.yml -f /tmp/mr7-docker/compose.override.yml build backend frontend
docker compose --env-file /tmp/mr7-docker/runtime.env -p milegame-mr3-manual \
  -f docker-compose.yml -f /tmp/mr7-docker/compose.override.yml \
  up -d --no-deps --force-recreate --wait --wait-timeout 180 backend frontend
```

Both commands exited 0. Only the API and the web were recreated; the database
container and the volumes of the project were reused, and no other stack was
touched. The images were built directly from the worktree (the committed
`frontend/.dockerignore` was loaded, `COPY . .` completed and `npm run build`
succeeded). Both containers reported **healthy** before the probes.

```text
/milegame-mr3-manual-api image=sha256:19cd559ad8d56d488d6cb1a748e338d93102d172b941c36ba70067c2d22f80f5 health=healthy
/milegame-mr3-manual-web image=sha256:aa1d074b61b24be4a8d5cb1d24c9bbd2191a4347f0625a0f7cc0ae93899edee5 health=healthy
```

## Observed results

All the requests were plain `curl` calls without a browser and without an
`Origin` header. The 19 requests of the six checks answered the expected
status.

| Check | Request | Observed |
|-------|---------|----------|
| Health | `GET http://127.0.0.1:8083/` | 200 |
| Health | `GET http://127.0.0.1:8090/health` | 200, `application/json` |
| Public media | `GET http://127.0.0.1:8083/uploads/postcards/<file>` | 200, the exact 68-byte PNG, `Content-Type: image/png`, `X-Content-Type-Options: nosniff`, `Cache-Control: public, max-age=2592000` |
| Public media | the same path through the API origin | 200, the same bytes and headers |
| Private media | the same path without credentials | 401, `Cache-Control: private, no-store` |
| Private media | the same path with the owner cookie | 200, the bytes, `Cache-Control: private, no-store` |
| Private media | the same path with the owner Bearer token | 200, the bytes, `Cache-Control: private, no-store` |
| Private media | the same path with a non-member cookie | 403, `private, no-store` |
| Private media | the same path with a non-member Bearer token | 403, `private, no-store` |
| Cookie | `POST /api/auth/login` | `Set-Cookie: eventhub_media_session=<token>; Path=/uploads; Max-Age=900; HttpOnly; SameSite=Lax`, no `Domain` |
| Cookie | `curl` with the cookie jar on the media request | the cookie is sent |
| Cookie | `curl` with the cookie jar on `/` and on `/api/...` | the cookie is not sent |
| Service worker | `GET http://127.0.0.1:8083/sw.js` | 200; the `/uploads/*` `NetworkOnly` route is registered before the `static-assets` `CacheFirst` route, whose pattern excludes `/uploads/` |

The service worker check asserted the served code, not the source: the index of
the `registerRoute(/\/uploads/` call is the first registered route, the
`static-assets` pattern carries the `(?!.*\/uploads\/)` exclusion, the exclusion
does not match `/uploads/postcards/example.png` and it still matches
`/assets/example.png`.

## Disposable fixtures and restoration

The fixture used a disposable account, a disposable event
(`mr7-eed-c88a0cc33da3`, id `59b1b0c4-7f6f-4efa-a70f-e3a17b36964a`) and a 68
byte PNG uploaded through `POST /api/events/:slug/postcards`.

```sh
docker exec milegame-mr3-manual-db psql -U user -d milegame -v ON_ERROR_STOP=1 \
  -c "UPDATE events SET is_public = FALSE WHERE id = '59b1b0c4-7f6f-4efa-a70f-e3a17b36964a'::uuid AND slug = 'mr7-eed-c88a0cc33da3' RETURNING id, slug, is_public;"
docker exec milegame-mr3-manual-db psql -U user -d milegame -v ON_ERROR_STOP=1 \
  -c "UPDATE events SET is_public = TRUE WHERE id = '59b1b0c4-7f6f-4efa-a70f-e3a17b36964a'::uuid RETURNING id, slug, is_public;"
```

Both commands exited 0 (`UPDATE 1`). After the restoration an anonymous request
for the image answered 200 with the public cache rule. The three disposable
events that the verification attempts introduced remain in the disposable
database, all of them public; their identifiers are listed in the session record
of the verification. No fixture outside the disposable database was touched.

## Limitations

No browser behavior was exercised: the `Secure` attribute over HTTPS, the
upgrade lifecycle of an old service worker and a live replay of the service
worker cache were not tested. The HTTP cache headers of the served `/sw.js`
were observed but the deployment invalidation was not evaluated. The scratch
directory of the verification (with the test cookie jars) was removed by the
parent after this evidence was collected.

## Attempt history (condensed)

| # | Target | Outcome | Cause |
|---|--------|---------|-------|
| 1 | `ef3ce91` | The frontend image build failed at `frontend/Dockerfile:13` (`COPY . .`): `cannot replace to directory .../app/node_modules with file`. No container was recreated. | A local `frontend/node_modules` symlink of the parent was inside the build context. The parent removed it and the committed `frontend/.dockerignore` now excludes `node_modules` and `dist`. |
| 2 | `3689d86` | Both images built, but the API never became healthy (`password authentication failed for user user`, 20 retries) and the web container stayed `Created`. | The recreate passed the default `DB_PASSWORD` instead of the one of the database container (`mr3-disposable-local`). The parent prepared `/tmp/mr7-docker/runtime.env` with the preserved API environment and the corrected database connection. |
| 3 | `8ed85ec` | The stack was healthy and the media checks passed, but the served service worker still cached the uploaded PNGs: the `static-assets` `CacheFirst` rule matched before the `/uploads/*` `NetworkOnly` rule. | A real defect of the unit: workbox applies the first matching rule. Fixed in `eedb3d3` by moving the media rule first and excluding `/uploads/` from the static assets rule. |
| 4 | `eedb3d3` | All six checks passed. This is the run documented above. | — |
