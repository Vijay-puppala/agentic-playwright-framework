# Project Context

Handoff state for the next coding agent. Last updated 2026-09-28. Read this with `AGENTS.md` (the working loop: read first, update last), `CLAUDE.md` (the rules), `DECISIONS.md` (why things are the way they are) and `TODO.md` (what's next).

## What this repo is
A Playwright + TypeScript end-to-end test suite for the **public OrangeHRM demo** (https://opensource-demo.orangehrmlive.com). There's no application code here, only tests. The demo is shared with the public, slow, and sometimes down.

- **Remote:** https://github.com/Vijay-puppala/agentic-playwright-framework (`gh` is logged in as `Vijay-puppala`).
- **Owner's rules:** `CLAUDE.md` §1–§9. §10 says where the repo differs from those rules; §11 has the commands; §12 describes the agent workflow.

## Git / PR state
| Branch | Head | Notes |
|---|---|---|
| `main` | `5a9bd6d` | Initial suite: login and logout specs, page objects, config. Pushed. |
| `001-add-admin-ess-users` | see `git log` | 7 commits on top of `main`. Pushed. |

Feature branch commits, oldest first:
1. `d278b12` build(deps): add @faker-js/faker
2. `660737f` test(admin): add Admin and ESS user creation e2e
3. `1a2244f` ci: add Playwright workflow on ubuntu-latest, headless
4. `08036f3` ci: run the full suite on every trigger regardless of tags
5. `2ff33d1` fix(agents): correct ci-cd agent guidance on secrets, workers and git state
6. `80a40d7` docs: add README
7. docs: add AGENTS.md and the persistent context files. This adds AGENTS.md, PROJECT_CONTEXT.md, TODO.md, DECISIONS.md and CLAUDE.md §13, adds handoff-file steps to all 5 agents and `/pipeline`, and adds the README's "Project memory" section. Run `git log -1` for the hash.

**PR #1** (feature branch → `main`) is **open and not merged**: https://github.com/Vijay-puppala/agentic-playwright-framework/pull/1
- CI run 36434099819 **passed** on commit 6 (`80a40d7`): 14/14 tests in 1.3 min, 1m57s for the whole job, on Node 20.20.2. Commit 7 changes only docs and agent instructions, and starts a new CI run. Check it with `gh pr checks 1`.

## Stack (actual)
- **Playwright:** `@playwright/test` `^1.55` (1.63 installed), Chromium is the only project.
- **Language:** TypeScript strict, CommonJS. `npm run typecheck` (`tsc --noEmit`) is the only static check; there's no linter or formatter.
- **Package manager:** npm with `package-lock.json`. CLAUDE.md says pnpm, but that isn't in use.
- **Node:** 26.8.2 locally; CI pins 20 (it resolved to 20.20.2). Faker v10 is ESM-only and needs Node ≥20.19 or ≥22.12.
- **Libraries:** `@faker-js/faker` 10.6, `dotenv`, `allure-playwright` 3.x, and the `allure` 3.19 CLI (Node-based; the machine only has Java 1.8, so Allure 2 won't work).

## Layout
```
playwright.config.ts        testDir tests/e2e; workers 1; retries CI?2:1; timeouts 180s test / 30s expect / 120s nav / 15s action
tests/
  e2e/auth/login.spec.ts    10 tests (2 @smoke, 1 also @critical; the rest untagged)
  e2e/auth/logout.spec.ts   2 tests (1 @smoke)
  e2e/admin/add-user.spec.ts 2 tests @regression (Admin, ESS), generated from a ROLES loop
  pages/                    BasePage, LoginPage, DashboardPage, AddUserPage, SystemUsersPage
  fixtures/pages.fixture.ts page fixtures + loggedInDashboard, testEmployee, newUser (with teardown)
  api/orangehrm.api.ts      REST helpers for setup and cleanup (create employee; find/delete user and employee)
  data/user.factory.ts      faker builders: buildEmployee(), buildSystemUser(role)
  utils/env.ts              BASE_URL, ADMIN_CREDENTIALS, ROUTES, API_BASE
  utils/test-data.ts        fixed strings (MESSAGES) and data-driven login cases
  utils/helpers.ts
specs/001-add-admin-ess-users/  Spec Kit artifacts: spec, plan, research, data-model, contracts, quickstart, tasks (T001–T020 all [X])
.specify/                   Spec Kit 1.0.13.dev0 scaffold (PowerShell scripts); feature.json is git-ignored
.claude/agents/             planner, reviewer, implementer, e2e-runner, ci-cd
.claude/commands/pipeline.md  /pipeline orchestrator
.claude/skills/speckit-*    Spec Kit skills
.github/workflows/playwright.yml  CI
.work/                      agent handoff files (git-ignored, currently empty)
AGENTS.md                   working loop for any coding agent; PROJECT_CONTEXT.md / TODO.md / DECISIONS.md are the repo's memory
```

## How the tests work
- **Specs import `test` and `expect` from `tests/fixtures/pages.fixture.ts`,** never from `@playwright/test` directly.
- **Fixture side effects:**
  - `loginPage` navigates to login and waits for the form.
  - `loggedInDashboard` logs in as admin through the UI.
- **`testEmployee`** (depends on `loggedInDashboard`):
  - builds a faker employee and attaches it as `generated-employee` *before* the API call;
  - creates the employee with `POST pim/employees` through `page.request`, which shares the session cookie;
  - teardown deletes it.
- **`newUser(role)`** is a factory fixture that depends on `testEmployee`:
  - it builds the credentials and records them synchronously as a `generated-user` attachment using `testInfo.attachments.push`;
  - teardown finds the user by username and deletes it.
- **Cleanup never throws.** Errors become `cleanup-warning` annotations, and a 404 on delete counts as success.
- **Generated data:**
  - Names are letters only; the last name ends with a unique suffix.
  - Usernames are lower-case alphanumeric, ≤12 characters, plus a unique suffix.
  - Passwords are 12 characters with at least one upper-case letter, one lower-case letter and one digit.
- **App rules the data must meet:** usernames need at least 5 characters and must be unique ("Already exists"); passwords need at least 7 characters and at least 1 number.
- **REST API** (base `/web/index.php/api/v2`):
  - `POST pim/employees`
  - `GET admin/users?username=`
  - `GET pim/employees?nameOrId=`
  - `DELETE admin/users` with `{ids}`
  - `DELETE pim/employees` with `{ids}`
- **`FORCE_FAIL_BEFORE_SAVE=1`** makes the add-user tests fail on purpose before saving. Use it to check that cleanup runs after a failure.

## Reports
- **Reporters:** `html` (`playwright-report/`), `json` (`test-results/results.json`), `allure-playwright` (`allure-results/`), and `github` in CI or `list` locally.
- **Never pass `--reporter` on the CLI.** It replaces all of these reporters.
- **Clear `allure-results/`** before a run; results pile up across runs.
- **Allure:** `npm run allure:generate && npm run allure:open`.

## CI (`.github/workflows/playwright.yml`)
- **Triggers:** `pull_request`, push to `main`, `workflow_dispatch`. Concurrency cancels in-progress runs for the same ref.
- **Runner:** `ubuntu-latest`, headless, `CI: true`, 60-minute timeout, no secrets.
- **Steps:**
  1. checkout
  2. setup-node 20 with npm cache
  3. `npm ci`
  4. install Chromium with its system dependencies
  5. typecheck
  6. `npx playwright test --project=chromium` (the full suite, no grep)
  7. generate Allure
  8. upload `playwright-report/`, `allure-report/` and `test-results/` (kept 14 days)

  Steps 7 and 8 run whenever the job isn't cancelled.

## Agent workflow
- **Five subagents** in `.claude/agents/` hand work to each other through `.work/<slug>/`: plan.md → review.md → impl.md → run.md → ci.md.
- **`/pipeline <task>`** runs them in order:
  1. planner, then reviewer (at most 2 revision rounds);
  2. **user approval**;
  3. implementer;
  4. e2e-runner (one fix round for a real test bug; stops if the site is down);
  5. ci-cd, only if the plan says `ci-impact: yes`.
- **Options:** `--only <stage>` runs one stage and `--from <stage>` resumes from one. The pipeline never commits.
- **Handoff files (D14):** every agent reads `PROJECT_CONTEXT.md`, `TODO.md` and `DECISIONS.md`.
  - The planner proposes **Decisions** and **TODO updates** in `plan.md`, and the reviewer blocks plans that contradict a recorded decision.
  - The implementer and `ci-cd` write to `DECISIONS.md` and `TODO.md`.
  - The e2e-runner reports **New problems** in `run.md`.
  - The orchestrator's step 7 updates `PROJECT_CONTEXT.md` and records the new problems.
- **Subagents can't start other subagents,** which is why the orchestrator is a slash command.
- **Feature 001 was not built this way.** It was built with `/speckit-implement`; the pipeline itself hasn't been run end to end yet.

## Verified results (2026-09-28)
- **Add-user spec:** 20/20 passes locally over `--repeat-each=10`, with 0 leftover users or employees (checked through the API) and 0 cleanup warnings.
- **Forced failure** (`FORCE_FAIL_BEFORE_SAVE=1`): data was still cleaned up.
- **Full suite:** 14/14 locally and 14/14 in CI. Typecheck is clean.
