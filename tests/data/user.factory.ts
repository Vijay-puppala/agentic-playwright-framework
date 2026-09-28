import { faker } from '@faker-js/faker';
import { uniqueSuffix } from '../utils/helpers';

export type UserRole = 'Admin' | 'ESS';

export interface EmployeeData {
  firstName: string;
  lastName: string;
}

export interface NewSystemUser {
  role: UserRole;
  status: 'Enabled';
  username: string;
  password: string;
}

// ~5% of faker last names contain '-' or "'" (e.g. "Stroman-Block", "D'Amore"); letters only keeps
// the employee autocomplete search and list comparison predictable.
const lettersOnly = (value: string): string => value.replace(/[^A-Za-z]/g, '');

export function buildEmployee(): EmployeeData {
  return {
    firstName: lettersOnly(faker.person.firstName()) || 'Test',
    // The unique suffix makes the autocomplete match unique across runs.
    lastName: lettersOnly(faker.person.lastName()) + uniqueSuffix(),
  };
}

/**
 * OrangeHRM rules: username >= 5 chars and unique; password >= 7 chars with at least 1 number.
 * The generated values clear both with margin.
 */
export function buildSystemUser(role: UserRole): NewSystemUser {
  // faker usernames contain '_', '.', '-' and capitals; keep lower-case alphanumerics only.
  const stem = faker.internet.username().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
  const password = faker.helpers
    .shuffle([
      ...faker.string.alpha({ length: 1, casing: 'upper' }),
      ...faker.string.alpha({ length: 1, casing: 'lower' }),
      ...faker.string.numeric(1),
      ...faker.string.alphanumeric(9),
    ])
    .join('');

  return {
    role,
    status: 'Enabled',
    username: `${stem}${uniqueSuffix()}`,
    password,
  };
}
