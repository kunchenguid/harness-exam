import neovimReleaseNotes from "./01-rewrite-long-web-content.js";
import zippedNovelReasoning from "./02-reason-over-zipped-novel.js";
import incidentDashboard from "./03-investigate-client-side-incident-dashboard.js";

export const tasks = [
  neovimReleaseNotes,
  zippedNovelReasoning,
  incidentDashboard,
];

export function resolveTaskSelection(taskSelection) {
  if (!taskSelection) {
    return tasks;
  }

  const trimmedSelection = taskSelection.trim();
  const taskNumber = Number(trimmedSelection);
  if (
    Number.isInteger(taskNumber) &&
    taskNumber >= 1 &&
    taskNumber <= tasks.length
  ) {
    return [tasks[taskNumber - 1]];
  }

  const normalizedSelection = trimmedSelection.toLowerCase();
  const selectedTask = tasks.find(
    (task) =>
      task.taskDir === trimmedSelection ||
      task.name.toLowerCase() === normalizedSelection,
  );

  if (!selectedTask) {
    throw new Error(`Unknown task "${taskSelection}".`);
  }

  return [selectedTask];
}

export function getSessionTasks(session) {
  if (!Array.isArray(session.taskIds) || session.taskIds.length === 0) {
    return tasks;
  }

  return session.taskIds.map((taskId) => {
    const task = tasks.find((item) => item.taskDir === taskId);
    if (!task) {
      throw new Error(`Session references unknown task "${taskId}".`);
    }
    return task;
  });
}
