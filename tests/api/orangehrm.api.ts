import { APIRequestContext, APIResponse } from '@playwright/test';
import { API_BASE } from '../utils/env';
import { EmployeeData } from '../data/user.factory';

// Endpoints and response shapes: specs/001-add-admin-ess-users/contracts/orangehrm-api.md.
// Pass the logged-in page's `page.request` so calls share the session cookie.

async function failure(action: string, res: APIResponse): Promise<Error> {
  return new Error(`${action} failed: HTTP ${res.status()} ${await res.text()}`);
}

export async function createEmployee(req: APIRequestContext, employee: EmployeeData): Promise<number> {
  const res = await req.post(`${API_BASE}/pim/employees`, {
    data: { firstName: employee.firstName, middleName: '', lastName: employee.lastName, employeeId: '' },
  });
  if (res.status() !== 200) throw await failure('Create employee', res);
  return (await res.json()).data.empNumber;
}

export async function findUserIdByUsername(req: APIRequestContext, username: string): Promise<number | undefined> {
  const res = await req.get(`${API_BASE}/admin/users`, { params: { username, limit: 50 } });
  if (res.status() !== 200) throw await failure('Find user', res);
  const users: { id: number; userName: string }[] = (await res.json()).data;
  return users.find((u) => u.userName === username)?.id;
}

export async function findEmployeeNumbersByName(req: APIRequestContext, nameOrId: string): Promise<number[]> {
  const res = await req.get(`${API_BASE}/pim/employees`, { params: { nameOrId, limit: 50 } });
  if (res.status() !== 200) throw await failure('Find employees', res);
  return (await res.json()).data.map((e: { empNumber: number }) => e.empNumber);
}

/** Deleting records that are already gone (404 "Records Not Found") counts as success. */
async function deleteByIds(req: APIRequestContext, path: string, ids: number[], action: string): Promise<void> {
  if (ids.length === 0) return;
  const res = await req.delete(`${API_BASE}${path}`, { data: { ids } });
  if (res.status() !== 200 && res.status() !== 404) throw await failure(action, res);
}

export async function deleteUsers(req: APIRequestContext, ids: number[]): Promise<void> {
  await deleteByIds(req, '/admin/users', ids, 'Delete users');
}

export async function deleteEmployees(req: APIRequestContext, empNumbers: number[]): Promise<void> {
  await deleteByIds(req, '/pim/employees', empNumbers, 'Delete employees');
}
