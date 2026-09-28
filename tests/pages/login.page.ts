import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../utils/env';

export class LoginPage extends BasePage {
  readonly heading: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorAlert: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Login' });
    // OrangeHRM labels are not associated with their inputs, so placeholders are the most stable hook.
    this.usernameInput = page.getByPlaceholder('Username');
    this.passwordInput = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
    this.errorAlert = page.getByRole('alert');
    // Rendered as a clickable <p>, not a link.
    this.forgotPasswordLink = page.getByText('Forgot your password?');
  }

  async goto(): Promise<void> {
    await this.navigate(ROUTES.login);
    // The Vue app renders the form only after its i18n messages load, which can be slow.
    await expect(this.loginButton).toBeVisible({ timeout: 90_000 });
  }

  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /** The "Required" validation message rendered under the given input. */
  requiredErrorFor(input: Locator): Locator {
    // Error sits in the same .oxd-input-group wrapper as the input; no semantic hook exists.
    return this.page
      .locator('.oxd-input-group')
      .filter({ has: input })
      .getByText('Required');
  }

  async expectErrorMessage(message: string): Promise<void> {
    await expect(this.errorAlert).toBeVisible();
    await expect(this.errorAlert).toContainText(message);
  }
}
