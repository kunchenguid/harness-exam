import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TASK_DIR = "task-1";
const OUTPUT_FILE = "neovim-012.md";
const MIN_WORD_COUNT = 1000;

const TASK_NAME = "rewrite-long-web-content";

const TASK_README = `# Task 1: ${TASK_NAME}

Find the official Neovim v0.12.0 release notes and write the full release notes to \`neovim-012.md\` in the workspace root.

## Requirements

- The output file must be named \`neovim-012.md\`.
- The file must live in the workspace root, next to this \`task-1/\` directory.
- The file must be written in Markdown.
- Capture the full release notes, not a summary.
- Preserve the major release-note sections.

## Notes

- Use the official Neovim v0.12.0 release notes as the source.
`;

const REQUIRED_HEADINGS = [
  "Breaking Changes",
  "New Features",
  "Changed Features",
  "Removed Features",
  "Deprecations",
];

const REQUIRED_MARKER_GROUPS = [
  {
    label: "nvim_get_commands Lua complete callback",
    phrases: ["nvim_get_commands", "complete", "lua function"],
  },
  {
    label: "diagnostic-signs sign_define change",
    phrases: ["diagnostic signs", "sign define"],
  },
  {
    label: "LSP JSON null uses vim.nil",
    phrases: ["json null", "lsp messages", "vim nil"],
  },
  {
    label: "shelltemp default changed",
    phrases: ["shelltemp", "defaults to false"],
  },
  {
    label: "nvim_win_text_height max_height",
    phrases: ["nvim_win_text_height", "max_height"],
  },
  {
    label: "Zig build alternative",
    phrases: ["zig based build", "alternative to cmake"],
  },
  {
    label: "default statusline diagnostics",
    phrases: ["default statusline", "vim diagnostic status"],
  },
  {
    label: "help DWIM",
    phrases: ["help", "dwim"],
  },
  {
    label: "wall creates parent directories",
    phrases: ["wall", "parent directories"],
  },
  {
    label: "DiffTextAdd within changed line",
    phrases: ["difftextadd", "changed line"],
  },
  {
    label: "inline completion support",
    phrases: ["textdocument", "inlinecompletion"],
  },
  {
    label: "vim.net.request HTTP",
    phrases: ["vim net request", "http content"],
  },
  {
    label: "vim.pack plugin manager",
    phrases: ["plugin manager", "vim pack"],
  },
  {
    label: "terminal synchronized output",
    phrases: ["private mode 2026", "synchronized output"],
  },
  {
    label: "ui2 redesign",
    phrases: ["ui2", "redesign", "commandline ui"],
  },
  {
    label: "prompt_appendbuf",
    phrases: ["prompt_appendbuf", "prompt buffer"],
  },
  {
    label: "matchfuzzy algorithm",
    phrases: ["matchfuzzy", "improved fuzzy matching algorithm"],
  },
  {
    label: "treesitter get_parser returns nil",
    phrases: ["vim treesitter get_parser", "returns nil", "create a parser"],
  },
  {
    label: "deprecated 0.12 reference",
    phrases: ["deprecated 0 12"],
  },
];

export default {
  name: TASK_NAME,
  taskDir: TASK_DIR,
  description:
    "Find the official Neovim v0.12.0 release notes and write the full notes to neovim-012.md in the workspace root.",

  setup(workspaceDir) {
    const dir = join(workspaceDir, TASK_DIR);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "README.md"), TASK_README);
  },

  async grade(workspaceDir) {
    return gradeNeovimReleaseNotes(workspaceDir);
  },
};

export async function gradeNeovimReleaseNotes(workspaceDir) {
  const outputPath = join(workspaceDir, OUTPUT_FILE);
  if (!existsSync(outputPath)) {
    return {
      pass: false,
      message: `Missing ${OUTPUT_FILE} in the workspace root.`,
    };
  }

  const content = readFileSync(outputPath, "utf8");
  const failures = [];

  if (
    !/^#{1,6}\s+.*(?:neovim.*0\.12.*release notes|release notes.*neovim.*0\.12)/im.test(
      content,
    )
  ) {
    failures.push(
      "Missing a Markdown heading for the Neovim 0.12 release notes.",
    );
  }

  const missingHeadings = REQUIRED_HEADINGS.filter(
    (heading) =>
      !new RegExp(`^#{1,6}\\s+${escapeRegExp(heading)}\\s*$`, "im").test(
        content,
      ),
  );
  if (missingHeadings.length > 0) {
    failures.push(`Missing section headings: ${missingHeadings.join(", ")}.`);
  }

  const words = content.trim().split(/\s+/).filter(Boolean).length;
  if (words < MIN_WORD_COUNT) {
    failures.push(
      `Document is too short: found ${words} words, expected at least ${MIN_WORD_COUNT}.`,
    );
  }

  const normalizedContent = normalizeText(content);
  const missingMarkers = REQUIRED_MARKER_GROUPS.filter(
    ({ phrases }) =>
      !phrases.every((phrase) =>
        normalizedContent.includes(normalizeText(phrase)),
      ),
  ).map(({ label }) => label);

  if (missingMarkers.length > 0) {
    const preview = missingMarkers.slice(0, 5).join("; ");
    const suffix = missingMarkers.length > 5 ? "; ..." : "";
    failures.push(`Missing release-note content markers: ${preview}${suffix}.`);
  }

  return {
    pass: failures.length === 0,
    message:
      failures.length === 0 ? "Release notes validated." : failures.join(" "),
  };
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
