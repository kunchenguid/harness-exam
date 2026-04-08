import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { startTask3Server, stopTask3Server } from "../src/task-3-server.js";
import { buildTask3Scenario } from "../src/tasks/task-3-incident-dashboard/scenario.js";
import { buildBootstrapProof } from "./helpers/task-3-browser-proof.js";

test("task 3 serves an htmx shell without exposing the incident dataset directly", async () => {
  const workspaceDir = mkdtempSync(
    join(tmpdir(), "harness-exam-task3-server-"),
  );
  const taskServer = await startTask3Server(workspaceDir);

  try {
    const pageResponse = await fetch(taskServer.url);
    const html = await pageResponse.text();

    assert.equal(pageResponse.status, 200);
    assert.match(html, /htmx/i);
    assert.doesNotMatch(html, /2026\.04\.03-rc1/);
    assert.doesNotMatch(html, /async invoice sync/i);

    const dataResponse = await fetch(
      new URL("/api/task-3/data", taskServer.url),
    );

    assert.equal(dataResponse.status, 404);
  } finally {
    await stopTask3Server(taskServer);
  }
});

test("task 3 shell uses task-scoped asset URLs so /task-3 works without a trailing slash", async () => {
  const workspaceDir = mkdtempSync(
    join(tmpdir(), "harness-exam-task3-server-"),
  );
  const taskServer = await startTask3Server(workspaceDir);

  try {
    const pageResponse = await fetch(taskServer.url);
    const html = await pageResponse.text();

    assert.equal(pageResponse.status, 200);
    assert.match(html, /href="\/task-3\/styles\.css"/);
    assert.match(html, /src="\/task-3\/htmx\.min\.js"/);
    assert.match(html, /src="\/task-3\/app\.js"/);
  } finally {
    await stopTask3Server(taskServer);
  }
});

test("task 3 rejects browser sessions without a valid browser attestation", async () => {
  const workspaceDir = mkdtempSync(
    join(tmpdir(), "harness-exam-task3-server-"),
  );
  const taskServer = await startTask3Server(workspaceDir);

  try {
    const bootstrapResponse = await fetch(
      new URL("/task-3/browser-session", taskServer.url),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proof: "not-a-browser-proof" }),
      },
    );

    assert.equal(bootstrapResponse.status, 403);

    const dashboardResponse = await fetch(
      new URL(
        "/task-3/dashboard?tab=deployments&region=all&sort=arr",
        taskServer.url,
      ),
      { headers: { "HX-Request": "true" } },
    );

    assert.equal(dashboardResponse.status, 403);
  } finally {
    await stopTask3Server(taskServer);
  }
});

test("task 3 stores browser investigation proof server-side after attested interactions", async () => {
  const workspaceDir = mkdtempSync(
    join(tmpdir(), "harness-exam-task3-server-"),
  );
  const taskServer = await startTask3Server(workspaceDir);
  const scenario = buildTask3Scenario(workspaceDir);

  try {
    const challengeResponse = await fetch(
      new URL("/task-3/bootstrap-challenge", taskServer.url),
    );
    assert.equal(challengeResponse.status, 200);
    const challenge = await challengeResponse.json();

    const bootstrapResponse = await fetch(
      new URL("/task-3/browser-session", taskServer.url),
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proof: buildBootstrapProof(challenge) }),
      },
    );
    assert.equal(bootstrapResponse.status, 200);
    const { secret } = await bootstrapResponse.json();

    const headers = {
      "content-type": "application/json",
      "x-task-3-browser-secret": secret,
    };

    for (const action of scenario.expectations.requiredBrowserActions) {
      const response = await fetch(
        new URL("/task-3/browser-action", taskServer.url),
        {
          method: "POST",
          headers,
          body: JSON.stringify({ action }),
        },
      );
      assert.equal(response.status, 204);
    }

    const proofResponse = await fetch(
      new URL("/task-3/browser-proof", taskServer.url),
    );
    assert.equal(proofResponse.status, 200);
    const proof = await proofResponse.json();
    assert.equal(proof.completed, true);
    assert.deepEqual(
      proof.actions,
      scenario.expectations.requiredBrowserActions,
    );
    assert.equal(
      existsSync(join(workspaceDir, ".task-3-browser-proof.json")),
      false,
    );
  } finally {
    await stopTask3Server(taskServer);
  }
});
