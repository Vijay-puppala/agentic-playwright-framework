import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../utils/env';
import { MESSAGES } from '../utils/test-data';
import { UserRole } from '../data/user.factory';

export class AddUserPage extends BasePage {
  readonly employeeNameInput: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    super(page);
    this.employeeNameInput = page.getByPlaceholder('Type for hints...');
    this.saveButton = page.getByRole('button', { name: 'Save' });
  }

  /** The form group for a field; OrangeHRM labels aren't associated with their inputs. */
  private field(label: string): Locator {
    // Only the .oxd-input-group wrapper ties a label to its input; no semantic hook exists.
    return this.page.locator('.oxd-input-group').filter({ has: this.page.getByText(label, { exact: true }) });
  }

  async goto(): Promise<void> {
    await this.navigate(ROUTES.addUser);
    // The Vue form renders well after DOMContentLoaded on the slow demo.
    await expect(this.saveButton).toBeVisible({ timeout: 90_000 });
  }

  private async choose(label: string, option: string): Promise<void> {
    // Custom dropdown rendered as a div, not a native <select>; its text box is the only click target.
    await this.field(label).locator('.oxd-select-text').click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }

  async selectRole(role: UserRole): Promise<void> {
    await this.choose('User Role', role);
  }

  async selectStatus(status: 'Enabled' | 'Disabled'): Promise<void> {
    await this.choose('Status', status);
  }

  /** Picks the employee by exact full name; never the first suggestion. Names are letters only. */
  async chooseEmployee(employee: { firstName: string; lastName: string }): Promise<void> {
    await this.employeeNameInput.fill(employee.lastName);
    await this.page
      .getByRole('option', { name: new RegExp(`^${employee.firstName}\\s+${employee.lastName}$`) })
      .click();
  }

  async fillCredentials(username: string, password: string): Promise<void> {
    await this.field('Username').getByRole('textbox').fill(username);
    await this.field('Password').locator('input').fill(password);
    await this.field('Confirm Password').locator('input').fill(password);
  }

  async save(): Promise<void> {
    await this.saveButton.click();
  }

  async expectSaved(): Promise<void> {
    await expect(this.page.getByText(MESSAGES.saved)).toBeVisible();
    await expect(this.page).toHaveURL(new RegExp(ROUTES.systemUsers));
  }
}
