import { test, expect } from '../../fixtures/pages.fixture';
import { INVALID_LOGINS, MESSAGES, VALID_USER } from '../../utils/test-data';
import { ROUTES } from '../../utils/env';

test.describe('Login', () => {
  test('should display the login form @smoke', async ({ loginPage }) => {
    await expect(loginPage.heading).toBeVisible();
    await expect(loginPage.usernameInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    await expect(loginPage.loginButton).toBeEnabled();
  });

  test('should log in with valid credentials @smoke @critical', async ({ loginPage, dashboardPage }) => {
    await loginPage.login(VALID_USER.username, VALID_USER.password);
    await dashboardPage.expectLoaded();
  });

  for (const { title, username, password } of INVALID_LOGINS) {
    test(`should reject login with ${title}`, async ({ page, loginPage }) => {
      await loginPage.login(username, password);
      await loginPage.expectErrorMessage(MESSAGES.invalidCredentials);
      await expect(page).toHaveURL(new RegExp(ROUTES.login));
    });
  }

  test('should require both username and password', async ({ page, loginPage }) => {
    await loginPage.loginButton.click();
    await expect(loginPage.requiredErrorFor(loginPage.usernameInput)).toBeVisible();
    await expect(loginPage.requiredErrorFor(loginPage.passwordInput)).toBeVisible();
    await expect(page).toHaveURL(new RegExp(ROUTES.login));
  });

  test('should require password when only username is given', async ({ loginPage }) => {
    await loginPage.usernameInput.fill(VALID_USER.username);
    await loginPage.loginButton.click();
    await expect(loginPage.requiredErrorFor(loginPage.passwordInput)).toBeVisible();
    await expect(loginPage.requiredErrorFor(loginPage.usernameInput)).toBeHidden();
  });

  test('should require username when only password is given', async ({ loginPage }) => {
    await loginPage.passwordInput.fill(VALID_USER.password);
    await loginPage.loginButton.click();
    await expect(loginPage.requiredErrorFor(loginPage.usernameInput)).toBeVisible();
    await expect(loginPage.requiredErrorFor(loginPage.passwordInput)).toBeHidden();
  });

  test('should navigate to the reset password page', async ({ page, loginPage }) => {
    await loginPage.forgotPasswordLink.click();
    await expect(page).toHaveURL(new RegExp(ROUTES.requestPasswordReset));
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible();
  });

  test('should redirect unauthenticated users to login', async ({ page, dashboardPage, loginPage }) => {
    await dashboardPage.goto();
    await expect(page).toHaveURL(new RegExp(ROUTES.login));
    await expect(loginPage.loginButton).toBeVisible();
  });
});
