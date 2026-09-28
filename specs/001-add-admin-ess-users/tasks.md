---

description: "Task list for feature 001: Add Admin and ESS Users"
---

# Tasks: Add Admin and ESS Users

**Input**: Design documents from `/specs/001-add-admin-ess-users/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/orangehrm-api.md, quickstart.md

**Tests**: This feature *is* an E2E test suite, so its deliverables are test code. No separate contract or unit tests were requested, so none are generated.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested on its own. The US3 phase (cleanup) comes **before** US2, so that no ESS runs happen until the teardown exists; see the Implementation Strategy.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Path Conventions

Single project; all code lives under `tests/` (see the plan.md structure). Page objects are in `tests/pages/`, not `tests/pom/` (CLAUDE.md §10).

**Rules for every task** (CLAUDE.md):
- no `page.waitForTimeout` (§4)
- no XPath; every `.oxd-*` locator gets a `// why` comment (§3)
- no hard-coded personal data (§5)
- no `playwright.config.ts` edits and no dependency changes (§9)
- after each edit, run `npm run typecheck` and the impacted spec (§9), and never pass `--reporter`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Constants that the later tasks import

- [X] T001 [P] Add `addUser: '/web/index.php/admin/saveSystemUser'` and `systemUsers: '/web/index.php/admin/viewSystemUsers'` to `ROUTES` in `tests/utils/env.ts`, plus an exported `API_BASE = \`${BASE_URL}/web/index.php/api/v2\``.
- [X] T002 [P] Add `saved: 'Successfully Saved'` to `MESSAGES` in `tests/utils/test-data.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data builders and API helpers that every story needs

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Create `tests/data/user.factory.ts` using `import { faker } from '@faker-js/faker'` and `uniqueSuffix()` from `tests/utils/helpers.ts`. Export:
  - `type UserRole = 'Admin' | 'ESS'`
  - `buildEmployee(): { firstName; lastName }`, **letters only**:
    - `firstName` = `faker.person.firstName().replace(/[^A-Za-z]/g, '')`
    - `lastName` = `faker.person.lastName().replace(/[^A-Za-z]/g, '') + uniqueSuffix()`, which "makes the autocomplete match unique (no two runs collide, SC-002)"
    - Why letters only: about 5% of faker's last names contain `-` or `'` (e.g. `Stroman-Block`, `D'Amore`; measured over 200k samples). Those would go through the employee search and the list comparison.
  - `buildSystemUser(role: UserRole): { role; status: 'Enabled'; username; password }`
    - `username` = `faker.internet.username().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) + uniqueSuffix()`. Faker's usernames contain `_`, `.`, `-` and capitals, which must be stripped. Rule: "≥ 5 chars (use ≥ 8); unique per run".
    - `password`: faker alphanumeric, "≥ 10 chars, at least one digit, one lower-case and one upper-case letter" (the app's rules are "≥ 7 chars and ≥ 1 digit").
- [X] T004 Create `tests/api/orangehrm.api.ts`, depending on T001's `API_BASE`. Every function takes a Playwright `APIRequestContext` (the logged-in `page.request`) and follows `specs/001-add-admin-ess-users/contracts/orangehrm-api.md` exactly:
  - `createEmployee(req, { firstName, lastName }): Promise<number>` sends `POST /pim/employees` with `{ firstName, middleName: '', lastName, employeeId: '' }` and returns `data.empNumber`. It throws with the status and body if the response isn't 200.
  - `findUserIdByUsername(req, username): Promise<number | undefined>` sends `GET /admin/users?username=<u>&limit=50` and returns the `id` of the row whose `userName` matches exactly.
  - `findEmployeeNumbersByName(req, nameOrId): Promise<number[]>` sends `GET /pim/employees?nameOrId=<n>&limit=50` and returns the `empNumber`s. It's used by the leftover check in T019.
  - `deleteUsers(req, ids: number[])` and `deleteEmployees(req, empNumbers: number[])` send `DELETE /admin/users` and `DELETE /pim/employees` with `{ ids }`. They treat `404 Records Not Found` as success and throw on any other non-200.
- [X] T005 Add a `testEmployee` fixture in `tests/fixtures/pages.fixture.ts` that depends on T003 and T004:
  - It depends on `loggedInDashboard`, so the admin session exists (FR-001).
  - It calls `buildEmployee()` and **immediately** attaches the result as `generated-employee` (`application/json`) using `testInfo.attach`, **before** the API call. That way a failure while creating the employee still reports the data it used (FR-010, SC-004).
  - It then calls `createEmployee(page.request, ...)` and yields `{ firstName, lastName, empNumber, displayName: \`${firstName} ${lastName}\` }`.
  - Add the type to `PageFixtures`. Teardown is added in T011.

**Checkpoint**: The builders, API helpers and `testEmployee` exist, so user story work can begin.

---

## Phase 3: User Story 1 - Create an Admin user (Priority: P1) 🎯 MVP

**Goal**: A logged-in admin creates an **Admin** user for a fake employee through the UI and sees it in System Users.

**Independent Test**: `npx playwright test tests/e2e/admin/add-user.spec.ts -g "Admin role" --project=chromium` passes, and its report has `generated-employee` and `generated-user` attachments.

### Implementation for User Story 1

- [X] T006 [P] [US1] Create `AddUserPage extends BasePage` in `tests/pages/add-user.page.ts`, following research R2:
  - **Fields:** the labels aren't associated with their inputs, so add a private `field(label)` that returns `page.locator('.oxd-input-group').filter({ has: page.getByText(label, { exact: true }) })`, with a why-comment. It's the same pattern as `LoginPage.requiredErrorFor`.
  - **`goto()`:** calls `navigate(ROUTES.addUser)` and waits for the Save button.
  - **`selectRole(role)` and `selectStatus(status)`:** click `field(...).locator('.oxd-select-text')`, with a why-comment saying it's a custom dropdown, not a `<select>`. Then click `getByRole('option', { name, exact: true })`.
  - **`chooseEmployee(emp)`:** fills `getByPlaceholder('Type for hints...')` with the unique last name, then clicks `getByRole('option', { name: new RegExp(\`^${first}\\s+${last}$\`) })`. Names are letters only (T003), so no regex escaping is needed. It must never click the first option, and it must not wait on the "Searching...." option.
  - **`fillCredentials(username, password)`:** fills Username, Password, and Confirm Password with the same password.
  - **`save()`**.
  - **`expectSaved()`:** expects the toast text to contain `MESSAGES.saved` and the URL to match `ROUTES.systemUsers`.
- [X] T007 [P] [US1] Create `SystemUsersPage extends BasePage` in `tests/pages/system-users.page.ts`:
  - **`searchByUsername(username)`:** fills the Username filter, found by the same label-scoped `.oxd-input-group` pattern with a why-comment, and clicks `getByRole('button', { name: 'Search' })`.
  - **`expectSingleUser({ username, role, employeeName, status })`:** asserts that exactly 1 result row exists and that it contains all four values. **The row locator must be confirmed on the live page first (research R4).** Try `getByRole('row')` without the header row. If that doesn't match, use `.oxd-table-card` with a why-comment. Record which one worked in a comment.
- [X] T008 [US1] Extend `tests/fixtures/pages.fixture.ts`. It depends on T005–T007.
  - Register the `addUserPage` and `systemUsersPage` fixtures, which don't navigate.
  - Add a `newUser` fixture typed as `(role: UserRole) => NewSystemUser`, a factory, because the role comes from the test.
    - It depends on `testEmployee`.
    - Each call runs `buildSystemUser(role)`, remembers the username for teardown (T012), and attaches the user as `generated-user` (`application/json`) using `testInfo.attach` (FR-010). The employee is already attached by T005.
- [X] T009 [US1] Create `tests/e2e/admin/add-user.spec.ts`. It depends on T008.
  - It imports `test`/`expect` from `../../fixtures/pages.fixture`.
  - Wrap the tests in `test.describe('Add user', ...)`, with `const ROLES = ['Admin'] as const` and a `for (const role of ROLES)` loop, the same pattern as the `INVALID_LOGINS` loop in `tests/e2e/auth/login.spec.ts`.
  - Each test is titled ``should create a user with the ${role} role @regression``, calls `test.slow()` (research R7) and then does the following:
    1. Build `const user = newUser(role)`.
    2. Add the cleanup-check switch straight after that: `if (process.env.FORCE_FAIL_BEFORE_SAVE) throw new Error('Forced failure for the cleanup check (FORCE_FAIL_BEFORE_SAVE)')`. It does nothing unless the variable is set, and T013 uses it.
    3. `addUserPage.goto()`.
    4. Select the role, choose `testEmployee`, select `Enabled`, fill the credentials, then save and call `expectSaved()`.
    5. `systemUsersPage.searchByUsername(user.username)`, then `expectSingleUser({ username, role, employeeName: testEmployee.displayName, status: 'Enabled' })`.
- [X] T010 [US1] Verify with `npm run typecheck` and `npx playwright test tests/e2e/admin/add-user.spec.ts --project=chromium`. Confirm that the `generated-employee` and `generated-user` attachments are in `playwright-report/`. If the failure is a site-down error (CLAUDE.md §11), rerun it; don't change the code.

**Checkpoint**: The Admin-user test passes on its own. Until the US3 phase (next) is done, created data is **not** cleaned up. Do the next phase before running this test again.

---

## Phase 4: User Story 3 - Test data is cleaned up (Priority: P3)

**Goal**: Every user and employee created by a test is deleted afterwards, whether the test passed or failed.

**Why before US2**: Until this is done, every run leaves a user and an employee on the shared demo.

**Independent Test**: After a run, the manual check in `quickstart.md` ("Check cleanup by hand") finds no records, and the report has no `cleanup-warning` annotations.

### Implementation for User Story 3

- [X] T011 [US3] Add teardown to the `testEmployee` fixture in `tests/fixtures/pages.fixture.ts`, after `use()`: call `deleteEmployees(page.request, [empNumber])`. Wrap it in try/catch. On error, add `testInfo.annotations.push({ type: 'cleanup-warning', description: \`employee ${empNumber}: ${err}\` })` and don't rethrow. The spec says "a cleanup failure is reported but doesn't hide the original test result".
- [X] T012 [US3] Add teardown to the `newUser` fixture in `tests/fixtures/pages.fixture.ts`. For each remembered username:
  - call `findUserIdByUsername`, then `deleteUsers` if an id is found;
  - if nothing is found, the save never happened, which is fine;
  - handle errors the same way as T011 (`cleanup-warning`).

  `newUser` depends on `testEmployee`, so Playwright tears it down first: the user is deleted before the employee.
- [X] T013 [US3] Verify both cleanup paths:
  - **Normal run:** run the spec once, then follow quickstart.md's "Check cleanup by hand" using the `generated-employee` and `generated-user` attachments. Expect **No Records Found** everywhere.
  - **Failing run:** use T009's switch. In PowerShell: `$env:FORCE_FAIL_BEFORE_SAVE='1'; npx playwright test tests/e2e/admin/add-user.spec.ts --project=chromium; Remove-Item Env:FORCE_FAIL_BEFORE_SAVE`. In bash: `FORCE_FAIL_BEFORE_SAVE=1 npx playwright test ...`.
    - Expect the test to fail with the forced-failure message.
    - The employee from `generated-employee` must be gone.
    - There must be no `cleanup-warning`.
  - No spec file is created or edited for this check.

**Checkpoint**: The Admin flow runs cleanly, and the shared demo is left clean after passing and failing runs.

---

## Phase 5: User Story 2 - Create an ESS user (Priority: P2)

**Goal**: The same flow creates an **ESS** user.

**Independent Test**: `npx playwright test tests/e2e/admin/add-user.spec.ts -g "ESS role" --project=chromium` passes, and its username and employee differ from the Admin test's.

### Implementation for User Story 2

- [X] T014 [US2] Change `ROLES` in `tests/e2e/admin/add-user.spec.ts` to `['Admin', 'ESS'] as const`. No other changes should be needed. If ESS needs anything else, put it in `AddUserPage`, not the spec.
- [X] T015 [US2] Run the spec and confirm that both tests pass and that their attachments show different usernames and employee names (SC-002).

**Checkpoint**: All three stories work; both roles pass independently, and the demo is left clean.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Update docs and run the final validation

- [X] T016 [P] Update `CLAUDE.md` §10:
  - `tests/api/` and `tests/data/` now exist.
  - `@regression` is now in use, in addition to `@smoke` and `@critical`.
  - Keep the user's §1–§9 unchanged.
- [X] T017 [P] Check the new files for rule violations: `grep -rnE "waitForTimeout|xpath=" tests/` should return nothing, and every `.oxd-` locator in `tests/pages/add-user.page.ts` and `tests/pages/system-users.page.ts` should have a comment on the line above it.
- [X] T018 Run the full validation in `specs/001-add-admin-ess-users/quickstart.md`:
  - `npm run typecheck`
  - the spec run
  - `npm run allure:generate`
  - the **SC-001 stability run**, `--repeat-each=10`: 10 runs of each role, 20 in total, all passing apart from site-down errors
- [X] T019 Check for leftovers after T018 (SC-003), without searching by hand:
  - Collect every `lastName` from the run's `generated-employee` attachments, found in `test-results/` or the JSON report.
  - Log in, then call `findEmployeeNumbersByName(page.request, lastName)` (from T004) for each one. Every result must be empty.
  - Do this in a throwaway script, not a committed spec. Report any leftovers together with their `cleanup-warning` annotations.
- [X] T020 Run the whole suite, `npx playwright test --project=chromium`, to confirm the existing auth specs still pass with the fixture changes in `tests/fixtures/pages.fixture.ts`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T002):** no dependencies.
- **Foundational (T003–T005):** T004 needs T001. T005 needs T003 and T004. **Blocks all stories.**
- **US1 (T006–T010):** needs Phase 2.
- **US3 (T011–T013):** needs the fixtures from T005 and T008, and T013 needs T009's switch. Only its teardown code (T011–T012) can be written alongside T009–T010.
- **US2 (T014–T015):** needs US1's spec file (T009) and should come after US3, so that ESS runs clean up after themselves.
- **Polish (T016–T020):** needs all stories.

