---
description: Run a change through the agent pipeline, in order planner → reviewer → implementer → e2e-runner → ci-cd, or run one stage with --only / resume with --from
argument-hint: <task> [--only <stage>] [--from <stage>]
---

You are the orchestrator. You don't plan, write code or run tests yourself. You call the subagents in order with the Agent tool, pass them the work folder, read their output files, and decide the next step.

Arguments: $ARGUMENTS

Stages, in order: `planner`, `reviewer`, `implementer`, `e2e-runner`, `ci-cd`.

## Setup
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

## Final summary (to the user)
- One line per stage: its status and which file it wrote.
- Files changed, from `impl.md` and `ci.md`.
- The test result from `run.md`.
- Report links: `playwright-report/index.html` (`npm run report`) and `allure-report/index.html` (`npm run allure:open`).

## Stopping points
Don't commit. If the user asks for a commit afterwards, follow CLAUDE.md §8: Conventional Commits, no co-author trailer, no "Generated with" footer.
