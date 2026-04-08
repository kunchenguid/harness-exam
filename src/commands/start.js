import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  appendFileSync,
} from "node:fs";
import { join } from "node:path";
import { getSessionDir, createSession, saveSession } from "../session.js";
import { startTask3Server } from "../task-3-server.js";
import { resolveTaskSelection } from "../tasks/index.js";

export default async function start({ task } = {}) {
  const cwd = process.cwd();
  addGitExclude(cwd);
  const sessionTasks = resolveTaskSelection(task);

  const session = createSession(cwd, {
    taskIds: sessionTasks.map((item) => item.taskDir),
  });
  const sessionDir = getSessionDir(cwd, session.sessionId);

  const firstTask = sessionTasks[0];
  const taskSetupOptions = await buildTaskSetupOptions(firstTask, session);
  firstTask.setup(sessionDir, taskSetupOptions);
  saveSession(sessionDir, session);

  const instructions = buildInstructions(
    session,
    firstTask,
    sessionTasks.length,
  );
  writeFileSync(join(sessionDir, "instructions.md"), instructions);

  console.log(`===== HARNESS EXAM =====`);
  console.log(`Session: ${session.sessionId}`);
  console.log(`Workspace: ${sessionDir}`);
  console.log();
  console.log(`Task 1 of ${sessionTasks.length}: ${firstTask.name}`);
  console.log(firstTask.description);
  if (session.taskServer?.taskDir === firstTask.taskDir) {
    console.log(
      `Open this URL in your browser tools: ${session.taskServer.url}`,
    );
  }
  console.log();
  console.log(`When finished, run:`);
  console.log(
    `  harness-exam submit --session ${session.sessionId} --agent "Your Agent Name"`,
  );
  console.log(`========================`);
}

function buildInstructions(session, firstTask, totalTasks) {
  const taskSpecificInstructions =
    firstTask.taskDir === "task-3" && session.taskServer
      ? `
## Browser Access

This task must be solved by investigating the dashboard in a browser.

Open this URL in your browser tools:

    ${session.taskServer.url}
`
      : "";

  return `# Harness Exam

Session: ${session.sessionId}
Version: ${session.version}

## Current Task

### Task 1 of ${totalTasks}: ${firstTask.name}
${firstTask.description}
${taskSpecificInstructions}

## Submission

When you have completed the current task, run:

    harness-exam submit --session ${session.sessionId} --agent "Your Agent Name"

Additional tasks, if any, will be provided after each submission.
`;
}

async function buildTaskSetupOptions(task, session) {
  if (task.taskDir !== "task-3") {
    return {};
  }

  session.taskServer = await startTask3Server(
    getSessionDir(process.cwd(), session.sessionId),
  );
  return { taskUrl: session.taskServer.url };
}

function addGitExclude(cwd) {
  const excludePath = join(cwd, ".git", "info", "exclude");
  if (!existsSync(join(cwd, ".git"))) return;

  try {
    mkdirSync(join(cwd, ".git", "info"), { recursive: true });
    const existing = existsSync(excludePath)
      ? readFileSync(excludePath, "utf8")
      : "";
    if (!existing.includes(".harness-exam")) {
      appendFileSync(excludePath, "\n.harness-exam\n");
    }
  } catch {
    // Not critical — skip silently
  }
}
