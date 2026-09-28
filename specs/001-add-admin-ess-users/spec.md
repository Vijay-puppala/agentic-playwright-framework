# Feature Specification: Add Admin and ESS Users

**Feature Branch**: `001-add-admin-ess-users`

**Created**: 2026-09-28

**Status**: Draft

**Input**: User description: "Now once the user is logged into app i want to add new users with admin and ess user role and ensure to using fake for generating any data for the forms required"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an Admin user (Priority: P1)

A logged-in administrator creates a new system user with the **Admin** role for a newly created employee. Every value typed into the form is freshly generated fake data.

**Why this priority**: Admin accounts are the most privileged. Being able to create one reliably is the core of the feature.

**Independent Test**: Log in as admin, create a fake employee, create an Admin user for them, and confirm the user appears in the System Users list.

**Acceptance Scenarios**:

1. **Given** an administrator is logged in and a fake employee exists, **When** they add a user with role Admin, status Enabled, a generated unique username and a generated valid password (confirmed), **Then** the save succeeds and a success confirmation is shown.
2. **Given** that user was saved, **When** the administrator searches System Users by the generated username, **Then** exactly one record is shown with that username, role **Admin**, the employee's name and status **Enabled**.

---

### User Story 2 - Create an ESS user (Priority: P2)

The same flow as Story 1, but with the **ESS** (Employee Self Service) role.

**Why this priority**: ESS is the most common role in practice. It reuses Story 1's flow with a different role.

**Independent Test**: The same as Story 1, but choosing ESS and checking that the listed role is ESS.

**Acceptance Scenarios**:

1. **Given** an administrator is logged in and a fake employee exists, **When** they add a user with role ESS, status Enabled and generated credentials, **Then** the save succeeds and a success confirmation is shown.
2. **Given** that user was saved, **When** the administrator searches System Users by the generated username, **Then** exactly one record is shown with role **ESS** and status **Enabled**.

---

### User Story 3 - Test data is cleaned up (Priority: P3)

Each test removes the user and employee it created, so the shared demo environment doesn't fill up with test data.

**Why this priority**: Tests are correct without it, but the demo is shared and leftover data affects other people.

**Independent Test**: After a run, searching for the generated username and employee name returns no records.

**Acceptance Scenarios**:

1. **Given** a test created a user and an employee, **When** the test finishes, whether it passed or failed, **Then** both records have been deleted.
2. **Given** creation failed partway through (e.g. the employee was created but the user wasn't), **When** cleanup runs, **Then** it deletes whatever was created and doesn't fail on what wasn't.

---

### Edge Cases

- **Duplicate username**: the generated username must not already exist. Generated usernames include a unique suffix, so repeated or parallel runs never collide.
- **Validation rules**: generated usernames and passwords must satisfy the application's rules for length and password strength, so a save never fails because of the test data itself.
- **Employee search**: a just-created employee may take a moment to appear in the name suggestions. The test must wait for the exact generated name and never pick the first suggestion.
- **Slow or unavailable environment**: if the site is unreachable, the failure is reported as environmental, not as a feature defect.
- **Failed cleanup**: a cleanup failure is reported but doesn't hide the original test result.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Tests MUST start from an authenticated administrator session.
- **FR-002**: Tests MUST create a new employee with generated first and last names before creating the user.
- **FR-003**: Tests MUST create a system user with role **Admin**, linked to the generated employee.
- **FR-004**: Tests MUST create a system user with role **ESS**, linked to the generated employee.
- **FR-005**: Every value typed into a form (employee names, username, password) MUST be freshly generated fake data. None may be hard-coded.
- **FR-006**: Generated usernames MUST be unique per run.
- **FR-007**: Generated usernames and passwords MUST meet the application's validation rules.
- **FR-008**: After saving, tests MUST confirm the new user appears in the System Users list with the expected username, role, employee name and status.
- **FR-009**: Tests MUST delete the created user and employee after each test, whether it passed or failed.
- **FR-010**: Generated values MUST appear in the test report or failure output, so a failure can be reproduced by hand.

### Key Entities

- **Employee**: a person record with a first and last name. A user account must be linked to one.
- **System User**: a login account with a username, password, role (Admin or ESS), status (Enabled or Disabled) and a linked employee.
- **User Role**: Admin has full administrative access; ESS gives an employee self-service access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both the Admin and ESS scenarios pass on 10 consecutive runs against a healthy environment, with no data collisions.
- **SC-002**: No two runs use the same username or employee name.
- **SC-003**: After a full run, zero test-created users or employees remain in the environment.
- **SC-004**: Every failure reports the generated data it used.

## Assumptions

- The default administrator credentials from the existing environment config are used to log in.
- New users are created with status **Enabled**. Disabled users are out of scope.
- Logging in as the new user and checking what each role can do is out of scope (user's choice); it could be a later feature.
- Editing existing users and testing negative validation rules are out of scope.
- A fake-data generation library is needed. CLAUDE.md §5 names `@faker-js/faker`, which is now installed as a dev dependency.