### User Story Dependencies

- **US1 (P1):** only on Foundational.
- **US3 (P3):** changes only fixture teardown, so it doesn't depend on the test bodies from US1 or US2. It comes second because of the shared demo, not because of any code dependency.
- **US2 (P2):** reuses everything from US1, and only adds a value to the role list. It can still be tested on its own with `-g "ESS role"`.

### Within Each User Story

- Page objects come before fixtures, and fixtures come before the spec.
- Run typecheck and the impacted spec after each edit (CLAUDE.md §9).

### Parallel Opportunities

- T001 ∥ T002 (different files)
- T003 ∥ T004 once T001 is done. T004 is not marked `[P]` because it needs T001's `API_BASE`.
- T006 ∥ T007 (separate page-object files)
- T011–T012 (fixture file) ∥ T009–T010 (spec file) once T008 is done
- T016 ∥ T017

---

## Parallel Example: User Story 1

```bash
# After Phase 2, build both page objects together:
Task: "Create AddUserPage in tests/pages/add-user.page.ts (T006)"
Task: "Create SystemUsersPage in tests/pages/system-users.page.ts (T007)"
# Then, one at a time:
Task: "Extend fixtures in tests/fixtures/pages.fixture.ts (T008)"
Task: "Create tests/e2e/admin/add-user.spec.ts (T009)"
```

