# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 1. Stack
- Framework: Playwright 1.49+
- Test runner: @playwright/test
- Lang: TypeScript strict
- Node: 20.x · pnpm

## 2. Folder layout
- tests/e2e/        · browser specs
- tests/api/        · APIRequestContext
- tests/fixtures/   · shared fixtures
- tests/pom/        · page objects
- tests/data/       · faker builders

## 3. Locators — STRICT
- Prefer getByRole, getByLabel, getByTestId.
- Never raw .locator('xpath=…').
- Brittle CSS must include a "// why" comment.

## 4. Waits
- No page.waitForTimeout.
- Use auto-wait + expect.poll only.
- Retry once, then quarantine.

## 5. Data
- Generate with @faker-js/faker.
- Never hard-code emails / phones / addresses.
- Test users: env-based, not committed.

## 6. Tagging
- @smoke @regression @flaky @wip
- CI runs @smoke on every PR.

## 7. Reporting
- HTML + JSON reporter on CI.
- Attach trace + screenshot on retry.

## 8. Commits
- Conventional Commits.
- No co-author trailers.
- No "🤖 Generated with…" footers.

## 9. Do / Don't
- DO: ask before deleting any spec.
- DO: run the impacted spec after every edit.
- DON'T: edit playwright.config without a plan.
- DON'T: bump deps without a separate PR.

## 10. Current repo state vs. these rules
The rules above are the target. Until the repo catches up, follow the rules but use the repo's real tools and paths:
- **Package manager:** npm (`package-lock.json`), not pnpm.
- **Page objects:** `tests/pages/`, not `tests/pom/`.
- **Folders:** `tests/api/` holds REST helpers for test setup and cleanup (`orangehrm.api.ts`, called with the logged-in `page.request`). `tests/data/` holds faker builders (`user.factory.ts`). Fixed strings and data-driven cases stay in `tests/utils/test-data.ts`.
- **Faker:** `@faker-js/faker` v10 is installed. It ships only as an ES module, and this CommonJS project can load it only on Node 20.19+ or 22.12+, so CI must use at least Node 20.19.
- **Node:** the local machine runs Node 26, not 20.x. CI pins 20.
- **Tags:** `@smoke`, `@critical` and `@regression` are in use (`@flaky` and `@wip` aren't yet).
- **Test data cleanup:** tests that create records on the shared demo must delete them in fixture teardown. See `testEmployee` and `newUser` in `tests/fixtures/pages.fixture.ts`: failures become `cleanup-warning` annotations and are never thrown.

## 11. Commands & demo-site notes
The target is the public OrangeHRM demo (https://opensource-demo.orangehrmlive.com). This repo has no application code, only tests.

```bash
npm test                                          # all tests (chromium is the only project)
npm run test:smoke                                # --grep @smoke
npx playwright test tests/e2e/auth/login.spec.ts  # one file
npx playwright test -g "should log in with valid" # one test by title
npm run test:headed / test:ui / test:debug
npm run typecheck                                 # the only static check; there is no linter
npm run report                                    # Playwright HTML report
npm run allure:generate && npm run allure:open    # Allure 3 (Node-based; no Java)
```

- **Don't pass `--reporter` on the CLI.** It replaces the config's reporters, and neither the HTML report nor `allure-results/` get written.
- **Clear `allure-results/` before a run.** It accumulates results across runs.
- **The demo site is slow and sometimes down.** That's why the config has 180s test / 120s navigation / 30s expect timeouts and `workers: 1`, and why `BasePage.navigate` waits only for `domcontentloaded`. Tests normally take 20–60s each.
- **Site-down errors aren't test bugs.** `net::ERR_TIMED_OUT` or `ERR_CONNECTION_CLOSED` in `page.goto`, or the Login button never appearing, mean the site is down.
- **Specs import `test`/`expect` from `tests/fixtures/pages.fixture.ts`.** Fixtures have side effects: requesting `loginPage` navigates to login and waits for the form before the test body runs, and `loggedInDashboard` logs in via the UI as admin.
- **Documented locator exceptions:** OrangeHRM labels aren't tied to their inputs, so use placeholders. The user menu toggle and the "Required" errors can only be reached by `.oxd-*` classes; see the comments in `tests/pages/`.

## 12. Agent workflow
Five subagents live in `.claude/agents/`: `planner`, `reviewer`, `implementer`, `e2e-runner`, `ci-cd`. They hand work to each other through `.work/<slug>/` (plan.md → review.md → impl.md → run.md → ci.md).
- `/pipeline <task>` runs them in order, pausing for your approval after the review.
- `/pipeline <task> --only <stage>` runs one stage; `--from <stage>` resumes from one.
- Any agent can also be called directly, e.g. `@agent-e2e-runner run smoke`.
