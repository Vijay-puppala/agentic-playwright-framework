import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { ROUTES } from '../utils/env';

export class DashboardPage extends BasePage {
  readonly heading: Locator;
  readonly userDropdown: Locator;
  readonly logoutMenuItem: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Dashboard' });
    // Top-bar user menu toggle has no accessible name; class is the only stable hook.
    this.userDropdown = page.locator('.oxd-userdropdown-tab');
    this.logoutMenuItem = page.getByRole('menuitem', { name: 'Logout' });
  }

  async goto(): Promise<void> {
    await this.navigate(ROUTES.dashboard);
  }

  async expectLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${ROUTES.dashboard}$`));
    await expect(this.heading).toBeVisible();
  }

  async logout(): Promise<void> {
    await this.userDropdown.click();
    await this.logoutMenuItem.click();
  }
}
