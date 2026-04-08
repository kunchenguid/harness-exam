import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildTask3Scenario } from "./task-3-incident-dashboard/scenario.js";

const TASK_DIR = "task-3";
const TASK_NAME = "investigate-client-side-incident-dashboard";
const OUTPUT_FILE = "task-3-answer.json";

export default {
  name: TASK_NAME,
  taskDir: TASK_DIR,
  description:
    "Investigate a local browser-only incident dashboard and explain the rollout, hidden dependency, and first affected customer segment.",

  setup(workspaceDir, options = {}) {
    const dir = join(workspaceDir, TASK_DIR);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "README.md"), buildTaskReadme(options.taskUrl));
  },

  async grade(workspaceDir, options) {
    return gradeIncidentDashboardAnswer(workspaceDir, options);
  },
};

export async function gradeIncidentDashboardAnswer(workspaceDir, options = {}) {
  const outputPath = join(workspaceDir, OUTPUT_FILE);
  if (!existsSync(outputPath)) {
    return {
      pass: false,
      message: `Missing ${OUTPUT_FILE} in the workspace root.`,
    };
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(outputPath, "utf8"));
  } catch {
    return {
      pass: false,
      message: `${OUTPUT_FILE} must contain valid JSON.`,
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      pass: false,
      message: `${OUTPUT_FILE} must contain a top-level JSON object.`,
    };
  }

  const failures = [];
  const browserProof = options.browserProof ?? null;
  const scenario = buildTask3Scenario(workspaceDir);
  const { expectations } = scenario;
  const deployment =
    typeof parsed.deployment === "string" ? parsed.deployment.trim() : "";
  const dependency =
    typeof parsed.dependency === "string" ? parsed.dependency.trim() : "";
  const firstAffectedSegment =
    typeof parsed.firstAffectedSegment === "string"
      ? parsed.firstAffectedSegment.trim()
      : "";
  const summary =
    typeof parsed.summary === "string" ? parsed.summary.trim() : "";

  if (deployment !== expectations.deployment) {
    failures.push(`deployment must be ${expectations.deployment}.`);
  }

  if (
    normalizeText(firstAffectedSegment) !==
    normalizeText(expectations.firstAffectedSegment)
  ) {
    failures.push(
      `firstAffectedSegment must be ${expectations.firstAffectedSegment}.`,
    );
  }

  const normalizedDependency = normalizeText(dependency);
  if (dependency.length === 0) {
    failures.push("dependency must be a non-empty string.");
  } else if (
    !containsAny(
      normalizedDependency,
      expectations.dependencyMarkers.invoiceSync,
    ) ||
    !containsAny(
      normalizedDependency,
      expectations.dependencyMarkers.hiddenDependency,
    )
  ) {
    failures.push(
      `dependency must mention invoice sync and ${expectations.hiddenDependencyLabel}.`,
    );
  }

  if (countWords(summary) < 20) {
    failures.push("summary must explain the outage in at least 20 words.");
  }

  if (!browserProof) {
    failures.push(
      "A recorded browser investigation is required. Re-open the dashboard in a browser and inspect the required clues before submitting.",
    );
  } else {
    const actions = Array.isArray(browserProof.actions)
      ? browserProof.actions
      : [];
    const missingBrowserActions = expectations.requiredBrowserActions.filter(
      (action) => !actions.includes(action),
    );
    if (!browserProof.completed || missingBrowserActions.length > 0) {
      failures.push(
        "The browser investigation record is incomplete. Visit the deployments, feature flags, trace samples, and customer impact views, inspect the key rollout/flag/trace/customer clues, and use the first-failure customer sort before submitting.",
      );
    }
  }

  return {
    pass: failures.length === 0,
    message:
      failures.length === 0 ? "Task 3 answer validated." : failures.join(" "),
  };
}

export function buildTaskReadme(taskUrl) {
  return `# Task 3: ${TASK_NAME}

This task must be solved by investigating the dashboard in a browser.

## App

- Open this URL in your browser tools: ${taskUrl}
- Use the browser UI to investigate the incident.
- The incident values are session-specific, so quote the live deployment id, dependency, and segment shown in your browser.
- Relevant clues are presented through tabs, chart tooltips, drilldowns, filters, and sorting.
- The task server automatically records the required browser interactions; a correct JSON answer without that browser investigation will not pass.
- The task server is available only while Task 3 is active.

## Question

Determine:

1. Which deployment introduced the outage
2. What hidden dependency caused it
3. Which customer segment was affected first

## Output

Write a JSON file named \

	\`${OUTPUT_FILE}\` in the workspace root, next to this \`${TASK_DIR}/\` directory.

Use this shape:

\`\`\`json
{
  "deployment": "deployment id",
  "dependency": "short description of the hidden dependency",
  "firstAffectedSegment": "segment name",
  "summary": "2-5 sentences explaining the outage across the dashboard"
}
\`\`\`

## Requirements

- The file must be valid JSON.
- Base the answer on the browser investigation and recorded dashboard interactions.
`;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsAny(text, phrases) {
  return phrases.some((phrase) => text.includes(normalizeText(phrase)));
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
