---
name: new-api-dev
description: >-
  Development workflow for this new-api / AIMOXT workspace (Go gateway +
  React frontend). Use for any in-repo development task: new features, bug
  fixes, code review, management API work, model channel adapters, relay
  forwarding, billing, quota, pre-consume/settlement/refund, payment
  webhooks, task plugins, user authentication and permissions, database
  model/migration changes, React/TypeScript frontend changes, i18n and SEO,
  and Docker/deployment troubleshooting. Load before planning or editing
  project code; it provides the preflight checklist, module map, topic
  router, verification steps, and AIMOXT customization protection.
---

# new-api-dev — Development Workflow

This skill routes development work in this workspace. The repo-root `AGENTS.md`
is always authoritative; read it in full with the file-read tool before any
planning, coding, or review (not a grep or skim). If the task touches
`web/`, also read `web/AGENTS.md`. This skill adds what `AGENTS.md` does not:
where things are, which document to read per topic, and how to verify results.

## Ground Rules

1. Priority: **actual code in the current workspace** > `.agents/notes/new-api-analysis.md` > this skill or its references > memory or conversation summaries.
2. `.agents/notes/new-api-analysis.md` is a **point-in-time reference snapshot** (generated 2026-10-15 from source verification). It is background, not authority. Verify every file, function, route, and config key against current code before modifying anything.
3. Never invent files, routes, functions, DTO fields, or config items. If a fact cannot be verified in the workspace, explicitly mark it **unverified**.
4. Never describe a test, build, or check as passed unless you actually ran it in this session and observed the result.
5. Minimal-change discipline: edit only what the task requires; no drive-by refactors, formatting, or unrelated cleanups.
6. Protected project information (the `new-api` project name/identity and `QuantumNous` attribution, including the Go module path `github.com/QuantumNous/new-api`) MUST NOT be modified, renamed, or removed under any circumstance.

## Preflight Checklist (every task, before editing)

1. Read `AGENTS.md` in full with the file-read tool.
2. Run `git status --short` and note the user's uncommitted changes. Never revert, overwrite, or stage them.
3. Classify the task and consult the **Topic Router** below; read only the listed documents.
4. Locate the real code: use the **Module Map** plus targeted searches (function name, route string, struct field, handler name) to trace the actual call chain. Read the actual functions and data structures you plan to touch.
5. State the task scope and acceptance criteria (implicitly or in your plan) before editing.
6. Read only what the task touches. Do not bulk-read the repo or the whole analysis document every time.

## Topic Router (read on demand)

| Task topic | Authoritative material to read first |
| --- | --- |
| Any billing-gate trigger (as defined in `AGENTS.md` "Billing rules (mandatory read gate)") | `.agents/rules/billing.md` — full file, mandatory before planning/coding/review |
| Tiered/dynamic (expression) billing | `pkg/billingexpr/expr.md` — full file, per `.agents/rules/billing.md` |
| JS task plugins (write/modify/review) | `docs/plugin-api/v1.md` (+ `v1.schema.json` / `v1.d.ts` when the contract changes) |
| Architecture / where things are | `.agents/notes/new-api-analysis.md` — read only the relevant sections (it is sectioned; §3–§8 are the technical parts). Snapshot, verify against code |
| AIMOXT landing / SEO / branding / fork-specific files | `references/aimoxt-customization.md` (this skill) |
| Frontend UI components | `web/AGENTS.md` + the `shadcn-ui` skill; search `web/src/components/` first, reuse before creating |
| Frontend i18n / locale files | the `i18n-translate` skill (locale writes go through its script, never direct JSON edits) |
| React performance / refactors | the `vercel-react-best-practices` skill (read only the matching section of its reference) |
| API surface reference | `docs/openapi/api.json` (management) and `docs/openapi/relay.json` (relay) |
| Authentication security (OWASP) | The OWASP ASVS and Cheat Sheet links in `AGENTS.md`, plus the actual auth code paths |
| Deployment / Docker | `Dockerfile`, `docker-compose.yml`, `makefile` — read the actual files, not assumptions |

## Module Map (starting points — verify before relying on any entry)

| Area | Key locations |
| --- | --- |
| Entry | `main.go` (embeds `web/dist`; `new-api plugin` CLI) |
| Management API routes | `router/api-router.go`, `router/channel-router.go`, `router/task-router.go`, `router/authz-router.go` |
| Relay protocol routes | `router/relay-router.go` |
| Auth / middleware | `middleware/` (`auth.go`, `distributor.go`, rate limiters, `secure_verification.go`) |
| Handlers | `controller/` |
| Business logic | `service/` (channel select, quota, billing settlement, task polling, `authz/` Casbin, `passkey/`) |
| Data models / migrations | `model/` (`main.go`, `migration_dialector.go`, `locking.go`) |
| Upstream adapters | `relay/channel/<provider>/` (interface in `relay/channel/adapter.go`); core state in `relay/common/relay_info.go` |
| Protocol DTOs / conversion (independent Go module) | `relaykit/dto/`, `relaykit/relayconvert/` |
| Billing expression engine | `pkg/billingexpr/`; settings in `setting/billing_setting/` |
| JS task plugin runtime | `pkg/jsplugin/`; plugins in `plugins/tasks/` |
| Config domains | `setting/` (billing, ratio, payment providers, system, console) |
| Frontend | `web/src/routes/` (TanStack file routing), `web/src/features/` (28 domains), `web/src/components/` |
| AIMOXT brand / SEO | `web/src/lib/site-seo.ts`, `web/site.config.json`, `web/src/features/home/` — see reference file |
| Tests | Co-located `*_test.go` (Go, testify); `web/src/**/__tests__/` and `*.test.tsx` (vitest) |

