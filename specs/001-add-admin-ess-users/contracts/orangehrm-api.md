# Contract: OrangeHRM REST endpoints used by the tests

The tests call these endpoints for setup and cleanup only. The feature under test (creating a user) goes through the UI. All calls use the logged-in page's `page.request`, which shares the `orangehrm` session cookie. The base is `${BASE_URL}/web/index.php/api/v2`. Everything below was checked against the live demo on 2026-09-28 (see [research.md](../research.md)).

| Purpose | Request | Success response | Notes |
|---|---|---|---|
| Create precondition employee | `POST /pim/employees` `{ firstName, middleName: "", lastName, employeeId: "" }` | `200 { data: { empNumber, firstName, lastName } }` | |
| Find user for cleanup | `GET /admin/users?username=<u>&limit=50` | `200 { data: [{ id, userName, status, employee:{empNumber}, userRole:{name} }], meta:{ total } }` | Empty `data` means the user was never saved |
| Find employees for the leftover check (SC-003) | `GET /pim/employees?nameOrId=<lastName>&limit=50` | `200 { data: [{ empNumber, firstName, lastName }], meta:{ total } }` | Empty `data` means cleaned up (checked live: the probe found and deleted its leftover this way) |
| Delete users | `DELETE /admin/users` `{ ids: [id] }` | `200 { data: ["<id>"] }` | `404 Records Not Found` counts as already clean |
| Delete employees | `DELETE /pim/employees` `{ ids: [empNumber] }` | `200 { data: ["<empNumber>"] }` | `404` counts as already clean |

**Not used:** `GET /admin/user-roles` returns 404 on this build. Role ids (Admin = 1, ESS = 2) are only needed if users are ever created through the API, which this feature doesn't do.

**If a contract breaks:** a status or response shape different from the above makes the setup fail loudly (a setup error, not a test assertion). Cleanup failures become warnings only (spec: "a cleanup failure is reported but doesn't hide the original test result").
