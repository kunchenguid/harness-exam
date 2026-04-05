import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import submit from "../src/commands/submit.js";
import { generateScorecard } from "../src/scorecard.js";
import { createSession, getSessionDir } from "../src/session.js";
import neovimReleaseNotesTask, {
  gradeNeovimReleaseNotes,
} from "../src/tasks/01-rewrite-long-web-content.js";

test("gradeNeovimReleaseNotes fails when neovim-012.md is missing", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));

  const result = await gradeNeovimReleaseNotes(workspaceDir);

  assert.equal(result.pass, false);
  assert.match(result.message, /neovim-012\.md/i);
});

test("gradeNeovimReleaseNotes accepts a sufficiently complete markdown file", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const content = buildCandidateReleaseNotes();

  writeFileSync(join(workspaceDir, "neovim-012.md"), content);

  const result = await gradeNeovimReleaseNotes(workspaceDir);

  assert.equal(result.pass, true);
});

test("gradeNeovimReleaseNotes accepts reordered sections and paraphrased marker formatting", async () => {
  const workspaceDir = mkdtempSync(join(tmpdir(), "harness-exam-task-"));
  const content = buildReorderedReleaseNotes();

  writeFileSync(join(workspaceDir, "neovim-012.md"), content);

  const result = await gradeNeovimReleaseNotes(workspaceDir);

  assert.equal(result.pass, true);
});

test("submit records the failure reason in results.json", async () => {
  const cwd = process.cwd();
  const workspaceRoot = mkdtempSync(join(tmpdir(), "harness-exam-submit-"));
  process.chdir(workspaceRoot);

  const originalLog = console.log;
  console.log = () => {};

  try {
    const session = createSession(workspaceRoot);
    const sessionDir = getSessionDir(workspaceRoot, session.sessionId);
    neovimReleaseNotesTask.setup(sessionDir);

    await submit({ session: session.sessionId, agent: "Test Agent" });

    const results = JSON.parse(
      readFileSync(join(sessionDir, "results.json"), "utf8"),
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].pass, false);
    assert.match(results[0].reason, /neovim-012\.md/i);
  } finally {
    console.log = originalLog;
    process.chdir(cwd);
  }
});

test("scorecard renders the provided task names", () => {
  const svg = generateScorecard({
    agent: "Test Agent",
    results: [{ name: "rewrite-long-web-content", pass: false }],
    taskNames: ["rewrite-long-web-content", "Implement", "File Ops"],
    totalTasks: 3,
    sessionId: "12345678-1234-1234-1234-123456789012",
    timestamp: "2026-04-05T00:00:00.000Z",
  });

  assert.match(svg, /Task 1: rewrite-long-web-content/);
  assert.doesNotMatch(svg, /Task 1: Bug Fix/);
});

function buildCandidateReleaseNotes() {
  const sections = [
    {
      heading: "## Breaking Changes",
      phrases: [
        "nvim_get_commands() returns complete as a Lua function",
        "diagnostic-signs can no longer be configured with sign_define",
        'JSON "null" values in LSP messages are represented as vim.NIL',
        "shelltemp defaults to false",
      ],
    },
    {
      heading: "## New Features",
      phrases: [
        "nvim_win_text_height() can limit the lines checked when a certain max_height is reached",
        "EXPERIMENTAL Zig-based build is available as an alternative to CMake",
        "Default statusline shows vim.diagnostic.status()",
        "help! has DWIM Do What I Mean behavior",
        "wall with ++p auto-creates missing parent directories",
        "hl-DiffTextAdd highlights added text within a changed line",
        "Support for textDocument/inlineCompletion",
        "vim.net.request() can fetch/download HTTP content",
        "Built-in plugin manager: vim.pack",
        "DEC private mode 2026 synchronized output is now supported",
        "ui2 is a redesign of the core messages and commandline UI",
        "prompt_appendbuf() appends text to prompt-buffer",
      ],
    },
    {
      heading: "## Changed Features",
      phrases: [
        "matchfuzzy() and matchfuzzypos() use an improved fuzzy matching algorithm",
      ],
    },
    {
      heading: "## Removed Features",
      phrases: [
        "vim.treesitter.get_parser() now always returns nil when it fails to create a parser",
      ],
    },
    {
      heading: "## Deprecations",
      phrases: ["See deprecated-0.12"],
    },
  ];

  const lines = ["# Neovim 0.12 Release Notes", ""];
  for (const section of sections) {
    lines.push(section.heading, "");
    for (const phrase of section.phrases) {
      lines.push(`- ${phrase}. ${filler(90)}`, "");
    }
  }
  return lines.join("\n");
}

function buildReorderedReleaseNotes() {
  const sections = [
    {
      heading: "## New Features",
      phrases: [
        "Built-in plugin manager vim.pack",
        "Default statusline shows: vim.diagnostic.status() plus vim.ui.progress_status()",
        "EXPERIMENTAL: Zig-based build is available as an alternative to CMake",
        "support for textDocument/inlineCompletion",
        "ui2 is a redesign of the core messages and commandline UI",
        "help! has DWIM behavior",
        "vim.net.request() can fetch or download HTTP content",
        "wall with ++p auto-creates missing parent directories",
        "hl-DiffTextAdd highlights added text within a changed line",
        "DEC private mode 2026 synchronized output is now supported",
        "nvim_win_text_height() can limit the lines checked when a certain max_height is reached",
        "prompt_appendbuf() appends text to prompt-buffer",
      ],
    },
    {
      heading: "## Deprecations",
      phrases: ["See deprecated 0.12"],
    },
    {
      heading: "## Breaking Changes",
      phrases: [
        "shelltemp defaults to false",
        "JSON null values in LSP messages are represented as vim.nil",
        "diagnostic-signs can no longer be configured with :sign-define or sign_define()",
        "nvim_get_commands returns complete as a Lua function",
      ],
    },
    {
      heading: "## Removed Features",
      phrases: [
        "vim.treesitter.get_parser() always returns nil when it fails to create a parser",
      ],
    },
    {
      heading: "## Changed Features",
      phrases: [
        "matchfuzzy() and matchfuzzypos() use an improved fuzzy matching algorithm",
      ],
    },
  ];

  const lines = ["# Release Notes for Neovim 0.12", ""];
  for (const section of sections) {
    lines.push(section.heading, "");
    for (const phrase of section.phrases) {
      lines.push(`- ${phrase}. ${filler(90)}`, "");
    }
  }
  return lines.join("\n");
}

function filler(wordCount) {
  return Array.from(
    { length: wordCount },
    (_, i) => `context${i % 11} detail${i % 7}`,
  ).join(" ");
}
