import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import start from "../src/commands/start.js";
import { resolveTaskSelection } from "../src/tasks/index.js";

test("resolveTaskSelection returns all tasks by default", () => {
  const tasks = resolveTaskSelection();

  assert.equal(tasks.length, 2);
  assert.deepEqual(
    tasks.map((task) => task.taskDir),
    ["task-1", "task-2"],
  );
});

test("start can quietly create a session for only one selected task", async () => {
  const cwd = process.cwd();
  const workspaceRoot = mkdtempSync(join(tmpdir(), "harness-exam-start-"));
  process.chdir(workspaceRoot);

  const originalLog = console.log;
  console.log = () => {};

  try {
    await start({ task: "task-1" });

    const sessionsDir = join(workspaceRoot, ".harness-exam");
    const [sessionId] = readdirSync(sessionsDir);
    const sessionDir = join(sessionsDir, sessionId);
    const session = JSON.parse(
      readFileSync(join(sessionDir, "session.json"), "utf8"),
    );

    assert.deepEqual(session.taskIds, ["task-1"]);
    assert.equal(existsSync(join(sessionDir, "task-1", "README.md")), true);
    assert.equal(existsSync(join(sessionDir, "task-2")), false);
    assert.equal(existsSync(join(sessionDir, "task-3")), false);
  } finally {
    console.log = originalLog;
    process.chdir(cwd);
  }
});

test("start can quietly create a session for only task 2", async () => {
  const cwd = process.cwd();
  const workspaceRoot = mkdtempSync(join(tmpdir(), "harness-exam-start-"));
  process.chdir(workspaceRoot);

  const originalLog = console.log;
  console.log = () => {};

  try {
    await start({ task: "task-2" });

    const sessionsDir = join(workspaceRoot, ".harness-exam");
    const [sessionId] = readdirSync(sessionsDir);
    const sessionDir = join(sessionsDir, sessionId);
    const session = JSON.parse(
      readFileSync(join(sessionDir, "session.json"), "utf8"),
    );

    assert.deepEqual(session.taskIds, ["task-2"]);
    assert.equal(existsSync(join(sessionDir, "task-1")), false);
    assert.equal(existsSync(join(sessionDir, "task-2", "README.md")), true);
    assert.equal(
      existsSync(join(sessionDir, "task-2", "task-2-mysteries-of-london.zip")),
      true,
    );
  } finally {
    console.log = originalLog;
    process.chdir(cwd);
  }
});
