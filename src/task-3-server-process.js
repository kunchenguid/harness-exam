import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { parseArgs } from "./utils.js";
import {
  buildExpectedBrowserBootstrapProof,
  createBrowserBootstrapChallenge,
  createBrowserSessionSecret,
} from "./tasks/task-3-incident-dashboard/browser-attestation.js";
import {
  normalizeDashboardState,
  renderDashboard,
  renderInspector,
  renderTooltip,
} from "./tasks/task-3-incident-dashboard/render.js";
import { buildTask3Scenario } from "./tasks/task-3-incident-dashboard/scenario.js";

const args = parseArgs(process.argv.slice(2));
const port = Number(args.port);
const workspaceDir = args.workspace;

if (!Number.isInteger(port) || port <= 0) {
  throw new Error("Task 3 server requires a numeric --port argument.");
}

if (typeof workspaceDir !== "string" || workspaceDir.length === 0) {
  throw new Error("Task 3 server requires a --workspace argument.");
}

const indexHtml = readFileSync(
  new URL("./tasks/task-3-incident-dashboard/index.html", import.meta.url),
  "utf8",
);
const appJs = readFileSync(
  new URL("./tasks/task-3-incident-dashboard/app.js", import.meta.url),
  "utf8",
);
const htmxJs = readFileSync(
  new URL("./tasks/task-3-incident-dashboard/htmx.min.js", import.meta.url),
  "utf8",
);
const stylesCss = readFileSync(
  new URL("./tasks/task-3-incident-dashboard/styles.css", import.meta.url),
  "utf8",
);
const scenario = buildTask3Scenario(workspaceDir);
const incidentData = scenario.data;

let browserSecret = null;
let bootstrapChallenge = createBrowserBootstrapChallenge();
const browserActions = new Set();

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "GET" && isTask3Path(url.pathname)) {
    respond(response, 200, "text/html; charset=utf-8", indexHtml);
    return;
  }

  if (request.method === "GET" && url.pathname === "/task-3/app.js") {
    respond(response, 200, "application/javascript; charset=utf-8", appJs);
    return;
  }

  if (request.method === "GET" && url.pathname === "/task-3/htmx.min.js") {
    respond(response, 200, "application/javascript; charset=utf-8", htmxJs);
    return;
  }

  if (request.method === "GET" && url.pathname === "/task-3/styles.css") {
    respond(response, 200, "text/css; charset=utf-8", stylesCss);
    return;
  }

  if (url.pathname === "/api/task-3/data") {
    respond(response, 404, "text/plain; charset=utf-8", "Not found");
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname === "/task-3/bootstrap-challenge"
  ) {
    respond(
      response,
      200,
      "application/json; charset=utf-8",
      JSON.stringify(bootstrapChallenge),
    );
    return;
  }

  if (request.method === "POST" && url.pathname === "/task-3/browser-session") {
    await handleBrowserSession(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/task-3/browser-action") {
    await handleBrowserAction(request, response);
    return;
  }

  if (request.method === "GET" && url.pathname === "/task-3/browser-proof") {
    respond(
      response,
      200,
      "application/json; charset=utf-8",
      JSON.stringify(buildBrowserProof()),
    );
    return;
  }

  if (!authorizeBrowserFragment(request, response)) {
    return;
  }

  if (request.method === "GET" && url.pathname === "/task-3/dashboard") {
    const state = normalizeDashboardState(url.searchParams);
    respond(
      response,
      200,
      "text/html; charset=utf-8",
      renderDashboard(incidentData, state),
    );
    return;
  }

  if (request.method === "GET" && url.pathname === "/task-3/inspector/close") {
    respond(response, 200, "text/html; charset=utf-8", "");
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname.startsWith("/task-3/tooltip/deployment/")
  ) {
    const deploymentId = decodeURIComponent(
      url.pathname.slice("/task-3/tooltip/deployment/".length),
    );
    const deployment = findById(incidentData.deployments, deploymentId);
    if (!deployment) {
      respond(response, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }

    respond(
      response,
      200,
      "text/html; charset=utf-8",
      renderTooltip(deployment),
    );
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname.startsWith("/task-3/inspector/")
  ) {
    const [kind, ...rest] = url.pathname
      .slice("/task-3/inspector/".length)
      .split("/");
    const itemId = decodeURIComponent(rest.join("/"));
    const item = findInspectorItem(kind, itemId);
    if (!item) {
      respond(response, 404, "text/plain; charset=utf-8", "Not found");
      return;
    }

    respond(
      response,
      200,
      "text/html; charset=utf-8",
      renderInspector(kind, item),
    );
    return;
  }

  respond(response, 404, "text/plain; charset=utf-8", "Not found");
});

