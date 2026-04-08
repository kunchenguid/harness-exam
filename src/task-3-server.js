/* global fetch, setTimeout */

import { spawn } from "node:child_process";
import net from "node:net";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const ROUTE = "/task-3/";
const SERVER_START_TIMEOUT_MS = 5_000;
const SERVER_STOP_TIMEOUT_MS = 5_000;

export async function startTask3Server(workspaceDir) {
  const port = await getAvailablePort();
  const serverProcessPath = fileURLToPath(
    new URL("./task-3-server-process.js", import.meta.url),
  );
  const child = spawn(
    process.execPath,
    [serverProcessPath, "--port", String(port), "--workspace", workspaceDir],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();

  const url = `http://${HOST}:${port}${ROUTE}`;
  await waitForUrl(url, SERVER_START_TIMEOUT_MS);

  return {
    taskDir: "task-3",
    pid: child.pid,
    port,
    url,
  };
}

export async function stopTask3Server(taskServer) {
  if (!taskServer || !taskServer.pid) {
    return;
  }

  try {
    process.kill(taskServer.pid, "SIGTERM");
  } catch (error) {
    if (error && error.code === "ESRCH") {
      return;
    }
    throw error;
  }

  const deadline = Date.now() + SERVER_STOP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (!(await isUrlReachable(taskServer.url))) {
      return;
    }
    await sleep(50);
  }

  throw new Error("Task 3 server did not stop in time.");
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Unable to allocate a localhost port."));
        return;
      }

      const { port } = address;
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(port);
      });
    });
    server.on("error", reject);
  });
}

async function waitForUrl(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUrlReachable(url)) {
      return;
    }
    await sleep(50);
  }

  throw new Error(`Timed out waiting for Task 3 server at ${url}.`);
}

async function isUrlReachable(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
