import { getVersion } from "./utils.js";

export function generateScorecard({
  agent,
  results,
  taskNames = [],
  totalTasks,
  sessionId,
  timestamp,
}) {
  const version = getVersion();
  const passCount = results.filter((r) => r.pass).length;
  const answered = results.length;
  const pct = totalTasks > 0 ? passCount / totalTasks : 0;

  // Progress ring math
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const passOffset = circumference * (1 - pct);
  // Task rows
  const visibleTaskNames = Array.from(
    { length: totalTasks },
    (_, i) => taskNames[i] ?? results[i]?.name ?? `Task ${i + 1}`,
  );
  const taskRows = visibleTaskNames
    .map((name, i) => {
      const y = 250 + i * 52;
      if (i < results.length) {
        const r = results[i];
        const color = r.pass ? "#00d68f" : "#ff3d71";
        const icon = r.pass ? "\u2713" : "\u2717";
        const barWidth = r.pass ? 680 : 680;
        return `
      <g>
        <rect x="60" y="${y}" width="680" height="40" rx="8" fill="${color}22" />
        <rect x="60" y="${y}" width="${barWidth}" height="40" rx="8" fill="none" stroke="${color}" stroke-width="1.5" />
        <text x="80" y="${y + 26}" fill="${color}" font-size="18" font-weight="600">${icon}</text>
        <text x="108" y="${y + 26}" fill="#e0e0e0" font-size="16">Task ${i + 1}: ${name}</text>
        <text x="700" y="${y + 26}" fill="${color}" font-size="14" font-weight="600" text-anchor="end">${r.pass ? "PASS" : "FAIL"}</text>
      </g>`;
      } else {
        return `
      <g>
        <rect x="60" y="${y}" width="680" height="40" rx="8" fill="#ffffff08" />
        <rect x="60" y="${y}" width="680" height="40" rx="8" fill="none" stroke="#444" stroke-width="1" stroke-dasharray="4 4" />
        <text x="108" y="${y + 26}" fill="#666" font-size="16">Task ${i + 1}: ${name}</text>
        <text x="700" y="${y + 26}" fill="#666" font-size="14" text-anchor="end">PENDING</text>
      </g>`;
      }
    })
    .join("\n");

  // Badges
  const badges = [];
  if (results[0]?.pass) badges.push("Bug Squasher");
  if (results[1]?.pass) badges.push("Implementer");
  if (results[2]?.pass) badges.push("Data Wrangler");
  if (passCount === totalTasks && answered === totalTasks)
    badges.push("Perfect Score \u2605");

  const badgePills = badges
    .map((label, i) => {
      const x = 60 + i * 170;
      const w = label.length * 10 + 24;
      return `
      <g>
        <rect x="${x}" y="420" width="${w}" height="28" rx="14" fill="#00d68f22" stroke="#00d68f" stroke-width="1" />
        <text x="${x + w / 2}" y="439" fill="#00d68f" font-size="12" font-weight="600" text-anchor="middle">${label}</text>
      </g>`;
    })
    .join("\n");

  const date = timestamp ? timestamp.split("T")[0] : "";
  const shortSession = sessionId.split("-")[0] + "...";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="480" viewBox="0 0 800 480">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f0f1a" />
      <stop offset="100%" stop-color="#1a1a2e" />
    </linearGradient>
  </defs>

  <rect width="800" height="480" fill="url(#bg)" rx="16" />

  <style>
    text { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; }
  </style>

  <!-- Title -->
  <text x="60" y="50" fill="#ffffff" font-size="28" font-weight="700" letter-spacing="2">HARNESS EXAM</text>
  <text x="740" y="50" fill="#666" font-size="14" text-anchor="end">v${version}</text>

  <!-- Divider -->
  <line x1="60" y1="65" x2="740" y2="65" stroke="#333" stroke-width="1" />

  <!-- Agent name -->
  <text x="60" y="100" fill="#888" font-size="14">AGENT</text>
  <text x="60" y="128" fill="#ffffff" font-size="22" font-weight="600">${escapeXml(agent || "Unknown")}</text>

  <!-- Score ring -->
  <g transform="translate(680, 110)">
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#222" stroke-width="8" />
    <circle cx="0" cy="0" r="${radius}" fill="none" stroke="#00d68f" stroke-width="8"
      stroke-dasharray="${circumference}" stroke-dashoffset="${passOffset}"
      stroke-linecap="round" transform="rotate(-90)" />
    <text x="0" y="8" fill="#ffffff" font-size="28" font-weight="700" text-anchor="middle">${passCount}/${totalTasks}</text>
  </g>

  <!-- Subtitle -->
  <text x="60" y="165" fill="#888" font-size="13">${answered} of ${totalTasks} tasks completed</text>

  <!-- Divider -->
  <line x1="60" y1="180" x2="740" y2="180" stroke="#333" stroke-width="1" />

  <!-- Section label -->
  <text x="60" y="210" fill="#888" font-size="13" letter-spacing="1">RESULTS</text>

  <!-- Task rows -->
  ${taskRows}

  <!-- Badges -->
  ${badges.length > 0 ? badgePills : ""}

  <!-- Footer -->
  <text x="60" y="470" fill="#444" font-size="11">Session: ${shortSession}</text>
  <text x="400" y="470" fill="#444" font-size="11" text-anchor="middle">${date}</text>
  <text x="740" y="470" fill="#444" font-size="11" text-anchor="end">harness-exam v${version}</text>
</svg>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
