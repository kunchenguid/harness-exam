import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

let _version;
export function getVersion() {
  if (!_version) {
    const pkg = JSON.parse(
      readFileSync(resolve(__dirname, "..", "package.json"), "utf8"),
    );
    _version = pkg.version;
  }
  return _version;
}

export function runNode(scriptPath, cwd) {
  return new Promise((resolve) => {
    execFile(
      "node",
      [scriptPath],
      { cwd, timeout: 10_000 },
      (error, stdout, stderr) => {
        resolve({
          exitCode: error ? (error.code ?? 1) : 0,
          stdout,
          stderr: stderr || error?.message || "",
        });
      },
    );
  });
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--") && i + 1 < argv.length) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}
