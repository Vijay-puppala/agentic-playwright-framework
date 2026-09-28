# Implementation Plan: Add Admin and ESS Users

**Branch**: `001-add-admin-ess-users` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-add-admin-ess-users/spec.md`

## Summary

Add E2E tests in which a logged-in admin creates a system user with the **Admin** role and one with the **ESS** role, each for a freshly generated employee. Every form value is generated with `@faker-js/faker`.

- **Setup:** the precondition employee is created through OrangeHRM's REST API.
- **Under test:** the Add User form is driven through the UI.
- **Verification:** the result is checked in the System Users list.
- **Cleanup:** fixture teardown deletes the user and the employee through the API, even when the test fails.

## Technical Context

**Language/Version**: TypeScript 5.6, `strict` (CommonJS output, `tsc --noEmit` only)

**Primary Dependencies**: `@playwright/test` ^1.55, `@faker-js/faker` 10.6.0 (ES module only; needs Node 20.19+ or 22.12+), `allure-playwright`

**Storage**: N/A. Records live in the OrangeHRM demo and are created and deleted per test.

**Testing**: Playwright Test, `chromium` project, `workers: 1`

**Target Platform**: Public OrangeHRM demo, https://opensource-demo.orangehrmlive.com

**Project Type**: E2E test suite (no application code)

**Performance Goals**: Each test finishes within `test.slow()`'s 3 × 180s budget. The expected time is 60–150s on this demo.

**Constraints**:
- The demo is shared, slow and sometimes drops connections.
- No `playwright.config.ts` changes (CLAUDE.md §9).
- No dependency changes; faker is already installed.

**Scale/Scope**: 2 tests (one per role), 2 new page objects, 1 API helper, 1 data builder, and fixture additions.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is still the unfilled template, so the gates come from the team rules in `CLAUDE.md`.

| Gate (CLAUDE.md) | Status | How the design meets it |
|---|---|---|
| §3 Locators: role, label or test id first; no XPath; brittle CSS needs a "why" comment | ✅ | Buttons and dropdown options use `getByRole`. The Add User labels aren't tied to their inputs (R2), so fields are scoped by `.oxd-input-group` filtered by exact label text, the same pattern as `LoginPage.requiredErrorFor`. Every `.oxd-*` locator gets a why-comment. No XPath. |
| §4 Waits: no `waitForTimeout`; auto-wait and `expect.poll` only | ✅ | The autocomplete waits on `getByRole('option', { name: <exact full name> })`, and the toast and list rows use web-first `expect`. |
| §5 Data: faker; no hard-coded personal data; users from env | ✅ | All names, usernames and passwords come from faker. The admin login still comes from `ADMIN_CREDENTIALS` in `tests/utils/env.ts`. |
| §6 Tagging | ✅ | Both tests are tagged `@regression`, which is new to the repo but part of the §6 scheme. They are not `@smoke`, so the CI PR scope is unchanged. |
| §9 No config edit without a plan | ✅ | No config edit. `test.slow()` is used per test (R7). |
| §9 No dependency bump without a separate PR | ✅ | None. Faker was installed separately beforehand. |
| §9 Run the impacted spec after every edit | ✅ | Covered by [quickstart.md](./quickstart.md). |

**Re-check after Phase 1:** still all ✅. The design adds `tests/data/` and `tests/api/`, which move the repo toward the §2 target layout. CLAUDE.md §10 must be updated to say those folders now exist.

## Project Structure

### Documentation (this feature)

```text
specs/001-add-admin-ess-users/
├── plan.md               # This file
├── research.md           # Phase 0: live-demo findings R1–R7
├── data-model.md         # Phase 1: TestEmployee, NewSystemUser, lifecycle
├── quickstart.md         # Phase 1: how to run and validate
├── contracts/
│   └── orangehrm-api.md  # Phase 1: REST endpoints used for setup and cleanup
├── checklists/
│   └── requirements.md   # From /speckit-specify
└── tasks.md              # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
tests/
├── api/
│   └── orangehrm.api.ts          # NEW: createEmployee, findUserIdByUsername, findEmployeeNumbersByName, deleteUsers, deleteEmployees (page.request)
├── data/
│   └── user.factory.ts           # NEW: buildEmployee(), buildSystemUser(role), using faker + uniqueSuffix()
├── pages/
│   ├── base.page.ts              # reuse: navigate()
│   ├── add-user.page.ts          # NEW: AddUserPage, with goto(), selectRole/Status, chooseEmployee(exact name), fill creds, save(), expectSaved()
│   └── system-users.page.ts      # NEW: SystemUsersPage, with searchByUsername(), expectSingleUser({username, role, employeeName, status})
├── fixtures/
│   └── pages.fixture.ts          # EXTEND: addUserPage, systemUsersPage, testEmployee (API create + teardown), newUser (data + teardown by username lookup)
├── utils/
│   ├── env.ts                    # EXTEND: ROUTES.addUser, ROUTES.systemUsers, API_BASE
│   ├── helpers.ts                # reuse: uniqueSuffix()
│   └── test-data.ts              # EXTEND: MESSAGES.saved = 'Successfully Saved'
└── e2e/
    └── admin/
        └── add-user.spec.ts      # NEW: for (const role of ['Admin','ESS'] as const) test(...) — same loop pattern as INVALID_LOGINS in login.spec.ts
```

**Structure Decision**: Keep the existing layout: specs use fixtures, fixtures use page objects, page objects use `tests/utils`.
- Page objects stay in `tests/pages/`, per CLAUDE.md §10; `tests/pom/` is not used.
- The new API helper and faker builder go in `tests/api/` and `tests/data/`, the folders CLAUDE.md §2 already names, instead of growing `tests/utils/`.
- `loggedInDashboard` (`tests/fixtures/pages.fixture.ts`) already provides FR-001's logged-in admin session. `testEmployee` depends on it, so the API calls share that session.

### Key design points
- **Teardown order and safety (R5):** the `newUser` fixture tears down before `testEmployee`, because Playwright tears fixtures down in reverse dependency order. Each API call treats 404 and empty results as success. Any other error goes into `testInfo.annotations` as `{ type: 'cleanup-warning' }` and is never thrown.
- **FR-010 / SC-004:** generated data is attached as JSON in two parts:
  - **`generated-employee`**: in `testEmployee`, straight after it's built and before the API call.
  - **`generated-user`**: in `newUser(role)`.

  This way, a failure during employee setup still reports the names it used.
- **Letters-only names:** faker names are stripped to letters, and usernames to `[a-z0-9]`. About 5% of faker's last names contain `-` or `'`, and faker's usernames contain `_`, `.`, `-` and capitals. See data-model.md.
- **Autocomplete (R2):** type the employee's unique last name, then click `getByRole('option', { name: new RegExp(\`^${first}\\s+${last}$\`) })`. Never click the first option. The names are letters only, so no regex escaping is needed.
- **Checking cleanup after a failure:** the spec has a `FORCE_FAIL_BEFORE_SAVE` environment switch that throws straight after the data is built. It does nothing unless set, and it lets the failing-test cleanup path be checked without adding or deleting a spec (CLAUDE.md §9).
- **Site-down triage (spec edge case "slow or unavailable environment"):** the tests don't classify failures themselves. The classification is done by the triage rules in CLAUDE.md §11 and by the `e2e-runner` agent, which checks the site before running and sorts failures into site-down and test bugs.
- **List verification (R4):** the row locator still has to be confirmed on the live page. Try `getByRole('row')` first; if that doesn't work, use `.oxd-table-card` with a why-comment.

## Complexity Tracking

No gate violations, so nothing to justify.
