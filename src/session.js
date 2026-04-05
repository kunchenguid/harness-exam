import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { getVersion } from "./utils.js";

const WORKSPACE_DIR = ".harness-exam";

export function getWorkspaceRoot(cwd) {
  return join(cwd, WORKSPACE_DIR);
}

export function getSessionDir(cwd, sessionId) {
  return join(cwd, WORKSPACE_DIR, sessionId);
}

export function createSession(cwd, options = {}) {
  const sessionId = randomUUID();
  const sessionDir = getSessionDir(cwd, sessionId);
  mkdirSync(sessionDir, { recursive: true });

  const session = {
    sessionId,
    version: getVersion(),
    startedAt: new Date().toISOString(),
    agent: null,
    currentTask: 1,
    results: [],
  };
  if (options.taskIds) {
    session.taskIds = options.taskIds;
  }
  writeFileSync(
    join(sessionDir, "session.json"),
    JSON.stringify(session, null, 2),
  );
  return session;
}

export function loadSession(sessionDir) {
  try {
    const raw = readFileSync(join(sessionDir, "session.json"), "utf8");
    return JSON.parse(raw);
  } catch {
    throw new Error('No session found. Run "harness-exam start" first.');
  }
}

export function saveSession(sessionDir, session) {
  writeFileSync(
    join(sessionDir, "session.json"),
    JSON.stringify(session, null, 2),
  );
}
