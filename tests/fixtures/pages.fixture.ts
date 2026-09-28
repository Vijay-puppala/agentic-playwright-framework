import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { DashboardPage } from '../pages/dashboard.page';
import { VALID_USER } from '../utils/test-data';

type PageFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  /** A dashboard reached by logging in through the UI as the admin user. */
  loggedInDashboard: DashboardPage;
};

export const test = base.extend<PageFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  loggedInDashboard: async ({ loginPage, dashboardPage }, use) => {
    await loginPage.login(VALID_USER.username, VALID_USER.password);
    await dashboardPage.expectLoaded();
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';
