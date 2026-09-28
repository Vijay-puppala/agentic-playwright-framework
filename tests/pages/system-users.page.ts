import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../utils/env';
import { UserRole } from '../data/user.factory';

export interface ExpectedUserRow {
  username: string;
  role: UserRole;
  employeeName: string;
  status: 'Enabled' | 'Disabled';
}

export class SystemUsersPage extends BasePage {
  readonly searchButton: Locator;
  /** Result rows only: the header row has column headers, not cells. */
  readonly resultRows: Locator;

  constructor(page: Page) {
    super(page);
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.resultRows = page.getByRole('table').getByRole('row').filter({ has: page.getByRole('cell') });
  }

  async goto(): Promise<void> {
    await this.navigate(ROUTES.systemUsers);
    await expect(this.searchButton).toBeVisible({ timeout: 90_000 });
  }

  async searchByUsername(username: string): Promise<void> {
    // Filter labels aren't associated with their inputs; the .oxd-input-group wrapper is the only link.
    const usernameFilter = this.page
      .locator('.oxd-input-group')
      .filter({ has: this.page.getByText('Username', { exact: true }) })
      .getByRole('textbox');
    await usernameFilter.fill(username);
    await this.searchButton.click();
  }

  /** Waits for the filtered table to settle on exactly one row, then checks its columns. */
  async expectSingleUser(expected: ExpectedUserRow): Promise<void> {
    await expect(this.resultRows).toHaveCount(1);
    const cells = this.resultRows.first().getByRole('cell');
    // Columns: [checkbox, Username, User Role, Employee Name, Status, Actions]
    await expect(cells.nth(1)).toHaveText(expected.username);
    await expect(cells.nth(2)).toHaveText(expected.role);
    await expect(cells.nth(3)).toHaveText(expected.employeeName);
    await expect(cells.nth(4)).toHaveText(expected.status);
  }
}
