# Quickstart: validate "Add Admin and ESS Users"

## Prerequisites
- `npm ci` has been run, and `@faker-js/faker` is present (`npm ls @faker-js/faker`).
- Node 20.19+ or 22.12+ (faker v10 ships only as an ES module; see CLAUDE.md §10).
- The demo site is up:
  `curl -s -o /dev/null -w "%{http_code}\n" https://opensource-demo.orangehrmlive.com/web/index.php/auth/login` prints `200`.

## Run

```bash
npm run typecheck
npx playwright test tests/e2e/admin/add-user.spec.ts --project=chromium
npm run allure:generate
```

Don't pass `--reporter`, or the HTML and Allure reports won't be written.

## Expected outcome

| Scenario | Expected |
|---|---|
| Add user › Admin role (US1) | Passes. The report has a `generated-employee` attachment (first and last name) and a `generated-user` attachment (username and role). |
| Add user › ESS role (US2) | Passes. Its username and employee differ from the Admin test's (SC-002). |
| Cleanup (US3) | No `cleanup-warning` annotations in the report. |

## Check cleanup after a forced failure (US3)

```powershell
$env:FORCE_FAIL_BEFORE_SAVE='1'; npx playwright test tests/e2e/admin/add-user.spec.ts --project=chromium; Remove-Item Env:FORCE_FAIL_BEFORE_SAVE
```

In bash: `FORCE_FAIL_BEFORE_SAVE=1 npx playwright test tests/e2e/admin/add-user.spec.ts --project=chromium`.

Expected:
- Each test fails with "Forced failure for the cleanup check".
- The report still has a `generated-employee` attachment.
- The check below finds no leftover employee.
- There are no `cleanup-warning` annotations.

## Check cleanup by hand (SC-003)
1. Copy a username from a test's `generated-user` attachment, and a last name from its `generated-employee` attachment.
2. Log in to the demo as Admin.
3. Search for the username under **Admin → User Management**. Expect: **No Records Found**.
4. Search for the last name under **PIM → Employee List**. Expect: **No Records Found**.

## Check that the tests are stable (SC-001)

```bash
npx playwright test tests/e2e/admin/add-user.spec.ts --project=chromium --repeat-each=10
```

Ten repeats of each test gives 10 runs of each role (20 in total), matching SC-001's "both scenarios pass on 10 consecutive runs". All should pass. If there are failures, sort them by cause first (CLAUDE.md §11). Failures from the site being down don't count against this criterion.

Checking this many runs by hand isn't practical. tasks.md T019 checks for leftovers across all the runs through the API, using every `generated-employee` last name.
