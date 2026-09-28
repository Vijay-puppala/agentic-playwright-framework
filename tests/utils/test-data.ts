import { ADMIN_CREDENTIALS } from './env';

export const VALID_USER = ADMIN_CREDENTIALS;

export const MESSAGES = {
  invalidCredentials: 'Invalid credentials',
  required: 'Required',
  saved: 'Successfully Saved',
} as const;

/** Credential combinations that must be rejected by the server. */
export const INVALID_LOGINS = [
  { title: 'wrong password', username: VALID_USER.username, password: 'wrongPass123' },
  { title: 'unknown username', username: 'no_such_user_xyz', password: VALID_USER.password },
  { title: 'wrong username and password', username: 'no_such_user_xyz', password: 'wrongPass123' },
] as const;
