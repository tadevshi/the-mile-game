# Dependency updates and test CI
Issue: https://github.com/tadevshi/the-mile-game/issues/96
Branch: chore/issue-96-dependencies-test-ci. Preserve unrelated dirty files.

## Specs
S1. "ayuamea  actualizar las dependencias del proyecto a la version mas actualizada, y crear un pipeline que corra los test en github. Comienza creando en github una issue para estos cambios"
S2. "perfecto, ahora sigamos adelante con la ejecucion"
S3. "Usar el último TypeScript compatible (recomendado)"
S4. "Cadena con rama de integración (recomendado)"
S5. "Sí: push, PR y aprobar issue #96"

Implementation interpretation: latest stable frontend and Go module releases, including compatibility adaptations; reproducible frontend tests/build and backend integration tests on GitHub Actions PR/main events. Preserve behavior and expose failures. Do not change production PostgreSQL major or credentials. Issue #96 records acceptance criteria. User now authorizes push and PR creation using the existing GitHub session, plus status:approved on issue96. No merge authorized. All PRs remain draft while failed or unavailable proof is unresolved.

## Tasks
T1 | S1-S3 | frontend upgrades implemented; unit313/313 and build green; lint69errors/6warnings unresolved; independent review pending | worker | commit: pending
T2 | S1-S2 | Go upgrades implemented; build/unit/mod checks green, independent backend review finds no defects; DB/Docker proof unavailable | worker | commit: pending
T3 | S1-S2 | GitHub Actions tests with isolated PostgreSQL, CI documentation | inline after workers | commit: pending
T4 | S1-S2 | independent verification of dependency/CI changes (Risk item 5), native assessment/review as required | verifier | commit: pending

## Log
L1. Original request: "ayuamea  actualizar las dependencias del proyecto a la version mas actualizada, y crear un pipeline que corra los test en github. Comienza creando en github una issue para estos cambios"
L2. Execution authorization: "perfecto, ahora sigamos adelante con la ejecucion"
L3. Issue #96 created and read back. No matching templates or duplicate search results were found. Labels: frontend/backend/architecture.
L4. Baseline frontend npm test exit 1: 24 files, 19 passed/5 failed; 307 tests, 269 passed/38 failed. No upgrades applied yet. npm outdated exit 1 indicates available upgrades (including TypeScript 7, Vite 8, Vitest 5, ESLint 10); versions require peer/engine checks.
L5. Docker daemon permission denied; postgres/initdb/pg_ctl not on PATH, only psql. Database integration and actual GitHub run proof may require an explicit human decision if unavailable locally. RDD globally enabled. Risk item 5 (dependencies/CI/environment).
L6. Protected dirty paths: .atl/.skill-registry.cache.json, .atl/skill-registry.md, .codegraph/, and the added ParseMultipartForm line in backend/internal/handlers/admin_event_handlers.go.
L7. Forecast: approximately 250-400 authored lines excluding generated lockfiles, subject to compatibility fixes. Delivery strategy ask-on-risk; no push/PR authorization for this feature yet. Track actual counts before commits.
L8. Frontend worker reproduced all 38 failures and inspected latest package engines/peers; TypeScript 7.0.2 conflicts with typescript-eslint 8.72.0 (<6.1). User selected: "Usar el último TypeScript compatible (recomendado)"; resolve newest stable compatible compiler, update other packages to latest stable without --force or --legacy-peer-deps, document exception.
L10. Go worker returned partial: direct dependencies latest stable, Go min 1.26.0/toolchain1.26.10 and Docker tags verified upstream. go mod tidy/verify/build, CGO-disabled Linux build and handler/middleware/service/websocket tests exit0. Full test exit1 because database unavailable; migration and seven worker DB tests skipped. No Docker build proof. Independent backend/CI verifier running.
L11. CI Go pinned to 1.26.10; service credentials aligned to worker tests' hardcoded user/password/milegame_test to avoid silent worker skips. Existing migration integration expectation updated 10->13 to match existing files; no DB RED/GREEN evidence possible locally, must verify in isolated DB. Full feature remains incomplete.
L12. ASSESS escalated item5 returns independentVerifier required; native assessment unavailable due intended-untracked declaration. No review authority started. First actionlint exit0; shellcheck unavailable.
L13. After migration assertion edit: `cd backend && go test -short -count=1 ./internal/migrations` exit0. This compiles/runs unit checks but deliberately skips live PostgreSQL and does not prove schema migration behavior. README Go version references aligned.
L9. Pipeline draft and docs/testing-ci.md added. Action latest releases queried: checkout v7.0.1, setup-node v7.1.0, setup-go v7.0.0, upload-artifact v7.0.2. Local shellcheck unavailable. Structural check: `go run github.com/rhysd/actionlint/cmd/actionlint@latest -shellcheck='' .github/workflows/tests.yml` exit 0 (actionlint v1.7.12, auto-downloaded Go toolchain 1.26.10). This is YAML/Actions validation, not runtime CI proof. README links the CI guide.
L14. Frontend worker returned partial: direct dependencies latest stable except approved TypeScript6.0.3; Node26.2.0; npm ci/tree clean (no peer overrides), npm test313/31325files, npm run build exit0. Existing38 failures corrected in setup/fixtures; six preservation tests added. Lottie3 wrappers migrated with observed3-test RED then GREEN. npm lint exit1:69errors6warnings, no baseline lint comparison. No tests removed/skipped; no rules weakened. Independent frontend verifier and Playwright run are active.
L15. Backend/CI independent verifier: module verify/tidy/build exit0, unit packages pass; full suite fails repository connections with no DB. actionlint and bash-n script exit0. No concrete backend/CI defects found. Live DB, Docker build and GitHub run proof explicitly unavailable. Verifier's suggested duplicate schema-version guard not added (existing integration assertion is sufficient; avoid redundant ceremony).
L16. Authored diff exceeds original400-line forecast (approx470 tracked lines plus workflow/docs/new test/task file); delivery strategy choice needed before next commit. No publish/PR yet authorized. Memory provider unavailable; task file authoritative.
L18. User selected feature-branch-chain and authorized push/PR/status:approved for issue96. Default branch main confirmed. Plan: tracker chore/issue-96-dependencies-test-ci -> main (draft/no-merge); Go child -> tracker; frontend child -> Go; CI child -> frontend. One cohesive frontend slice may exceed400 authored lines; no artificial splitting/tests omitted. Actual commits/PR links to be recorded in final child doc.
L19. Playwright run exit1 after24m:60failed,13passed,10skipped; observed502 API responses and locator/timeout failures. No baseline browser run, so causality unknown. Do not retry/hide failures. Publish only draft chain for inspection; actual Actions proof and subsequent fix-vs-defer decision outstanding. Native review not yet started: implementation is partial and functional blockers remain; no completion/approval claim.
L17. Independent frontend verifier: npm dependency tree consistent,313/313 tests25files,build,and3 Lottie tests exit0. Real installed Lottie3 API supports wrappers. No weakened tests or concrete frontend defects. Lint differs from worker: eslint src65errors6warnings, eslint .79errors10warnings (generated dev-dist influences count). Findings in unchanged files; causal baseline unknown. Docs corrected to disclose this. Docker/GitHub/Playwright runtime proof pending.
