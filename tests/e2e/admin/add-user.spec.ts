import { test } from '../../fixtures/pages.fixture';

const ROLES = ['Admin', 'ESS'] as const;

test.describe('Add user', () => {
  for (const role of ROLES) {
    test(`should create a user with the ${role} role @regression`, async ({
      addUserPage,
      systemUsersPage,
      testEmployee,
      newUser,
    }) => {
      // Login, employee setup, save and list search each wait on the slow demo.
      test.slow();
      const user = newUser(role);
      // Lets the failing-test cleanup path be checked without editing this spec (see quickstart.md).
      if (process.env.FORCE_FAIL_BEFORE_SAVE) {
        throw new Error('Forced failure for the cleanup check (FORCE_FAIL_BEFORE_SAVE)');
      }

      await addUserPage.goto();
      await addUserPage.selectRole(user.role);
      await addUserPage.chooseEmployee(testEmployee);
      await addUserPage.selectStatus(user.status);
      await addUserPage.fillCredentials(user.username, user.password);
      await addUserPage.save();
      await addUserPage.expectSaved();

      await systemUsersPage.searchByUsername(user.username);
      await systemUsersPage.expectSingleUser({
        username: user.username,
        role: user.role,
        employeeName: testEmployee.displayName,
        status: user.status,
      });
    });
  }
});
