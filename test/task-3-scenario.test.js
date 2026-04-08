import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildTask3Scenario } from "../src/tasks/task-3-incident-dashboard/scenario.js";

test("buildTask3Scenario produces deterministic session-specific expectations", () => {
  const workspaceDir = mkdtempSync(
    join(tmpdir(), "harness-exam-task3-scenario-"),
  );

  const first = buildTask3Scenario(workspaceDir);
  const second = buildTask3Scenario(workspaceDir);

  assert.deepEqual(second, first);
  assert.match(first.expectations.deployment, /^2026\.04\.03-rc1-[a-z0-9]{4}$/);
  assert.notEqual(first.expectations.deployment, "2026.04.03-rc1");
  assert.notEqual(
    first.expectations.firstAffectedSegment,
    "EU self-serve merchants",
  );
  assert.match(first.expectations.hiddenDependencyLabel, /vat|tax/i);
});

test("buildTask3Scenario derives required browser actions from randomized ids", () => {
  const workspaceDir = mkdtempSync(
    join(tmpdir(), "harness-exam-task3-scenario-"),
  );
  const scenario = buildTask3Scenario(workspaceDir);

  assert.deepEqual(scenario.expectations.requiredBrowserActions, [
    "tab:deployments",
    `deployment:${scenario.expectations.deployment}`,
    "tab:feature-flags",
    `flag:${scenario.ids.asyncFlagId}`,
    "tab:trace-samples",
    `trace:${scenario.ids.failingTraceId}`,
    "tab:customer-impact",
    "customer-impact:first-failure",
    `customer:${scenario.expectations.firstAffectedSegment}`,
  ]);
});