---

## Implementation Strategy

### MVP First (US1 + US3)

1. Phase 1: Setup, then Phase 2: Foundational.
2. Phase 3 (US1). **Stop and validate** with a single Admin run.
3. Phase 4 (US3), straight after. The demo is shared, so the practical MVP is US1 plus US3.
4. Phase 5 (US2) is then a one-line change.
5. Finish with Polish.

### Incremental Delivery

1. Setup + Foundational: the builders, API helpers and `testEmployee` exist.
2. US1: the Admin user flow passes.
3. US3: runs leave no data behind, whether they pass or fail.
4. US2: the ESS role is covered.
5. Polish: docs updated, the 20-run stability check and the automated leftover check done.

### Using the repo's agents

- To implement from this file: `/speckit-implement`, or hand it to the `implementer` agent with this `tasks.md` as its approved plan.
- To run the tests: use the `e2e-runner` agent. It checks the site first and builds both reports. It also handles the site-down triage that the spec's "slow or unavailable environment" edge case relies on (see plan.md).
- **CI:** this feature adds only `@regression` tests, so there's no CI impact; the `ci-cd` agent isn't needed.

---

## Notes

- [P] tasks touch different files and don't depend on unfinished tasks.
- The [Story] label ties each task to its user story.
- Commit per phase using Conventional Commits, with no co-author trailer and no "Generated with" footer (CLAUDE.md §8). For example: `test(admin): add Admin user creation e2e`.
- Before anything is done in the demo, confirm the site is up (CLAUDE.md §11).
