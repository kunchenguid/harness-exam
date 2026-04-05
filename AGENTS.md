# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## What This Is

A benchmark exam CLI for coding agents. It presents a sequence of tasks, grades submissions, and produces an SVG scorecard. No runtime dependencies — only Node.js built-ins.

## Commands

```bash
npm run lint          # ESLint (flat config, v9)
npm run format:check  # Prettier check
npm run format        # Prettier write
npm link              # Register the command globally

# Run the CLI locally
node bin/cli.js start
node bin/cli.js submit --session <id> --agent "Name"
```

Maintainer note: `start` also accepts a hidden `--task <selector>` flag for bootstrapping a session with exactly one task. Selectors currently support task number (for example `--task 2`), `taskDir` (for example `--task task-2`), or the exact task name case-insensitively. This path is intentionally undocumented in the public CLI help text.

## Architecture

**Flow:** `bin/cli.js` → commands (`start`, `submit`) → task modules → session/scorecard.

- **`bin/cli.js`** — Entry point. Hand-rolled arg parser (no dependencies), dynamic imports for commands.
- **`src/commands/start.js`** — Creates a session under `.harness-exam/<uuid>/`, sets up the first selected task, writes `instructions.md`. Supports a hidden single-task bootstrap mode via `--task`.
- **`src/commands/submit.js`** — Grades the current task, advances `session.json`, sets up the next task, regenerates `scorecard.svg` and `results.json`.
- **`src/tasks/`** — Each task exports `{ name, taskDir, description, setup(dir), grade(dir) }`. Tasks write fixture files into the session workspace and grade by running tests or checking file content.
- **`src/session.js`** — Session CRUD under `.harness-exam/<uuid>/session.json`. State tracks `currentTask` index, `results[]`, and an optional per-session `taskIds[]` override for hidden single-task runs.
- **`src/scorecard.js`** — Generates an SVG scorecard with progress ring and per-task pass/fail rows.
- **`src/utils.js`** — `getVersion()` (reads package.json), `runNode()` (execFile with 10s timeout), `parseArgs()`.

The `.harness-exam/` directory is added to `.git/info/exclude` automatically so session artifacts don't pollute the repo.

## Style

- ESM (`"type": "module"`) — use `import`/`export`, not `require`.
