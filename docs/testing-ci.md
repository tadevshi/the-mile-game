# Test pipeline

The `Tests` workflow in `.github/workflows/tests.yml` runs on pull requests targeting
`main` and the issue #96 chain branches, pushes to `main`, and manual dispatch. It has read-only repository permissions
and cancels superseded runs on the same ref. Dependency installation uses the committed
npm lockfile and Go module checksums.

## Jobs

| Job | Checks | Isolation |
| --- | --- | --- |
| Frontend | `npm ci`, `npm test`, `npm run build` (TypeScript + Vite) | Fresh runner |
| Backend | `go mod download`, `go mod verify`, `go build ./...`, `go test -p 1 -count=1 -timeout=10m ./...` | PostgreSQL 15 service with disposable CI-only credentials |

The frontend build still runs after a unit test failure to expose independent build
errors. The job remains failed; there is no `continue-on-error` or failure suppression.

The backend job waits for PostgreSQL health, checks a real connection, and applies all
`backend/migrations/*.up.sql` files in filename order with `ON_ERROR_STOP`. This prepares
the disposable repository test database. The migration integration test separately
creates a database and exercises the application's migration runner. Packages run
serially because repository tests clean shared tables. Nothing connects to production.

There is **no automatic browser/E2E coverage**: the workflow no longer installs
Chromium, runs Playwright or uploads browser diagnostic artifacts. Only the automatic
browser job was removed; the Playwright suite, dependencies, configuration and npm
scripts remain available for manual use. Removing the job does not fix the suite or
provide green E2E proof. The last manual run is known failing (see evidence below).

Existing Playwright skips remain visible when the suite is run manually. Even a green
manual browser report would not prove a fully deployed backend flow: inspect each
test's network mocking and coverage before interpreting it as end-to-end application
coverage.

## Local commands

Use Node 26.2.0 or a compatible newer Node 26 patch (the frontend declares
`^26.2.0`; CI selects Node 26) and Go 1.26.10.
The module requires at least Go 1.26.0; the Docker builder and CI select the
1.26.10 patch toolchain. The backend runtime image is Alpine 3.24.3 with ffmpeg.
The production PostgreSQL major remains 15; this work does not upgrade stored data.

```bash
cd frontend
npm ci
npm test
npm run build
```

Optional manual browser checks (currently known failing, not part of CI):

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
# Optional interactive/debug modes:
npm run test:e2e:ui
npm run test:e2e:debug
```

For backend integration tests, supply a **disposable** PostgreSQL instance, not a
shared development or production database. Repository tests delete fixture tables;
the migration test also requires permission to create and drop its own database.
Set `TEST_DB_HOST`, `TEST_DB_PORT`, `TEST_DB_USER`, `TEST_DB_PASSWORD` and
`TEST_DB_NAME` to the disposable instance. Initialize it with the same migration
loop used by the workflow, then run:

```bash
cd backend
go mod verify
go build ./...
go test -p 1 -count=1 -timeout=10m ./...
```

## Draft delivery chain

Issue #96 uses a feature/tracker branch chain. Every PR remains draft/no-merge while
functional proof is incomplete: tracker -> main, Go -> tracker, frontend -> Go,
and CI -> frontend. The final CI child includes the complete dependency stack and
runs the workflow on its pull request. Review child diffs individually; merging any
branch is a separate human decision. Native code review has not been completed and
no approval is claimed.

## Dependency compatibility exception

Direct frontend dependencies were updated to their registry `latest` stable versions,
except TypeScript: the approved compiler is **6.0.3**, the newest stable release
satisfying typescript-eslint 8.72.0's `>=4.8.4 <6.1.0` peer range at verification time.
TypeScript 7.0.2 is intentionally deferred. Installation uses neither `--force` nor
`--legacy-peer-deps`. Lottie 3 uses named exports, `src`, and ready subscriptions;
the existing wrappers and their preservation tests were migrated accordingly.

## Verification baseline and limitations

Before dependency updates for issue #96, `npm test` returned exit 1: 269 tests passed
and 38 failed across five files. Those failures must not be attributed to upgrades
without a baseline comparison or hidden to obtain green CI. After correcting the
reproduced fixture/setup failures and adding compatibility checks, the worker reports
313/313 unit tests passing across 25 files, a successful production build and clean
`npm ci`/dependency-tree checks; the independent verifier reproduced the test/build
success. Lint remains failing: the worker observed 69 errors/six warnings, while the
verifier observed 65 errors/six warnings in `src` and 79 errors/ten warnings with
`eslint .` during the browser run. The broad command also includes generated
`dev-dist/` files; counts depend on generated artifacts. No baseline lint comparison
was performed and no lint rules were disabled. Findings are in unchanged files;
that does not prove they all predate the dependency upgrade. The workflow runs
frontend tests/build and backend checks, not browser tests or lint; this is not an
all-checks-green claim.

The last manual Playwright run exited **1**: **60 failed, 13 passed, 10 skipped** in
approximately 24 minutes. Failures included API 502 responses, missing elements and
timeouts. No browser baseline comparison exists, so causality is not established.
These failures remain unresolved. The automatic browser job was subsequently removed
with user confirmation; the retained manual suite is not green proof.

The migration integration test expectation was updated from schema version 10 to
13, matching the existing migration files. The migration package passed against
PostgreSQL in run 40231313102; this is runtime evidence, unlike the earlier short
local check that skipped live integration.

At initial setup the local Docker daemon was inaccessible to the agent, so local
container-backed verification was unavailable. Workflow configuration alone is not proof of a successful GitHub Actions run.

The first actual run, [40231313102](https://github.com/tadevshi/the-mile-game/actions/runs/40231313102),
failed overall. Frontend install/tests/build passed. PostgreSQL startup, schema
initialization, build and the migration/repository packages passed. Four worker
integration tests failed (upload success/retries/max-retries/expired-token refresh);
legacy test callbacks target `UploadFile`, while the current worker uses
`UploadFileMultipart`. Cleanup also reported a closed database. Playwright hit the
20-minute job timeout and was cancelled; diagnostic artifact upload was skipped.
No timeout rerun or suppression was performed. All four PRs remain draft.

After the confirmed manual-only browser decision, commit `30843c0` produced
[run 40234836367](https://github.com/tadevshi/the-mile-game/actions/runs/40234836367).
It contained exactly two jobs: frontend passed; backend failed in the same four
worker integration tests, with closed-database cleanup warnings. There was no
Playwright job. The next correction targets only the stale test callbacks and
cleanup lifetime, not production upload/retry behavior or lint. The tests-only
correction now updates all five processing callbacks to `UploadFileMultipart`,
checks upload content/filename/MIME/idempotency/parent routing and persisted outcomes,
and closes the fixture DB via `t.Cleanup` after per-test deferred cleanup. All original
tests/assertions are retained. Compile-only and DB-free checks passed, followed by
actual PostgreSQL-backed success in
[run 40235540978](https://github.com/tadevshi/the-mile-game/actions/runs/40235540978)
for commit `642802c`: both frontend and backend jobs passed. The worker package
passed in 10.456 seconds, and the retrieved log contained no closed-database warnings.
This is live integration evidence, not a claim based only on compilation.

During that tests-only correction, inspection also found a separate production
limitation: `DriveRepository.GetEventByPostcardID` loads only event ID and owner ID,
while `BackupWorker` uses the unloaded event slug as the event-folder name. This
correction must not encode an empty name as the intended contract. Checks of folder
parents/upload destinations do not prove event-folder naming correct; the missing
slug remains an explicit unresolved defect outside the tests-only change.
