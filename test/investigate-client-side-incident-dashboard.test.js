import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import incidentDashboardTask, {
  gradeIncidentDashboardAnswer,
} from "../src/tasks/03-investigate-client-side-incident-dashboard.js";
import { buildTask3Scenario } from "../src/tasks/task-3-incident-dashboard/scenario.js";

test("gradeIncidentDashboardAnswer fails when task-3-answer.json is missing", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));

  const result = await gradeIncidentDashboardAnswer(workspaceDir);

  assert.equal(result.pass, false);
  assert.match(result.message, /task-3-answer\.json/i);
});

test("gradeIncidentDashboardAnswer fails without recorded browser investigation", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const scenario = buildTask3Scenario(workspaceDir);

  writeFileSync(
    join(workspaceDir, "task-3-answer.json"),
    JSON.stringify(buildCandidateAnswer(scenario), null, 2),
  );

  const result = await gradeIncidentDashboardAnswer(workspaceDir);

  assert.equal(result.pass, false);
  assert.match(result.message, /browser investigation/i);
});

test("task 3 setup writes browser-first instructions without shipping inspectable app files", () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));

  incidentDashboardTask.setup(workspaceDir, {
    taskUrl: "http://127.0.0.1:43127/task-3/",
  });

  assert.equal(existsSync(join(workspaceDir, "task-3", "README.md")), true);
  assert.equal(existsSync(join(workspaceDir, "task-3", "index.html")), false);
  assert.equal(existsSync(join(workspaceDir, "task-3", "app.js")), false);
  assert.equal(existsSync(join(workspaceDir, "task-3", "styles.css")), false);

  const readme = readFileSync(
    join(workspaceDir, "task-3", "README.md"),
    "utf8",
  );
  assert.match(
    readme,
    /must be solved by investigating the dashboard in a browser/i,
  );
  assert.match(readme, /http:\/\/127\.0\.0\.1:43127\/task-3\//);
  assert.doesNotMatch(readme, /evidence panels|observation should explain/i);
});

test("gradeIncidentDashboardAnswer accepts the structured task 3 schema", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const scenario = buildTask3Scenario(workspaceDir);

  writeFileSync(
    join(workspaceDir, "task-3-answer.json"),
    JSON.stringify(buildCandidateAnswer(scenario), null, 2),
  );
  const result = await gradeIncidentDashboardAnswer(workspaceDir, {
    browserProof: {
      completed: true,
      actions: scenario.expectations.requiredBrowserActions,
    },
  });

  assert.equal(result.pass, true);
});

test("gradeIncidentDashboardAnswer accepts a valid task 3 answer without evidence", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const scenario = buildTask3Scenario(workspaceDir);
  const answer = buildCandidateAnswer(scenario);
  delete answer.evidence;

  writeFileSync(
    join(workspaceDir, "task-3-answer.json"),
    JSON.stringify(answer, null, 2),
  );
  const result = await gradeIncidentDashboardAnswer(workspaceDir, {
    browserProof: {
      completed: true,
      actions: scenario.expectations.requiredBrowserActions,
    },
  });

  assert.equal(result.pass, true);
});

test("gradeIncidentDashboardAnswer ignores evidence when extra citations are provided", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const scenario = buildTask3Scenario(workspaceDir);
  const answer = buildCandidateAnswer(scenario);
  answer.evidence.unshift({
    panel: "Customer Impact",
    observation: "Revenue exposure is large in the enterprise rows.",
  });

  writeFileSync(
    join(workspaceDir, "task-3-answer.json"),
    JSON.stringify(answer, null, 2),
  );
  const result = await gradeIncidentDashboardAnswer(workspaceDir, {
    browserProof: {
      completed: true,
      actions: scenario.expectations.requiredBrowserActions,
    },
  });

  assert.equal(result.pass, true);
});

test("gradeIncidentDashboardAnswer ignores incorrect evidence when the required fields are correct", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const scenario = buildTask3Scenario(workspaceDir);
  const answer = buildCandidateAnswer(scenario);
  answer.evidence = [{ panel: "Deployments", observation: "Incorrect." }];

  writeFileSync(
    join(workspaceDir, "task-3-answer.json"),
    JSON.stringify(answer, null, 2),
  );
  const result = await gradeIncidentDashboardAnswer(workspaceDir, {
    browserProof: {
      completed: true,
      actions: scenario.expectations.requiredBrowserActions,
    },
  });

  assert.equal(result.pass, true);
});

function buildCandidateAnswer(scenario) {
  const {
    expectations,
    ids: { asyncFlagName, failingTraceTitle },
  } = scenario;

  return {
    deployment: expectations.deployment,
    dependency: `The ${asyncFlagName} rollout still depended on ${expectations.hiddenDependencyLabel} for VAT enrichment on ${expectations.firstAffectedSegment} invoices.`,
    firstAffectedSegment: expectations.firstAffectedSegment,
    summary:
      "The outage started during the first rc1 rollout wave. Async invoice sync looked isolated from checkout, but the browser drilldowns show it still hit the legacy VAT path. Those retries amplified load until rollback stabilized the billing flow.",
    evidence: [
      {
        panel: "Deployments",
        observation: `Deployment ${expectations.deployment} is the first rollout tied to the spike, and its drilldown says the spike begins after rc1 reaches 35% of traffic before rollback clears the incident.`,
      },
      {
        panel: "Feature Flags",
        observation: `The ${asyncFlagName} flag note says the path still depends on ${expectations.hiddenDependencyLabel} for VAT enrichment when ${expectations.firstAffectedSegment} submit invoices.`,
      },
      {
        panel: "Trace Samples",
        observation: `The failing ${failingTraceTitle} trace shows a timeout on ${expectations.hiddenDependencyLabel} followed by retry fanout in invoice sync, which explains the worker amplification.`,
      },
      {
        panel: "Customer Impact",
        observation: `Sorting Customer Impact by first failure puts ${expectations.firstAffectedSegment} first at ${expectations.firstFailureAt}, earlier than the other listed segments.`,
      },
    ],
  };
}
