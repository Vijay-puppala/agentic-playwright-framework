import { test as base, TestInfo } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { AddUserPage } from '../pages/add-user.page';
import { SystemUsersPage } from '../pages/system-users.page';
import { VALID_USER } from '../utils/test-data';
import { buildEmployee, buildSystemUser, EmployeeData, NewSystemUser, UserRole } from '../data/user.factory';
import { createEmployee, deleteEmployees, deleteUsers, findUserIdByUsername } from '../api/orangehrm.api';

export interface TestEmployee extends EmployeeData {
  empNumber: number;
  /** How the employee appears in the autocomplete and the System Users list. */
  displayName: string;
}

type PageFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  addUserPage: AddUserPage;
  systemUsersPage: SystemUsersPage;
  /** A dashboard reached by logging in through the UI as the admin user. */
  loggedInDashboard: DashboardPage;
  /** A freshly generated employee, created through the API in the admin session. Deleted after the test. */
  testEmployee: TestEmployee;
  /** Builds generated credentials for a new user of `role`. Any user saved with them is deleted after the test. */
  newUser: (role: UserRole) => NewSystemUser;
};

/** Cleanup must never hide the test's own result, so failures become report annotations instead of errors. */
async function cleanUp(testInfo: TestInfo, what: string, action: () => Promise<void>): Promise<void> {
  try {
    await action();
  } catch (err) {
    testInfo.annotations.push({ type: 'cleanup-warning', description: `${what}: ${err}` });
  }
}

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  addUserPage: async ({ page }, use) => {
    await use(new AddUserPage(page));
  },

  systemUsersPage: async ({ page }, use) => {
    await use(new SystemUsersPage(page));
  },

  loggedInDashboard: async ({ loginPage, dashboardPage }, use) => {
    await loginPage.login(VALID_USER.username, VALID_USER.password);
    await dashboardPage.expectLoaded();
    await use(dashboardPage);
  },

  testEmployee: async ({ page, loggedInDashboard: _session }, use, testInfo) => {
    const employee = buildEmployee();
    // Attach before creating it, so a setup failure still reports the data it used.
    await testInfo.attach('generated-employee', {
      body: JSON.stringify(employee, null, 2),
      contentType: 'application/json',
    });
    const empNumber = await createEmployee(page.request, employee);
    await use({ ...employee, empNumber, displayName: `${employee.firstName} ${employee.lastName}` });
    await cleanUp(testInfo, `employee ${empNumber}`, () => deleteEmployees(page.request, [empNumber]));
  },

  // Depends on testEmployee, so it is torn down first: users are deleted before their employee.
  newUser: async ({ page, testEmployee: _employee }, use, testInfo) => {
    const usernames: string[] = [];
    await use((role) => {
      const user = buildSystemUser(role);
      usernames.push(user.username);
      // Synchronous push (the factory is sync); attach() would return an unawaited promise.
      testInfo.attachments.push({
        name: 'generated-user',
        body: Buffer.from(JSON.stringify(user, null, 2)),
        contentType: 'application/json',
      });
      return user;
    });
    for (const username of usernames) {
      await cleanUp(testInfo, `user ${username}`, async () => {
        // Not found means the save never happened; nothing to delete.
        const id = await findUserIdByUsername(page.request, username);
        if (id !== undefined) await deleteUsers(page.request, [id]);
      });
    }
  },
});

export { expect } from '@playwright/test';
