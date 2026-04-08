/* global fetch */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getSessionDir, loadSession, saveSession } from "../session.js";
import { startTask3Server, stopTask3Server } from "../task-3-server.js";
import { getSessionTasks } from "../tasks/index.js";
import { generateScorecard } from "../scorecard.js";

export default async function submit({ session: sessionId, agent }) {
  if (!sessionId) {
    console.error("Error: --session is required.");
    process.exit(1);
  }
  if (!agent) {
    console.error("Error: --agent is required.");
    process.exit(1);
  }

  const cwd = process.cwd();
  const sessionDir = getSessionDir(cwd, sessionId);
  const session = loadSession(sessionDir);
  const sessionTasks = getSessionTasks(session);

  const taskIndex = session.currentTask - 1;
  if (taskIndex >= sessionTasks.length) {
    console.error("Error: All tasks already submitted.");
    process.exit(1);
  }

  // Set agent name on first submission
  if (!session.agent) {
    session.agent = agent;
  }

  const task = sessionTasks[taskIndex];
  const browserProof =
    task.taskDir === "task-3" && session.taskServer
      ? await readTask3BrowserProof(session.taskServer)
      : null;
  let result;
  try {
    result = await task.grade(sessionDir, { browserProof });
  } finally {
    if (task.taskDir === "task-3" && session.taskServer) {
      await stopTask3Server(session.taskServer);
      delete session.taskServer;
    }
  }

  const sessionResult = {
    task: taskIndex + 1,
    name: task.name,
    pass: result.pass,
  };
  if (!result.pass && result.message) {
    sessionResult.reason = result.message;
  }
  session.results.push(sessionResult);
  session.currentTask += 1;

  if (session.currentTask <= sessionTasks.length) {
    const nextTask = sessionTasks[session.currentTask - 1];
    const taskSetupOptions = await buildTaskSetupOptions(
      nextTask,
      session,
      sessionDir,
    );
    nextTask.setup(sessionDir, taskSetupOptions);
    writeInstructions(sessionDir, session, nextTask, sessionTasks.length);
  } else {
    writeFileSync(
      join(sessionDir, "instructions.md"),
      buildCompletionInstructions(session),
    );
  }

  saveSession(sessionDir, session);

  // Update scorecard and results
  const scorecard = generateScorecard({
    agent: session.agent,
    results: session.results,
    taskNames: sessionTasks.map((item) => item.name),
    totalTasks: sessionTasks.length,
    sessionId: session.sessionId,
    timestamp: session.startedAt,
  });
  writeFileSync(join(sessionDir, "scorecard.svg"), scorecard);
  writeFileSync(
    join(sessionDir, "results.json"),
    JSON.stringify(session.results, null, 2),
  );

  const taskNum = taskIndex + 1;
  console.log(`Submission received for Task ${taskNum}.`);

  if (session.currentTask <= sessionTasks.length) {
    const nextTask = sessionTasks[session.currentTask - 1];

    console.log();
    console.log(
      `Task ${session.currentTask} of ${sessionTasks.length}: ${nextTask.name}`,
    );
    console.log(nextTask.description);
    if (session.taskServer?.taskDir === nextTask.taskDir) {
      console.log(
        `Open this URL in your browser tools: ${session.taskServer.url}`,
      );
    }
    console.log();
    console.log(`When finished, run:`);
    console.log(
      `  harness-exam submit --session ${session.sessionId} --agent "${session.agent}"`,
    );
  } else {
    console.log();
    console.log("Exam complete.");
    console.log(`Scorecard: ${join(sessionDir, "scorecard.svg")}`);
    console.log(`Results: ${join(sessionDir, "results.json")}`);
  }
}

async function buildTaskSetupOptions(task, session, sessionDir) {
  if (task.taskDir !== "task-3") {
    return {};
  }

  session.taskServer = await startTask3Server(sessionDir);
  return { taskUrl: session.taskServer.url };
}

function writeInstructions(sessionDir, session, task, totalTasks) {
  writeFileSync(
    join(sessionDir, "instructions.md"),
    `# Harness Exam

Session: ${session.sessionId}
Version: ${session.version}

## Current Task

### Task ${session.currentTask} of ${totalTasks}: ${task.name}
${task.description}
${
  task.taskDir === "task-3" && session.taskServer
    ? `
## Browser Access

This task must be solved by investigating the dashboard in a browser.

Open this URL in your browser tools:

    ${session.taskServer.url}
`
    : ""
}

## Submission

When you have completed the current task, run:

    harness-exam submit --session ${session.sessionId} --agent "${session.agent}"

Additional tasks, if any, will be provided after each submission.
`,
  );
}

function buildCompletionInstructions(session) {
  return `# Harness Exam

Session: ${session.sessionId}
Version: ${session.version}

## Status

Exam complete.
`;
}

async function readTask3BrowserProof(taskServer) {
  try {
    const response = await fetch(
      new URL("/task-3/browser-proof", taskServer.url),
    );
    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}
