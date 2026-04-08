import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const baseIncidentData = JSON.parse(
  gunzipSync(readFileSync(new URL("./data.bin", import.meta.url))).toString(
    "utf8",
  ),
);

const DEPENDENCY_LABELS = [
  "regional vat relay",
  "legacy vat proxy",
  "tax bridge relay",
  "compliance tax bridge",
];

const FIRST_SEGMENT_LABELS = [
  "boutiques",
  "studios",
  "marketplaces",
  "storefronts",
];

const FLAG_SUFFIXES = ["pilot", "canary", "batch", "relay"];

const TRACE_SUFFIXES = ["aurora", "harbor", "signal", "cinder"];

export function buildTask3Scenario(workspaceDir) {
  const seed = createHash("sha256").update(workspaceDir).digest();
  const slug = toBase36(seed.subarray(0, 3), 4);
  const minuteShift = (seed[3] % 4) + 1;
  const hiddenDependencyLabel = pick(DEPENDENCY_LABELS, seed[4]);
  const firstSegmentTail = pick(FIRST_SEGMENT_LABELS, seed[5]);
  const flagSuffix = pick(FLAG_SUFFIXES, seed[6]);
  const traceSuffix = pick(TRACE_SUFFIXES, seed[7]);

  const deployment = `2026.04.03-rc1-${slug}`;
  const asyncFlagId = `async-invoice-sync-${slug}`;
  const asyncFlagName = `async invoice sync ${flagSuffix}`;
  const failingTraceId = `trace-8842-${slug}`;
  const failingTraceTitle = `EU self-serve checkout ${traceSuffix}`;
  const firstAffectedSegment = `EU self-serve ${firstSegmentTail}`;
  const firstFailureAt = shiftTime("09:14 UTC", minuteShift);

  const replacements = new Map([
    ["2026.04.02-stable", `2026.04.02-stable-${slug}`],
    ["2026.04.03-rc1", deployment],
    ["2026.04.03-rollback", `2026.04.03-rollback-${slug}`],
    ["2026-04-02 14:10 UTC", shiftTime("2026-04-02 14:10 UTC", minuteShift)],
    ["2026-04-03 09:12 UTC", shiftTime("2026-04-03 09:12 UTC", minuteShift)],
    ["2026-04-03 10:02 UTC", shiftTime("2026-04-03 10:02 UTC", minuteShift)],
    ["async-invoice-sync", asyncFlagId],
    ["async invoice sync", asyncFlagName],
    ["trace-8842", failingTraceId],
    ["EU self-serve checkout", failingTraceTitle],
    ["EU self-serve merchants", firstAffectedSegment],
    ["legacy tax lookup", hiddenDependencyLabel],
    ["09:14 UTC", firstFailureAt],
    ["09:20 UTC", shiftTime("09:20 UTC", minuteShift)],
    ["09:23 UTC", shiftTime("09:23 UTC", minuteShift)],
    ["09:25 UTC", shiftTime("09:25 UTC", minuteShift)],
    ["09:28 UTC", shiftTime("09:28 UTC", minuteShift)],
    ["09:31 UTC", shiftTime("09:31 UTC", minuteShift)],
    ["09:37 UTC", shiftTime("09:37 UTC", minuteShift)],
  ]);

  const data = applyReplacements(baseIncidentData, replacements);

  return {
    data,
    ids: {
      asyncFlagId,
      asyncFlagName,
      failingTraceId,
      failingTraceTitle,
    },
    expectations: {
      deployment,
      firstAffectedSegment,
      firstFailureAt,
      hiddenDependencyLabel,
      dependencyMarkers: {
        invoiceSync: [normalizeText(asyncFlagName), "invoice sync"],
        hiddenDependency: [
          normalizeText(hiddenDependencyLabel),
          "vat enrichment",
        ],
      },
      requiredBrowserActions: [
        "tab:deployments",
        `deployment:${deployment}`,
        "tab:feature-flags",
        `flag:${asyncFlagId}`,
        "tab:trace-samples",
        `trace:${failingTraceId}`,
        "tab:customer-impact",
        "customer-impact:first-failure",
        `customer:${firstAffectedSegment}`,
      ],
    },
  };
}

function pick(items, value) {
  return items[value % items.length];
}

function toBase36(bytes, length) {
  const value = bytes.reduce((accumulator, byte) => {
    return (accumulator << 8) + byte;
  }, 0);

  return value.toString(36).padStart(length, "0").slice(-length);
}

function applyReplacements(source, replacements) {
  let serialized = JSON.stringify(source);
  for (const [from, to] of replacements) {
    serialized = serialized.replaceAll(from, to);
  }
  return JSON.parse(serialized);
}

function shiftTime(value, minuteShift) {
  const match = value.match(
    /^(?<prefix>.*?)(?<hour>\d{2}):(?<minute>\d{2})(?<suffix> UTC)$/,
  );
  if (!match || !match.groups) {
    return value;
  }

  const totalMinutes =
    Number.parseInt(match.groups.hour, 10) * 60 +
    Number.parseInt(match.groups.minute, 10) +
    minuteShift;
  const hour = String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0");
  const minute = String(totalMinutes % 60).padStart(2, "0");
  return `${match.groups.prefix}${hour}:${minute}${match.groups.suffix}`;
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
