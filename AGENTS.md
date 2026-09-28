# AGENTS.md

These instructions apply to any coding agent working in this repo: Claude Code, its subagents in `.claude/agents/`, Codex, Cursor, or others. The team rules (locators, waits, data, tags, commits) are in `CLAUDE.md`. This file covers how work is started, tracked and handed over.

## Handoff files
| File | Holds | Who updates it |
|---|---|---|
| `PROJECT_CONTEXT.md` | The current state: branches and PRs, stack, layout, how the tests work, CI, verified results | Every session, at the end (see below). In `/pipeline`, the orchestrator does it at the end of the run. |
| `TODO.md` | Next steps, known problems and gaps, possible features | Anyone who finishes, finds or defers work |
| `DECISIONS.md` | Numbered decisions (D1, D2, …), each with its reason and what would change it | Whoever makes an architectural or process decision |

## Before making changes
1. Read `PROJECT_CONTEXT.md`.
2. Read `TODO.md`.
3. Read `DECISIONS.md`.
4. Read the source files the task touches. `CLAUDE.md` §10–§11 cover the repo's quirks.
5. Check the recent git history: `git log --oneline -15` and `git status`. Also note which branch you're on and whether a PR is open (`gh pr list`).

## During work
- **Keep `TODO.md` current:** tick off what you finish, and add follow-ups or problems you find.
- **Record decisions in `DECISIONS.md`:** add important architectural or process decisions as the next `D<n>`, with the reason and what would change it. If a decision replaces an older one, say which, and mark the old one "Superseded by D<n>" rather than deleting it.
- **Understand before changing the architecture.** Don't rewrite existing architecture until you know why it exists. Check `DECISIONS.md` first. Some examples:
  - `workers: 1` (D1);
  - employees created through the API (D7);
  - cleanup that never throws (D8);
  - CI running every test (D11);
  - no admin secrets in CI (D12).
  To change one of these, propose a new decision; don't just edit around it.
- **Run the relevant tests before calling work done:**
  - `npm run typecheck`, plus the impacted specs (`npx playwright test <spec> --project=chromium`).
  - Never pass `--reporter`.
  - Check the demo site is up first. Site-down errors aren't test bugs (CLAUDE.md §11).

## Persistent context maintenance (every session)
At the end of **every session**, update the persistent context files automatically, whether or not the user asks. Also do it after each substantial task within a session. First review the work done in the session, then update:

- **`PROJECT_CONTEXT.md`:** the current architecture and implementation state: branch, commits, PR and CI status, layout, fixtures, verified test results.
- **`TODO.md`:** remaining and newly discovered work, and known problems.
- **`DECISIONS.md`:** important technical and architectural decisions, as the next `D<n>`.

Rules:
- **Don't copy the conversation into these files.** Write down facts: file paths, commit hashes, test counts, dates (`Last updated YYYY-MM-DD`).
- **Keep them short and useful** to the next agent.
- **Remove obsolete information** from `PROJECT_CONTEXT.md` and `TODO.md`, such as finished items and stale state. `DECISIONS.md` is a history: mark a replaced decision "Superseded by D<n>" rather than deleting it.
- **Record what matters:** meaningful changes, decisions, discoveries and unresolved issues.
- **Leave the files alone when nothing meaningful changed,** for example after a question-only session. Don't bump dates for no reason.
- **Don't claim work is complete unless it is.** Untested, uncommitted, unpushed or partly done work must be described as exactly that.
- **Keep what's still relevant** from earlier sessions.

**Before ending the session,** check that the persistent context matches the actual repo: compare it against `git status`, `git log`, the branch and PR state, and the files on disk. Also leave the repo reproducible:
- typecheck is clean;
- tests pass, or their failures are recorded in `TODO.md` with triage;
- no test data is left on the shared demo;
- no stray scratch files;
- `git status` shows only intended changes.

## Starting a new session
Paste this as the first prompt:

> Read AGENTS.md, PROJECT_CONTEXT.md, TODO.md, DECISIONS.md, README.md, and the recent git history. Understand the existing project before making changes. Then continue from the current state.
