# TODO

Last updated 2026-09-28. See `PROJECT_CONTEXT.md` for the current state and `DECISIONS.md` for the reasons behind it.

## Next up
- [ ] **Merge PR #2** (https://github.com/Vijay-puppala/agentic-playwright-framework/pull/2): the docs-only context files and agent instructions. Check CI with `gh pr checks 2`, and merge only when the user asks. After it merges, GitHub may delete `001-add-admin-ess-users` again; start future work on a new branch.
- [ ] **Run `/pipeline` on a small task** to check the new handoff-file steps: the planner's **Decisions** and **TODO updates** sections, the implementer's writes, the e2e-runner's **New problems**, and the orchestrator's final step 7.

## Known problems / gaps
- [ ] **Committed default admin credentials.** `tests/utils/env.ts` has `Admin`/`admin123` as defaults, and `.env.example` repeats them. They're the public demo's credentials, but CLAUDE.md §5 says test users must come from the environment and not be committed. Decide whether to accept this for the public demo or require `.env`.
- [ ] **`??` vs `||` in `env.ts`.** Empty environment variables replace the defaults. Switch to `||` before CI uses any secrets (see D12).
- [ ] **Node 20 on GitHub Actions is deprecated.** CI logs warn that `checkout@v4`, `setup-node@v4` and `upload-artifact@v4` are being forced onto Node 24. Plan to move the actions to their next majors, and to decide whether `node-version` should stay at 20, which reached end of life in April 2026. Go through the planner, because this is a CI change.
- [ ] **The Spec Kit constitution is still the blank template** (`.specify/memory/constitution.md`). Fill it from CLAUDE.md §1–§9 with `/speckit-constitution`, or leave it and let CLAUDE.md stay the source of truth.
- [ ] **Tags:**
  - 9 of the 12 login and logout tests have no tag.
  - `@flaky` and `@wip` (CLAUDE.md §6) aren't used.
  - The "retry once, then quarantine" rule (§4) has no quarantine mechanism, such as a `@flaky` grep-invert project or a skip list.
- [ ] **`retries` doesn't match "retry once".** CI uses `retries: 2`, while §4 says retry once. Needs a decision, and a plan first because it's a config change.
- [ ] **Tests have to run serially.** `fullyParallel: true` is set but `workers: 1` forces serial runs. That's deliberate (D1), but it means the suite can't run in parallel without first checking data isolation and site load.
- [ ] **Docs don't match the repo.** CLAUDE.md §1–§2 still say pnpm and `tests/pom/`. They're flagged in §10 and haven't been migrated (D3).

## Possible next features
- [ ] Log in as the newly created Admin and ESS users and check what each role can access. This was out of scope for feature 001 and would be a new `/speckit-specify`.
- [ ] Negative validation on the Add User form: duplicate username, weak password, password mismatch, missing employee.
- [ ] Edit, disable and delete a system user through the UI.
- [ ] More browsers: only Chromium is configured right now.

## Operating reminders for the next agent
- **Follow the loop in `AGENTS.md`:** read this file, `PROJECT_CONTEXT.md` and `DECISIONS.md` first, and update all three before finishing.
- **Check the site is up before debugging.** Curl https://opensource-demo.orangehrmlive.com first. `ERR_TIMED_OUT` or `ERR_CONNECTION_CLOSED` means the site is down, not that a test is broken.
- **After every edit,** run `npm run typecheck` and the impacted spec (CLAUDE.md §9).
- **`playwright.config.ts`** can only be edited with a plan.
- **Dependency changes** go in a separate PR.
- **Before deleting any spec,** ask the user.
- **Commits** use Conventional Commits, with no co-author trailers and no "Generated with" footers.
- **Cleanup check:** after any test that creates data, confirm nothing is left on the shared demo, either with the API or with the fixture's `cleanup-warning` annotations.
