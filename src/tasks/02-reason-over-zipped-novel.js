import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const TASK_DIR = "task-2";
const TASK_NAME = "reason-over-zipped-novel";
const OUTPUT_FILE = "task-2-answer.json";
const ARCHIVE_FILE = "task-2-mysteries-of-london.zip";
const ARCHIVE_URL = new URL(
  "../../research/task-2-mysteries-of-london.zip",
  import.meta.url,
);

const TASK_README = `# Task 2: ${TASK_NAME}

Unzip the provided archive in this directory and answer the question below using the corpus inside it.

## Archive

- File: \`${ARCHIVE_FILE}\`
- Unzip it inside this \`task-2/\` directory before you work on the question.

## Question

What is Thomas Rainford's true place in the Ellingham family, and why does Charles Hatfield briefly seem to have a claim to the Ellingham title before losing it?

## Output

Write a JSON file named \`${OUTPUT_FILE}\` in the workspace root, next to this \`task-2/\` directory.

Use this shape:

\`\`\`json
{
  "answer": "A concise explanation in prose.",
  "evidence": [
    {
      "chapterId": "v3-ch084",
      "detail": "Why this chapter matters."
    }
  ]
}
\`\`\`

## Requirements

- The file must be valid JSON.
- \`answer\` must explain Rainford's true status, Charles's apparent claim, and the later fact that defeats that claim.
- \`evidence\` must contain at least 4 citations.
- Your citations must include chapter ids from both \`v3\` and \`v4\`.
- Use the chapter ids shipped in the archive.
`;

const REQUIRED_ANSWER_MARKERS = [
  {
    label: "Rainford rightful status",
    phrases: [
      ["rainford", "legitimate"],
      ["rainford", "elder", "earl of ellingham"],
    ],
  },
  {
    label: "Charles apparent claim",
    phrases: [
      ["charles", "viscount marston"],
      ["charles", "heir"],
    ],
  },
  {
    label: "Charles loses claim",
    phrases: [
      ["charles", "not born in wedlock"],
      ["charles", "illegitimate"],
      ["charles", "losing", "claim"],
    ],
  },
];

const REQUIRED_EVIDENCE = [
  {
    chapterId: "v3-ch084",
    markers: ["elder", "legitimate"],
  },
  {
    chapterId: "v4-ch017",
    markers: ["octavia manners", "marriage certificate"],
  },
  {
    chapterId: "v4-ch029",
    markers: ["viscount marston", "heir"],
  },
  {
    chapterId: "v4-ch043",
    markers: ["born in wedlock", "illegitimate"],
  },
];

export default {
  name: TASK_NAME,
  taskDir: TASK_DIR,
  description:
    "Unzip a long mystery corpus and answer a cross-chapter question about Rainford, Charles Hatfield, and the Ellingham title.",

  setup(workspaceDir) {
    const dir = join(workspaceDir, TASK_DIR);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "README.md"), TASK_README);
    copyFileSync(ARCHIVE_URL, join(dir, ARCHIVE_FILE));
  },

  async grade(workspaceDir) {
    return gradeMysteriesOfLondonAnswer(workspaceDir);
  },
};

export async function gradeMysteriesOfLondonAnswer(workspaceDir) {
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
  const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  const evidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];

  if (answer.length === 0) {
    failures.push("Missing a non-empty answer string.");
  }

  if (countWords(answer) < 60) {
    failures.push("Answer is too short; explain the full title arc in prose.");
  }

  const normalizedAnswer = normalizeText(answer);
  const missingAnswerMarkers = REQUIRED_ANSWER_MARKERS.filter(
    ({ phrases }) =>
      !phrases.some((group) =>
        group.every((part) => normalizedAnswer.includes(part)),
      ),
  ).map(({ label }) => label);
  if (missingAnswerMarkers.length > 0) {
    failures.push(
      `Answer is missing required ideas: ${missingAnswerMarkers.join(", ")}.`,
    );
  }

  if (evidence.length < 4) {
    failures.push("Evidence must contain at least 4 citations.");
  }

  const normalizedEvidence = evidence
    .filter((item) => item && typeof item === "object" && !Array.isArray(item))
    .map((item) => ({
      chapterId:
        typeof item.chapterId === "string"
          ? item.chapterId.trim().toLowerCase()
          : "",
      detail: typeof item.detail === "string" ? normalizeText(item.detail) : "",
    }));

  const citedVolumes = new Set(
    normalizedEvidence
      .map((item) => item.chapterId.split("-")[0])
      .filter(Boolean),
  );
  if (!citedVolumes.has("v3") || !citedVolumes.has("v4")) {
    failures.push("Evidence must cite chapters from both v3 and v4.");
  }

  const missingEvidence = REQUIRED_EVIDENCE.filter(({ chapterId, markers }) => {
    const citation = normalizedEvidence.find(
      (item) => item.chapterId === chapterId,
    );
    return (
      !citation || !markers.some((marker) => citation.detail.includes(marker))
    );
  }).map(({ chapterId }) => chapterId);
  if (missingEvidence.length > 0) {
    failures.push(
      `Evidence is missing key chapter support: ${missingEvidence.join(", ")}.`,
    );
  }

  return {
    pass: failures.length === 0,
    message:
      failures.length === 0 ? "Task 2 answer validated." : failures.join(" "),
  };
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}
