import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import start from "../src/commands/start.js";
import submit from "../src/commands/submit.js";
import { buildTask3Scenario } from "../src/tasks/task-3-incident-dashboard/scenario.js";
import { buildBootstrapProof } from "./helpers/task-3-browser-proof.js";

test("submitting task 3 shuts down its local server and clears session metadata", async () => {
  const cwd = process.cwd();
  const workspaceRoot = mkdtempSync(join(tmpdir(), "harness-exam-submit-"));
  process.chdir(workspaceRoot);

  const originalLog = console.log;
  console.log = () => {};

  try {
    await start({ task: "task-3" });

    const sessionsDir = join(workspaceRoot, ".harness-exam");
    const [sessionId] = JSON.parse(
      JSON.stringify((await import("node:fs")).readdirSync(sessionsDir)),
    );
    const sessionDir = join(sessionsDir, sessionId);
    const sessionBefore = JSON.parse(
      readFileSync(join(sessionDir, "session.json"), "utf8"),
    );

    const response = await fetch(sessionBefore.taskServer.url);
    assert.equal(response.status, 200);

    const scenario = buildTask3Scenario(sessionDir);

    const challengeResponse = await fetch(
      new URL("/task-3/bootstrap-challenge", sessionBefore.taskServer.url),
    );
    const challenge = await challengeResponse.json();
    const browserSessionResponse = await fetch(
      new URL("/task-3/browser-session", sessionBefore.taskServer.url),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proof: buildBootstrapProof(challenge) }),
      },
    );
    const { secret } = await browserSessionResponse.json();

    for (const action of scenario.expectations.requiredBrowserActions) {
      const actionResponse = await fetch(
        new URL("/task-3/browser-action", sessionBefore.taskServer.url),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-task-3-browser-secret": secret,
          },
          body: JSON.stringify({ action }),
        },
      );
      assert.equal(actionResponse.status, 204);
    }

    writeFileSync(
      join(sessionDir, "task-3-answer.json"),
      JSON.stringify(buildCandidateAnswer(scenario), null, 2),
    );

    await submit({ session: sessionId, agent: "Test Agent" });

    const sessionAfter = JSON.parse(
      readFileSync(join(sessionDir, "session.json"), "utf8"),
    );
    assert.equal(sessionAfter.taskServer, undefined);

    await assert.rejects(fetch(sessionBefore.taskServer.url));
  } finally {
    console.log = originalLog;
    process.chdir(cwd);
  }
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
