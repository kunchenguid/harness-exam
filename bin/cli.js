#!/usr/bin/env node

import { parseArgs } from "../src/utils.js";

const command = process.argv[2];
const args = parseArgs(process.argv.slice(3));

try {
  switch (command) {
    case "start": {
      const { default: start } = await import("../src/commands/start.js");
      await start(args);
      break;
    }
    case "submit": {
      const { default: submit } = await import("../src/commands/submit.js");
      await submit(args);
      break;
    }
    default:
      console.log(`harness-exam v0.1.0 — A benchmark exam for coding agents

Usage:
  harness-exam start                Start the exam
  harness-exam submit [options]     Submit current task

Options for submit:
  --session <id>    Session ID from start command
  --agent <name>    Agent name (e.g. "Claude Code")`);
      break;
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
