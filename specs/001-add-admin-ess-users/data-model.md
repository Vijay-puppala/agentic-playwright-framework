# Data Model: Add Admin and ESS Users

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

These are test-side data shapes. The application owns the real records; tests only create, read and delete them.

## TestEmployee

A precondition record, created through the API before each test.

| Field | Source | Rules |
|---|---|---|
| `firstName` | `faker.person.firstName()`, non-letters stripped | Non-empty; letters only |
| `lastName` | `faker.person.lastName()`, non-letters stripped, + unique suffix | Letters plus a lower-case alphanumeric suffix. Makes the autocomplete match unique (no two runs collide, SC-002) |

**Why letters only:** in a sample of 200k, about 5% of faker's last names contained `-` or `'` (e.g. `Stroman-Block`, `D'Amore`), and so did the first name `D'angelo`. Those would go through the employee search and the list comparison, and the search's handling of punctuation hasn't been checked. None of the sampled names contained regex-special characters.
| `empNumber` | Returned by `POST /api/v2/pim/employees` | Used for cleanup |

**Display name** in the autocomplete and the users list is `firstName lastName`, with whitespace in between. The middle name is empty.

## NewSystemUser

The values typed into the Add User form.

| Field | Source | Rules (from research R3) |
|---|---|---|
| `role` | Test parameter: `'Admin'` or `'ESS'` | Must match an option label exactly |
| `status` | Constant `'Enabled'` | Disabled users are out of scope (spec Assumptions) |
| `employee` | The `TestEmployee` above | Picked by exact display name, never the first suggestion |
| `username` | `faker.internet.username()`, lower-cased, stripped to `[a-z0-9]`, cut to 12 chars, + `uniqueSuffix()` | ≥ 5 chars (use ≥ 8); unique per run. Faker's usernames contain `_`, `.`, `-` and capitals, so they must be stripped. |
| `password` | Faker alphanumeric, ≥ 10 chars, at least one digit, one lower-case and one upper-case letter | ≥ 7 chars and ≥ 1 digit are the app's rules |
| `confirmPassword` | The same as `password` | Must match |

## Lifecycle

```
build data ─► create employee (API) ─► fill Add User form (UI) ─► save ─► verify in System Users (UI)
     │                                                                              │
     └──────────────────── teardown (always runs) ◄────────────────────────────────┘
                           1. look up user by username → delete if found
                           2. delete employee by empNumber
                           404 / empty = nothing to do; other errors → warning annotation
```

The generated data is attached to the test as JSON in two parts (FR-010, SC-004):
- **`generated-employee`**: attached by the `testEmployee` fixture as soon as the data is built, *before* the API call, so a failure during setup still reports the names used.
- **`generated-user`**: attached by `newUser(role)`. It includes the password, because this is throwaway demo data.
