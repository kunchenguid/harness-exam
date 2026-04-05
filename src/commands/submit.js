import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { getSessionDir, loadSession, saveSession } from "../session.js";
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
  const result = await task.grade(sessionDir);

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
    nextTask.setup(sessionDir);

    console.log();
    console.log(
      `Task ${session.currentTask} of ${sessionTasks.length}: ${nextTask.name}`,
    );
    console.log(nextTask.description);
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