server.listen(port, "127.0.0.1");

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  server.close(() => process.exit(0));
});

function isTask3Path(pathname) {
  return pathname === "/task-3" || pathname === "/task-3/";
}

function respond(response, statusCode, contentType, body) {
  response.writeHead(statusCode, {
    "cache-control": "no-store",
    "content-type": contentType,
  });
  response.end(body);
}

async function handleBrowserSession(request, response) {
  const body = await readJsonBody(request);
  if (!body || typeof body.proof !== "string" || body.proof.length === 0) {
    respond(
      response,
      403,
      "text/plain; charset=utf-8",
      "Task 3 requires a browser attestation before the dashboard can load.",
    );
    return;
  }

  if (body.proof !== buildExpectedBrowserBootstrapProof(bootstrapChallenge)) {
    respond(
      response,
      403,
      "text/plain; charset=utf-8",
      "Task 3 browser attestation did not match the active challenge.",
    );
    return;
  }

  browserSecret = createBrowserSessionSecret();
  browserActions.clear();
  bootstrapChallenge = createBrowserBootstrapChallenge();
  respond(
    response,
    200,
    "application/json; charset=utf-8",
    JSON.stringify({ secret: browserSecret }),
  );
}

async function handleBrowserAction(request, response) {
  if (!authorizeBrowserSecret(request, response)) {
    return;
  }

  const body = await readJsonBody(request);
  if (!body || typeof body.action !== "string" || body.action.length === 0) {
    respond(
      response,
      400,
      "text/plain; charset=utf-8",
      "Invalid browser action.",
    );
    return;
  }

  recordBrowserAction(body.action);
  response.writeHead(204, { "cache-control": "no-store" });
  response.end();
}

function authorizeBrowserFragment(request, response) {
  if (request.headers["hx-request"] !== "true") {
    respond(
      response,
      400,
      "text/plain; charset=utf-8",
      "Task 3 fragments must be loaded through htmx in the browser.",
    );
    return false;
  }

  return authorizeBrowserSecret(request, response);
}

function authorizeBrowserSecret(request, response) {
  if (!browserSecret) {
    respond(
      response,
      403,
      "text/plain; charset=utf-8",
      "Task 3 browser session has not been initialized.",
    );
    return false;
  }

  if (request.headers["x-task-3-browser-secret"] !== browserSecret) {
    respond(
      response,
      403,
      "text/plain; charset=utf-8",
      "Task 3 browser session secret did not match.",
    );
    return false;
  }

  return true;
}

async function readJsonBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
  }

  try {
    return JSON.parse(body || "{}");
  } catch {
    return null;
  }
}

function recordBrowserAction(action) {
  if (scenario.expectations.requiredBrowserActions.includes(action)) {
    browserActions.add(action);
  }
}

function buildBrowserProof() {
  return {
    completed: scenario.expectations.requiredBrowserActions.every((action) =>
      browserActions.has(action),
    ),
    actions: scenario.expectations.requiredBrowserActions.filter((action) =>
      browserActions.has(action),
    ),
  };
}

function findInspectorItem(kind, itemId) {
  if (kind === "deployment") {
    return findById(incidentData.deployments, itemId);
  }
  if (kind === "flag") {
    return findById(incidentData.featureFlags, itemId);
  }
  if (kind === "trace") {
    return findById(incidentData.traces, itemId);
  }
  if (kind === "customer") {
    return incidentData.customers.find(
      (customer) => customer.segment === itemId,
    );
  }
  return null;
}

function findById(items, id) {
  return items.find((item) => item.id === id);
}
