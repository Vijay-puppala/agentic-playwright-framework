import { test, expect } from '../../fixtures/pages.fixture';
import { ROUTES } from '../../utils/env';

test.describe('Logout', () => {
  test('should log out and return to the login page @smoke', async ({ page, loggedInDashboard, loginPage }) => {
    await loggedInDashboard.logout();
    await expect(page).toHaveURL(new RegExp(ROUTES.login));
    await expect(loginPage.loginButton).toBeVisible();
  });

  test('should not allow access to the dashboard after logout', async ({ page, loggedInDashboard }) => {
    await loggedInDashboard.logout();
    await expect(page).toHaveURL(new RegExp(ROUTES.login));

    await loggedInDashboard.goto();
    await expect(page).toHaveURL(new RegExp(ROUTES.login));
  });
});
