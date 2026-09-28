# Research: Add Admin and ESS Users

**Feature**: [spec.md](./spec.md) | **Date**: 2026-09-28

These findings come from two throwaway probe scripts run against the live demo (https://opensource-demo.orangehrmlive.com) on 2026-09-28, logged in as `Admin`. Both probes deleted every record they created.

## R1. How the precondition employee is created

- **Decision**: Create the employee through the REST API (`POST /api/v2/pim/employees`), using the logged-in page's `page.request`, which shares the session cookie.
- **Rationale**: The employee is a precondition, not the thing under test (FR-002 only requires that one exists with generated names). Creating it through the API skips a slow PIM page load on a demo that often drops connections. The first probe's UI flow timed out exactly there (`ERR_CONNECTION_TIMED_OUT` after Save). The API returned 200 with `data.empNumber` straight away.
- **Alternatives considered**: The PIM → Add Employee UI flow was rejected as slower and more fragile, and it adds nothing to what this feature proves. Picking an existing employee was rejected by the user during spec clarification.

## R2. The Add User form (the flow under test, driven through the UI)

- **Decision**: Fill `/web/index.php/admin/saveSystemUser` through the UI.
- **Facts observed**:
  - The form labels, in order, are: User Role, Employee Name, Status, Username, Password, Confirm Password.
  - **The labels are not associated with their inputs.** Only Employee Name has a placeholder (`Type for hints...`). The same limitation as the login page (see `tests/pages/login.page.ts`) applies, so locate each field by scoping to its `.oxd-input-group` wrapper, filtered by the exact label text.
  - **User Role and Status are custom dropdowns.** They're `.oxd-select-text` elements, not native `<select>` elements. Clicking one opens options with `role="option"`:
    - User Role: `-- Select --`, `Admin`, `ESS`
    - Status: `-- Select --`, `Enabled`, `Disabled`
  - **Employee Name is an autocomplete** (`role="listbox"`). It shows a `Searching....` option first, then the matches. The option text is the full name, with first, middle and last names separated by whitespace. The just-created employee appeared in about 1.9s.
  - **Saving** shows a `.oxd-toast` containing `Success` / `Successfully Saved`, then returns to `/web/index.php/admin/viewSystemUsers`.
  - **Behind the scenes**, the UI sends `POST /api/v2/admin/users {"username","password","status":true,"userRoleId":2,"empNumber":259}`. ESS is `userRoleId` 2 and Admin is `userRoleId` 1.
- **Rationale**: Creating the user is the feature being tested, so it goes through the real UI.

## R3. Validation rules for generated data (FR-007)

- **Decision**:
  - **Username:** a faker-generated word stem plus a unique suffix, lower-case alphanumeric, 8 or more characters.
  - **Password:** faker-generated alphanumeric, 10 or more characters, guaranteed to contain at least one digit, one lower-case letter and one upper-case letter.
- **Facts observed**:
  - Username `abc` gives "Should be at least 5 characters". An existing username (`Admin`) gives "Already exists".
  - Password `abc` gives "Should have at least 7 characters". `abcdefgh` gives "Your password must contain minimum 1 number". `abcdefg1` and `Abcdefg1` are rated "Weak" but accepted, and a user was saved with `Abcdefg1`.
  - Password strength is checked live through `POST /api/v2/auth/public/validation/password`.
- **Rationale**: The chosen formats clear every observed rule with room to spare, so a save never fails because of the test data.

## R4. Checking the new user (FR-008)

- **Decision**:
  - **In the UI:** on System Users, filter by the generated username, then assert that exactly one row shows the username, the role, the employee name and `Enabled`.
  - **Through the API:** use `GET /api/v2/admin/users?username=<u>` only to find the user's `id` for cleanup.
- **Facts observed**: The API returns `{data:[{id, userName, status:true, employee:{empNumber, firstName, lastName}, userRole:{name:"ESS"}}]}` with `meta.total` 1.
- **Open implementation detail**: `getByRole('columnheader')` returned nothing right after the page loaded after saving. The table either renders late or doesn't expose grid roles. The implementer must confirm the row locator (`getByRole('row')` if it works, otherwise the `.oxd-table-card` rows with a why-comment) against the live page.

## R5. Cleanup (FR-009, User Story 3)

- **Decision**: Fixture teardown does two things, in order:
  1. It looks up the user by username and deletes it with `DELETE /api/v2/admin/users {ids}`.
  2. It deletes the employee with `DELETE /api/v2/pim/employees {ids}`.

  This runs whether the test passed or failed. A 404 or an empty lookup counts as "nothing to clean". Any other failure is attached to the test as a warning annotation and never thrown, so it can't hide the test's real result.
- **Facts observed**:
  - Both deletes returned 200 with the deleted ids.
  - Deleting a missing user id returns `404 {"error":{"message":"Records Not Found"}}`.
- **Rationale**: Fixture teardown always runs. Looking the user up by username also handles a partial failure: if the save never happened, nothing is found and nothing fails.

## R6. Fake data library (FR-005)

- **Decision**: `@faker-js/faker` v10.6.0, already installed. Import it as `import { faker } from '@faker-js/faker'`. Attach the generated values to each test as a JSON attachment (FR-010).
- **Facts observed**: v10 ships only as an ES module. It loads from this CommonJS/`tsc` setup on Node 26: both `require()` and `tsc --noEmit` passed.
- **Alternatives considered**: `uniqueSuffix()` from `tests/utils/helpers.ts` alone was rejected, because CLAUDE.md §5 requires faker. It is reused alongside faker for the username suffix.

## R7. Test duration vs. timeouts

- **Decision**: Mark the new tests with `test.slow()`, which triples the 180s timeout for these tests only. Don't edit `playwright.config.ts`.
- **Rationale**: Each test logs in through the UI (20–60s on this demo), then loads Add User, saves, and loads and filters System Users. On a slow day that can exceed 180s. CLAUDE.md §9 forbids config edits without a plan, and a per-test marker keeps the change narrow.
