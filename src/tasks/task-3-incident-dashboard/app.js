/* global crypto, CustomEvent, document, fetch, TextEncoder */

const dashboard = document.querySelector("#dashboard");
const trackedActions = new Set();

let browserSecret = null;

installActionTracking();
boot();

async function boot() {
  document.body.addEventListener("htmx:configRequest", (event) => {
    event.detail.headers["X-Task-3-Browser-Secret"] = browserSecret;
  });

  try {
    const challengeResponse = await fetch("/task-3/bootstrap-challenge");
    if (!challengeResponse.ok) {
      throw new Error(
        `Unexpected challenge response: ${challengeResponse.status}`,
      );
    }

    const challenge = await challengeResponse.json();
    const response = await fetch("/task-3/browser-session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ proof: await buildBrowserProof(challenge) }),
    });

    if (!response.ok) {
      throw new Error(`Unexpected response: ${response.status}`);
    }

    const payload = await response.json();
    browserSecret = payload.secret;

    dashboard.dispatchEvent(new CustomEvent("task3:ready", { bubbles: true }));
  } catch (error) {
    dashboard.innerHTML = `<section class="panel content-panel"><p class="eyebrow">Northstar Billing</p><h2>Dashboard unavailable</h2><p class="panel-copy">The local task server could not initialize the browser session. ${error.message}</p></section>`;
  }
}

function installActionTracking() {
  document.body.addEventListener("click", handleActionEvent, true);
  document.body.addEventListener("focusin", handleActionEvent, true);
  document.body.addEventListener("mouseover", handleActionEvent, true);
}

function handleActionEvent(event) {
  if (!browserSecret || !event.isTrusted) {
    return;
  }

  const element = event.target.closest?.("[data-task3-action]");
  if (!element) {
    return;
  }

  const allowedTriggers = (element.dataset.task3Trigger || "click")
    .split(/\s+/)
    .filter(Boolean);
  if (!allowedTriggers.includes(event.type)) {
    return;
  }

  const action = element.dataset.task3Action;
  if (!action || trackedActions.has(action)) {
    return;
  }

  trackedActions.add(action);
  void fetch("/task-3/browser-action", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Task-3-Browser-Secret": browserSecret,
    },
    body: JSON.stringify({ action }),
    keepalive: true,
  });
}

async function buildBrowserProof(challenge) {
  const canvasBytes = renderCanvasBytes(challenge.canvas);
  const layoutMetrics = measureLayout(challenge.layout);
  return hashHex(
    [challenge.nonce, canvasBytes.join(","), layoutMetrics.join(",")].join("|"),
  );
}

function renderCanvasBytes(canvasChallenge) {
  const canvas = document.createElement("canvas");
  canvas.width = canvasChallenge.width;
  canvas.height = canvasChallenge.height;

  const context = canvas.getContext("2d");
  canvasChallenge.stripes.forEach((stripe) => {
    context.fillStyle = stripe.color;
    context.fillRect(stripe.x, 0, stripe.width, canvas.height);
  });

  context.fillStyle = canvasChallenge.accent.color;
  context.fillRect(
    canvasChallenge.accent.x,
    canvasChallenge.accent.y,
    canvasChallenge.accent.width,
    canvasChallenge.accent.height,
  );

  return canvasChallenge.samplePoints.flatMap(([x, y]) =>
    Array.from(context.getImageData(x, y, 1, 1).data),
  );
}

function measureLayout(layoutChallenge) {
  const root = document.createElement("div");
  const child = document.createElement("div");

  root.style.cssText = [
    "position:absolute",
    "left:-9999px",
    "top:-9999px",
    "visibility:hidden",
    `width:${layoutChallenge.root.width}px`,
    `height:${layoutChallenge.root.height}px`,
  ].join(";");
  child.style.cssText = [
    `width:${layoutChallenge.child.width}px`,
    `height:${layoutChallenge.child.height}px`,
  ].join(";");

  root.append(child);
  document.body.append(root);

  const metrics = [root, child].flatMap((element) => {
    const rect = element.getBoundingClientRect();
    return [Math.round(rect.width), Math.round(rect.height)];
  });

  root.remove();
  return metrics;
}

async function hashHex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
