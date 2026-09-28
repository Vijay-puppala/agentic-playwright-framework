import 'dotenv/config';

export const BASE_URL = process.env.BASE_URL ?? 'https://opensource-demo.orangehrmlive.com';

// Public demo credentials, displayed on the OrangeHRM demo login page.
export const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME ?? 'Admin',
  password: process.env.ADMIN_PASSWORD ?? 'admin123',
};

export const ROUTES = {
  login: '/web/index.php/auth/login',
  dashboard: '/web/index.php/dashboard/index',
  requestPasswordReset: '/web/index.php/auth/requestPasswordResetCode',
  addUser: '/web/index.php/admin/saveSystemUser',
  systemUsers: '/web/index.php/admin/viewSystemUsers',
} as const;

// REST API used for test setup and cleanup; calls share the logged-in page's session cookie.
export const API_BASE = `${BASE_URL}/web/index.php/api/v2`;
