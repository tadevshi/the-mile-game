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
| Browser | Chromium installation and `npm run test:e2e` | Playwright starts the Vite server; report/trace artifacts retained for seven days |

The frontend build still runs after a unit test failure to expose independent build
errors. The job remains failed; there is no `continue-on-error` or failure suppression.

The backend job waits for PostgreSQL health, checks a real connection, and applies all
`backend/migrations/*.up.sql` files in filename order with `ON_ERROR_STOP`. This prepares
the disposable repository test database. The migration integration test separately
creates a database and exercises the application's migration runner. Packages run
serially because repository tests clean shared tables. Nothing connects to production.

Existing Playwright skips remain visible in its report. Browser checks are not proof
of a fully deployed backend flow: inspect each test's network mocking and coverage
before interpreting a green report as end-to-end application coverage.

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
npx playwright install chromium
npm run test:e2e
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
tests/build/browser checks, not lint; this is not an all-checks-green claim.

The updated Playwright run exited **1**: **60 failed, 13 passed, 10 skipped** in
approximately 24 minutes. Failures included API 502 responses, missing elements and
timeouts. No browser baseline comparison exists, so causality is not established.
The browser job intentionally exposes these failures; it does not suppress them.

The migration integration test expectation was updated from schema version 10 to
13, matching the existing migration files. Its database-backed assertion still needs
an actual run; editing the expectation is not runtime proof.

At initial setup the local Docker daemon was inaccessible to the agent, so local
container-backed verification was unavailable. Workflow configuration alone is not
proof of a successful GitHub Actions run. Record actual run results and any remaining
failures when the implementation is published with human authorization.
