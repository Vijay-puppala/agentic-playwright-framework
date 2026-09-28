# Decisions

Each entry records the decision, why it was made, and what would change it. Newest last. All were made on 2026-09-28 unless marked otherwise.

## D1. Run one test at a time, with long timeouts
- **Decision:** `workers: 1`, a 180s test timeout, 120s navigation timeout, 30s expect timeout and 15s action timeout. `BasePage.navigate` waits only for `domcontentloaded`.
- **Why:** the public demo is shared and slow. Cold loads of its JS bundle took 60s or more, and running tests in parallel made that worse. The slow early runs were caused by the site, not the tests.
- **Revisit if:** tests move to a private OrangeHRM instance.

## D2. Allure 3 (Node) alongside the HTML and JSON reports
- **Decision:** use `allure-playwright` with the Node-based `allure` 3 CLI.
- **Why:** the machine has Java 1.8 only, so Allure 2 can't run. The HTML and JSON reporters stay, as CLAUDE.md §7 requires.
- **Consequence:** never pass `--reporter` on the CLI. It replaces all the configured reporters; this happened once and the HTML report went missing.

## D3. Follow the CLAUDE.md rules, but keep the repo's real tools and paths
- **Decision:** keep npm (not pnpm) and `tests/pages/` (not `tests/pom/`). CLAUDE.md §10 records each gap.
- **Why:** the user chose "Match repo, flag gaps" rather than migrating.

## D4. Five subagents run by a `/pipeline` slash command
- **Decision:** the planner, reviewer, implementer, e2e-runner and ci-cd agents are run in order by `.claude/commands/pipeline.md`. Each one can also be called on its own, and they hand work over through files in `.work/<slug>/`.
- **Why:** the user asked for this order with separate runs possible. A subagent can't start another subagent, so the main session has to orchestrate.
- **Gates:**
  - the reviewer gets at most 2 revision rounds;
  - the user must approve before anything is implemented;
  - the e2e-runner gets 1 fix round, and only for a real test bug;
  - the ci-cd agent runs only when the plan says `ci-impact: yes`;
  - the pipeline never commits.
- **Models:** opus for the planner and reviewer, sonnet for the other three.

## D5. Spec Kit for feature-level work
- **Decision:** installed with `specify init --here --force --integration claude`. It uses PowerShell scripts, sequential feature numbers and the `.claude/skills/speckit-*` skills.
- **Constitution:** `.specify/memory/constitution.md` is still the blank template. CLAUDE.md plays that role in practice.

## D6. Feature 001: scope of the Admin and ESS user tests (user's answers)
- **Employee first:** each test creates a fresh fake employee, because OrangeHRM only lets a user account be created for an existing employee.
- **What counts as verified:** the user is saved ("Successfully Saved") and listed under System Users with the right username, role, employee name and status (Enabled). Logging in as the new user is **out of scope**.
- **Cleanup:** the user and the employee are deleted after every test, whether it passed or failed.

## D7. Create the employee through the API, not the UI
- **Decision:** create the employee with `POST pim/employees` through `page.request`, which reuses the logged-in session cookie. Cleanup also uses the REST API.
- **Why:** it's faster and less flaky than going through the PIM screens, and the feature is about adding users, not employees.

## D8. Cleanup failures never throw
- **Decision:** teardown errors become `cleanup-warning` annotations, and a 404 on delete counts as success.
- **Why:** a cleanup error mustn't hide the test's own result (spec edge case). Because generated data is attached before any creation call, a failed run can always be traced and cleaned up by hand.

## D9. Rules for faker data
- **Names:** letters only. About 5% of faker last names contain `-` or `'`, which broke the exact-match regex for the employee option.
- **Usernames:** lower-case alphanumeric plus a unique suffix, so repeated runs never collide.
- **Passwords:** 12 characters with at least one upper-case letter, one lower-case letter and one digit. That meets the app's rule of at least 7 characters including a number.
- **Picking the employee:** the test types the last name and clicks the suggestion that exactly matches `^first\s+last$`. It never picks the first suggestion.
- **Recording data:** `newUser` is a synchronous factory, so it records the generated data with `testInfo.attachments.push`. The asynchronous `attach` call would be fire-and-forget there.

## D10. Faker as its own commit (CLAUDE.md §9)
- **Decision:** `@faker-js/faker` was added in its own commit, `d278b12`, ahead of the feature.
- **Caveat:** it's in the same PR as the feature. §9 asks for dependency bumps in a *separate PR*, and the user accepted a separate commit.
- **Also:** faker v10 is ESM-only, so CI must use Node ≥20.19.

## D11. CI runs the full suite on every trigger
- **Decision:** PRs, pushes to `main` and manual runs all run `npx playwright test --project=chromium`, with no `--grep`.
- **Why:** the user asked that "each ci flow runs all tests irrespective of tags". This overrides the narrower CLAUDE.md §6 rule ("CI runs @smoke on every PR"), which is still met because the full suite includes the smoke tests.
- **Also:** CI runs on `ubuntu-latest`, headless. `headless: true` is set explicitly in the config (a config change the user approved), and `--headed` still overrides it locally.

## D12. No `ADMIN_*` secrets in CI
- **Decision:** the workflow doesn't read `secrets.ADMIN_USERNAME` or `secrets.ADMIN_PASSWORD`.
- **Why:** an unset secret arrives as an empty string. `tests/utils/env.ts` uses `??`, so the empty string would replace the public demo defaults and login would fail.
- **Before adding secrets:** change `env.ts` to use `||` first.

## D13. Git history
- **Decision:** `main` holds a reconstructed baseline from before the feature, and the feature branch is layered on top as Conventional Commits. The user renamed `master` to `main`.
- **Commit style:** no co-author trailers and no "Generated with" footers, in commits or PR bodies (CLAUDE.md §8, which overrides the tool's default attribution).

## D14. The project's memory lives in handoff files in the repo
- **Decision:** `AGENTS.md` sets the working loop for every coding agent: read `PROJECT_CONTEXT.md`, `TODO.md`, `DECISIONS.md` and the git history first; keep `TODO.md` and `DECISIONS.md` current while working. At the end of **every session**, update all three automatically, even if the user doesn't ask ("Persistent context maintenance"). CLAUDE.md §13 points Claude Code at it.
- **Maintenance rules:**
  - `PROJECT_CONTEXT.md` and `TODO.md` are current state, so remove obsolete entries from them. `DECISIONS.md` is append-only history, with replaced entries marked "Superseded".
  - Don't touch the files if nothing meaningful changed.
  - Never describe unfinished, untested or unpushed work as done.
  - Before stopping, check the files against `git status` and `git log`.
- **Who writes what in `/pipeline`:**
  - The implementer and `ci-cd` append decisions and update `TODO.md` items.
  - The e2e-runner stays read-only and reports **New problems** in `run.md`.
  - The orchestrator updates `PROJECT_CONTEXT.md`, copies new problems and blockers into `TODO.md`, and checks that the plan's **Decisions** were recorded.
  - The planner proposes decisions in `plan.md`. The reviewer blocks any plan that contradicts a recorded decision without proposing a new one.
- **Why:** every session and subagent starts with no memory, and summaries of conversations lose the details. Giving each file a clear owner in the pipeline avoids conflicting edits and keeps the files in sync with the code.
- **Revisit if:** the files grow too big to read at the start of every task. If so, archive superseded decisions and finished TODO items.