## Minimal-Change Discipline

- One concern per edit; keep diffs focused on the task.
- Reuse existing helpers, adapters, and registration mechanisms before adding new symbols.
- Follow the Go style conventions in `AGENTS.md` (`common.Marshal/Unmarshal` for JSON, `any`, modern range/min/max, no raw `encoding/json` in the root module).
- Do not introduce new abstractions to fix local problems; do not add helpers for single callers without a stable business concept.
- Never silence a failing check by narrowing its scope (e.g., skipping a DB dialect or a locale) — fix it or report the gap.

## Billing / Quota / Payment Checklist

Applies to quota, pricing, pre-consume, settlement, refund, payment webhooks, and async task billing:

1. If the `AGENTS.md` billing gate triggers, read `.agents/rules/billing.md` in full first — no exceptions.
2. Verify the actual chain in code: validation → estimate/`OtherRatios` → quota conversion (`common/quota_math.go`) → pre-consume → settle → refund. Do **not** assume billing is executed by a middleware; in the relay path it is done in relay controllers via `RelayInfo` — confirm this for the specific path you are touching.
3. Check abnormal paths: stream interruption, client abort, timeout, duplicate/retried requests, and goroutine exit without settle — what happens to the reserved quota?
4. Check refund and balance restoration for failure paths, and concurrency around wallet/quota updates (transactions, `lockForUpdate(tx)` where row locks are needed).
5. Never change actual billing behavior by only changing frontend-displayed prices.
6. Add or extend deterministic tests for at least the happy path and one failure path when the change alters billing math or settlement flow (see the existing test styles referenced in `.agents/rules/billing.md`).

## API / Relay / Channel Checklist

1. Verify the actual route registration in `router/` before assuming any endpoint, method, or middleware order.
2. Check the middleware chain for the affected group (relay: registration order in `router/relay-router.go`; management: auth in `middleware/auth.go` + Casbin `RequirePermission`).
3. For a new channel/provider: implement against the adapter interface in `relay/channel/adapter.go`, follow an existing simple adapter as the pattern, and register it the same way its siblings are registered. Check whether the provider supports `StreamOptions` (see `AGENTS.md`).
4. Check both streaming and non-streaming response paths, error mapping (`relaykit/reasonmap/`), timeouts/retries, and the usage → billing data handoff.
5. In upstream request DTOs re-marshaled to providers, optional scalar fields must be pointer types with `omitempty`; explicit zero values must survive the round-trip.
6. Distinguish **channel adapters** (Go, `relay/channel/`) from **JS task plugins** (`plugins/tasks/`); different contracts, different review gates.
7. `relaykit/` is an independent module: it must never import the root module, and any change to it must be verified with `cd relaykit && GOWORK=off go build ./...`.

## Database Checklist

1. Read the actual GORM models, the migration mechanism (`model/main.go`, `model/migration_dialector.go`), and how row locks are acquired (`model/locking.go`) before changing data logic.
2. Every change must work on SQLite, MySQL ≥ 5.7.8, and PostgreSQL ≥ 9.6 (the log DB may also be ClickHouse). Use `common.UsingMainDatabase` / `common.UsingLogDatabase` branches for dialect-specific SQL; use `commonGroupCol` / `commonKeyCol` / `commonTrueVal` / `commonFalseVal` for reserved words and booleans.
3. Check transactions, row/gap locking semantics, index impact, and backward compatibility of existing data.
4. If you cannot actually run all three databases, mark the untested dialects **unverified** explicitly; do not claim compatibility.

## Frontend Checklist

1. Read `web/AGENTS.md`; check `web/package.json` for the actual scripts (`dev`, `build`, `typecheck`, `lint`, `test`, `i18n:sync`).
2. Search existing components and routes before creating anything; the `shadcn-ui` skill and the reuse-first rules in `AGENTS.md` apply.
3. All user-visible text goes through `t('English key')` with `useTranslation()`; use the `i18n-translate` skill workflow for any locale change.
4. Use `@/lib/format` / `@/lib/currency` for numbers and money; interface language codes must pass through `toIntlLocale` before any `Intl.*` usage.
5. Use `bun` for all frontend commands, run from `web/`.
6. Report `typecheck` / `lint` / `build` results only from commands you actually ran.
7. AIMOXT customization files are local fork work — see `references/aimoxt-customization.md`; do not overwrite or drop them in unrelated changes.

## Verification (before declaring a task done)

1. `git diff --stat` then review the full `git diff`: every changed file must be in scope; confirm no unrelated files, no stray formatting churn, and no interference with the user's pre-existing edits.
2. Run the checks applicable to what you touched:
   - Go (repo root): `go build ./...`; `go test ./<affected-packages>/...` (or `make test` for broad backend work); `gofmt -l` on changed files.
   - `relaykit/` touched: `cd relaykit && GOWORK=off go build ./...`
   - `web/` touched: `bun run typecheck`, `bun run lint`, `bun run test`, and `bun run build` when the change can affect the production bundle.
   - `plugins/tasks/` touched: also `bun run lint:plugins` / `bun run format:plugins:check` (from `web/`), and re-check `docs/plugin-api/v1.md` conventions.
3. Record every command actually executed and its observed result.
4. The final report must include: changed files, behavior changes, items **verified** vs **unverified** vs **failed**, and leftover issues.

## Unverified-Information Policy

- Facts taken from the analysis snapshot, this skill, memory, or the conversation are **provisional** until confirmed against current code.
- In plans and reports, tag such facts with "unverified" when they have not been confirmed this session.
- If verification is impossible (missing tool, missing service, missing database), say so explicitly and stop short of claiming completion.
