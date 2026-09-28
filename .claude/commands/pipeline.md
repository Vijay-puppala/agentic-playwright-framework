---
description: Run a change through the agent pipeline, in order planner → reviewer → implementer → e2e-runner → ci-cd, or run one stage with --only / resume with --from
argument-hint: <task> [--only <stage>] [--from <stage>]
---

You are the orchestrator. You don't plan, write code or run tests yourself. You call the subagents in order with the Agent tool, pass them the work folder, read their output files, and decide the next step.

Arguments: $ARGUMENTS

Stages, in order: `planner`, `reviewer`, `implementer`, `e2e-runner`, `ci-cd`.

## Setup
0. Read `AGENTS.md`, `PROJECT_CONTEXT.md`, `TODO.md` and `DECISIONS.md`, and run `git log --oneline -15` and `git status`. Tell every agent to read the three handoff files, and pass along any `TODO.md` item or `D<n>` the task touches.
1. Parse `--only <stage>` or `--from <stage>` from the arguments. Everything else is the task.
2. Make a short kebab-case slug from the task. The work folder is `.work/<slug>/`. If it already exists and neither flag was given, ask whether to resume it or start fresh.
3. `--only` runs just that stage; skip the loops and the approval gate. `--from` starts at that stage and requires the earlier stages' files to already be in the folder.

## Every agent call
Give the agent: the task text, the work folder path, and what it should read and write. Subagents start with no memory of this conversation, so they only know what's in the prompt and on disk.

## Flow
1. **planner:** writes `plan.md`.
2. **reviewer:** writes `review.md`.
   If the verdict is `CHANGES_REQUESTED`, call the planner again, telling it to address `review.md`, then review again. Allow at most 2 revision rounds. If it's still not approved, stop and show the user the open findings.
3. **Approval gate:** show the user the Goal, Changes, the three flags from `plan.md`, and any review findings. Then ask with AskUserQuestion whether to implement. Don't continue without a yes.
   If `deps-change: yes`, point out that CLAUDE.md §9 puts dependency bumps in a separate PR.
4. **implementer:** writes code and `impl.md`. If it reports a deviation or a blocker (plan wrong, dependency needed, spec deletion), stop and bring it to the user.
5. **e2e-runner:** runs the impacted specs from `plan.md` and writes `run.md`.
   - If the site is down, stop and report. Don't loop.
   - If there are test bugs, call the implementer once more to fix only those, then call the e2e-runner again. If it still fails, stop and report.
6. **ci-cd:** only if `plan.md` says `ci-impact: yes`. Otherwise write "skipped: no CI impact" in the summary.
7. **Handoff files** (you do this yourself; it's the one file edit the orchestrator makes). Run it whenever the pipeline got as far as the implementer, including when it stopped early:
   - **`PROJECT_CONTEXT.md`:** update the sections that changed (layout, how the tests work, CI, verified results, git/PR state) and the "Last updated" date.
   - **`TODO.md`:** add everything under **New problems** in `run.md`, anything that stopped the pipeline (site down, a blocker, an unresolved test bug), and any deferred `deps-change`.
   - **`DECISIONS.md`:** check that each decision in the plan's **Decisions** section was recorded by the implementer or `ci-cd`. Add any that are missing.
   - For `--only` runs of the planner or reviewer, skip this step, because nothing in the repo changed.

## Final summary (to the user)
- One line per stage: its status and which file it wrote.
- Files changed, from `impl.md` and `ci.md`.
- The test result from `run.md`.
- What changed in the handoff files: the new `D<n>` entries and the TODO items closed or added.
- Report links: `playwright-report/index.html` (`npm run report`) and `allure-report/index.html` (`npm run allure:open`).

## Stopping points
Don't commit. If the user asks for a commit afterwards, follow CLAUDE.md §8: Conventional Commits, no co-author trailer, no "Generated with" footer.
