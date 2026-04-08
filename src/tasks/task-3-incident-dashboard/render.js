import { VALID_REGIONS, VALID_SORTS, VALID_TABS } from "./shared.js";

export function normalizeDashboardState(searchParams) {
  const tab = searchParams.get("tab");
  const region = searchParams.get("region");
  const sort = searchParams.get("sort");

  return {
    tab: VALID_TABS.has(tab) ? tab : "overview",
    region: VALID_REGIONS.has(region) ? region : "all",
    sort: VALID_SORTS.has(sort) ? sort : "arr",
  };
}

export function renderDashboard(data, state) {
  return `${renderResetFragments()}
    <section class="hero">
      <div class="panel hero-card">
        <p class="eyebrow">Northstar Billing</p>
        <h1>Incident Console: rollout-induced billing outage</h1>
        <p class="hero-copy">
          Investigate the first outage wave by comparing rollout telemetry, feature flags,
          trace samples, and customer impact. The decisive clues are only revealed as you
          inspect the dashboard through the browser UI.
        </p>
        <div class="callouts">
          <div class="callout">
            <strong>Workflow hint</strong>
            Start on the rollout chart, inspect the rc1 drilldown, compare it with the
            async invoice sync flag, then sort customer impact by first failure.
          </div>
          <div class="callout">
            <strong>Scope</strong>
            The first wave did not hit every region equally, so compare the EU traces with
            the control paths before drawing a conclusion.
          </div>
        </div>
      </div>

      <aside class="panel summary-card">
        <p class="eyebrow">Live Summary</p>
        <div class="summary-grid">
          <div class="metric">
            <div class="metric-label">Peak checkout error rate</div>
            <div class="metric-value">18.2%</div>
            <div class="metric-note">Reached during the first rc1 rollout wave.</div>
          </div>
          <div class="metric">
            <div class="metric-label">Dominant failing path</div>
            <div class="metric-value">Invoice sync</div>
            <div class="metric-note">Trace samples narrow the problem to a hidden VAT dependency.</div>
          </div>
          <div class="metric">
            <div class="metric-label">Operational clue</div>
            <div class="metric-value">Rollback stabilizes</div>
            <div class="metric-note">Recovery begins before any database repair, which narrows the fault to rollout behavior.</div>
          </div>
        </div>
      </aside>
    </section>

    <section class="toolbar">
      <div class="tab-row" role="tablist" aria-label="Incident panels">
        ${renderTabChip(state, "overview", "Overview")}
        ${renderTabChip(state, "deployments", "Deployments")}
        ${renderTabChip(state, "feature-flags", "Feature Flags")}
        ${renderTabChip(state, "trace-samples", "Trace Samples")}
        ${renderTabChip(state, "customer-impact", "Customer Impact")}
      </div>

      <div class="filter-row" aria-label="Region filters">
        ${renderRegionChip(state, "all", "All regions")}
        ${renderRegionChip(state, "eu", "EU")}
        ${renderRegionChip(state, "us", "US")}
        ${renderRegionChip(state, "enterprise", "Enterprise lens")}
      </div>
    </section>

    <section class="panel content-panel">${renderPanel(data, state)}</section>
  `;
}

export function renderTooltip(deployment) {
  return `<aside id="chart-tooltip" class="tooltip" aria-live="polite">
    <strong>${escapeHtml(deployment.id)}</strong><br />
    ${escapeHtml(deployment.shippedAt)}<br />
    Peak error rate: ${escapeHtml(String(deployment.errorRate))}%
  </aside>`;
}

export function renderInspector(kind, item) {
  const inspector = buildInspector(kind, item);
  if (!inspector) {
    return "";
  }

  const { eyebrow, title, meta, summary, detail, bullets } = inspector;
  return `<div class="inspector-shell">
    <div
      class="inspector-backdrop"
      hx-get="/task-3/inspector/close"
      hx-target="#task-3-inspector"
      hx-swap="innerHTML"
    ></div>
    <section class="inspector-panel" role="dialog" aria-modal="true" aria-label="Incident detail">
      <button
        type="button"
        class="close"
        hx-get="/task-3/inspector/close"
        hx-target="#task-3-inspector"
        hx-swap="innerHTML"
        aria-label="Close inspector"
      >
        ×
      </button>
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h2>${escapeHtml(title)}</h2>
      <div class="detail-meta">${meta
        .map((value) => `<span class="pill">${escapeHtml(value)}</span>`)
        .join("")}</div>
      <p>${escapeHtml(summary)}</p>
      <p>${escapeHtml(detail)}</p>
      <ul>${bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>
    </section>
  </div>`;
}

function renderResetFragments() {
  return `<div id="task-3-inspector" hx-swap-oob="innerHTML"></div>
    <aside id="chart-tooltip" class="tooltip tooltip-empty" hx-swap-oob="outerHTML">
      Hover or focus a rollout point to reveal deployment metadata.
    </aside>`;
}

function renderPanel(data, state) {
  if (state.tab === "overview") {
    return renderOverview(data, state);
  }
  if (state.tab === "deployments") {
    return renderDeployments(data, state);
  }
  if (state.tab === "feature-flags") {
    return renderFeatureFlags(data, state);
  }
  if (state.tab === "trace-samples") {
    return renderTraceSamples(data, state);
  }
  return renderCustomerImpact(data, state);
}

function renderOverview(data, state) {
  const deployments = data.deployments;
  return `<div class="panel-head">
      <div>
        <p class="eyebrow">Overview</p>
        <h2>Rollout chart</h2>
      </div>
      <p class="panel-copy">
        Hover or focus each point for exact deployment metadata, then inspect the matching
        rollout drilldown from the Deployments panel. The chart is filtered to ${escapeHtml(
          formatRegionLabel(state.region),
        )}.
      </p>
    </div>
    <div class="chart-shell">
      <svg viewBox="0 0 880 320" aria-label="Deployment rollout chart">
        <line class="grid grid-strong" x1="90" y1="42" x2="90" y2="260"></line>
        <line class="grid" x1="90" y1="80" x2="820" y2="80"></line>
        <line class="grid" x1="90" y1="140" x2="820" y2="140"></line>
        <line class="grid" x1="90" y1="200" x2="820" y2="200"></line>
        <line class="grid grid-strong" x1="90" y1="260" x2="820" y2="260"></line>
        <path class="line" d="M 150 248 C 250 248, 260 120, 390 96 S 620 122, 760 232"></path>
        <text class="axis-label" x="42" y="46">20%</text>
        <text class="axis-label" x="48" y="84">15%</text>
        <text class="axis-label" x="48" y="144">10%</text>
        <text class="axis-label" x="52" y="204">5%</text>
        <text class="axis-label" x="56" y="264">0%</text>
        <text class="tick-label" x="118" y="290">Stable</text>
        <text class="tick-label" x="344" y="290">rc1</text>
        <text class="tick-label" x="680" y="290">Rollback</text>
        ${deployments
          .map((deployment, index) => renderOverviewPoint(deployment, index))
          .join("")}
      </svg>
      <p class="chart-caption">
        Use the point metadata here, then open the matching rollout drilldown to compare it with
        the incident notes.
      </p>
    </div>`;
}

function renderOverviewPoint(deployment, index) {
  const x = [150, 390, 760][index];
  const y = [248, 96, 232][index];
  const color = deployment.id.includes("rc1") ? "#f97316" : "#7dd3fc";

  return `<circle
      class="deployment-point"
      cx="${x}"
      cy="${y}"
      r="10"
      fill="${color}"
      tabindex="0"
      role="button"
      data-task3-action="deployment:${escapeHtml(deployment.id)}"
      data-task3-trigger="mouseover focusin"
      hx-get="/task-3/tooltip/deployment/${encodeURIComponent(deployment.id)}"
      hx-trigger="mouseenter, focus"
      hx-target="#chart-tooltip"
      hx-swap="outerHTML"
    ></circle>
    <text class="point-label" x="${x - 42}" y="${y - 16}">${escapeHtml(
      deployment.delta,
    )}</text>`;
}

function renderDeployments(data, state) {
  return renderCardGrid(
    "Deployments",
    "Rollout drilldowns",
    "Open the drilldown for each rollout to compare the incident notes with the error-rate timeline.",
    data.deployments,
    (deployment) => ({
      meta: [deployment.shippedAt, `Peak ${deployment.errorRate}% errors`],
      title: deployment.id,
      summary: deployment.summary,
      action: `deployment:${deployment.id}`,
      actionUrl: `/task-3/inspector/deployment/${encodeURIComponent(deployment.id)}?${buildStateQuery(
        state,
      )}`,
      cta: "Open drilldown",
    }),
  );
}

function renderFeatureFlags(data, state) {
  return renderCardGrid(
    "Feature Flags",
    "Rollout flags and hidden dependencies",
    "Some toggles are harmless. One flag preserves a dependency that only shows up for a narrow billing path.",
    data.featureFlags,
    (flag) => ({
      meta: [flag.exposure, `Owner: ${flag.owner}`],
      title: flag.name,
      summary: flag.summary,
      action: `flag:${flag.id}`,
      actionUrl: `/task-3/inspector/flag/${encodeURIComponent(flag.id)}?${buildStateQuery(
        state,
      )}`,
      cta: "Inspect flag note",
    }),
  );
}

function renderTraceSamples(data, state) {
  const traces = filterTracesByRegion(data, state.region);
  return `<div class="panel-head">
      <div>
        <p class="eyebrow">Trace Samples</p>
        <h2>Checkout request traces</h2>
      </div>
      <p class="panel-copy">
        Compare the failing traces with the healthy control path. The timeout chain shows whether
        the problem came from invoice sync or from something broader.
      </p>
    </div>
    <div class="trace-list">
      ${traces
        .map(
          (trace) => `<article class="trace-card">
            <div>
              <div class="detail-meta">
                <span class="pill">${escapeHtml(trace.latency)}</span>
                <span class="pill">${escapeHtml(trace.region.toUpperCase())}</span>
              </div>
              <h3>${escapeHtml(trace.title)}</h3>
              <p>${escapeHtml(trace.summary)}</p>
            </div>
            <button
              type="button"
              class="row-button"
              data-task3-action="trace:${escapeHtml(trace.id)}"
              hx-get="/task-3/inspector/trace/${encodeURIComponent(trace.id)}?${buildStateQuery(
                state,
              )}"
              hx-target="#task-3-inspector"
              hx-swap="innerHTML"
            >
              Open trace detail
            </button>
          </article>`,
        )
        .join("")}
    </div>`;
}

function renderCustomerImpact(data, state) {
  const customers = getSortedCustomers(data, state);
  return `<div class="panel-head">
      <div>
        <p class="eyebrow">Customer Impact</p>
        <h2>Segment fallout</h2>
      </div>
      <p class="panel-copy">
        Default sort shows revenue exposure. Switch to first-failure order to find which customer segment was hit first.
      </p>
    </div>
    <div class="sort-row">
      ${renderSortChip(state, "arr", "Sort by ARR")}
      ${renderSortChip(state, "first-failure", "Sort by first failure")}
    </div>
    <div class="impact-scroll">
      <table class="impact-table">
        <thead>
          <tr>
            <th>Segment</th>
            <th>Region</th>
            <th>First failed</th>
            <th>Accounts</th>
            <th>ARR</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${customers
            .map(
              (customer) => `<tr>
                <td>${escapeHtml(customer.segment)}</td>
                <td>${escapeHtml(customer.region.toUpperCase())}</td>
                <td>${escapeHtml(customer.firstFailedAt)}</td>
                <td>${escapeHtml(String(customer.affectedAccounts))}</td>
                <td>${escapeHtml(customer.arr)}</td>
                <td>
                  <button
                    type="button"
                    class="row-button"
                    data-task3-action="customer:${escapeHtml(customer.segment)}"
                    hx-get="/task-3/inspector/customer/${encodeURIComponent(customer.segment)}?${buildStateQuery(
                      state,
                    )}"
                    hx-target="#task-3-inspector"
                    hx-swap="innerHTML"
                  >
                    Open detail
                  </button>
                </td>
              </tr>`,
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
}

function renderCardGrid(eyebrow, title, copy, items, mapCard) {
  return `<div class="panel-head">
      <div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <p class="panel-copy">${escapeHtml(copy)}</p>
    </div>
    <div class="card-grid">
      ${items
        .map((item) => {
          const card = mapCard(item);
          return `<article class="detail-card">
            <div class="detail-meta">${card.meta
              .map((value) => `<span class="pill">${escapeHtml(value)}</span>`)
              .join("")}</div>
            <h3>${escapeHtml(card.title)}</h3>
            <p>${escapeHtml(card.summary)}</p>
             <button
               type="button"
               ${card.action ? `data-task3-action="${escapeHtml(card.action)}"` : ""}
               hx-get="${card.actionUrl}"
               hx-target="#task-3-inspector"
               hx-swap="innerHTML"
            >
              ${escapeHtml(card.cta)}
            </button>
          </article>`;
        })
        .join("")}
    </div>`;
}

function renderTabChip(state, value, label) {
  return renderDashboardChip(
    label,
    dashboardUrl(state, { tab: value }),
    state.tab === value,
    value === "overview" ? "" : `tab:${value}`,
  );
}

function renderRegionChip(state, value, label) {
  return renderDashboardChip(
    label,
    dashboardUrl(state, { region: value }),
    state.region === value,
  );
}

function renderSortChip(state, value, label) {
  return renderDashboardChip(
    label,
    dashboardUrl(state, { tab: "customer-impact", sort: value }),
    state.sort === value,
    value === "first-failure" ? "customer-impact:first-failure" : "",
  );
}

function renderDashboardChip(label, url, active, action = "") {
  return `<button
    type="button"
    class="chip ${active ? "active" : ""}"
    ${action ? `data-task3-action="${escapeHtml(action)}"` : ""}
    hx-get="${url}"
    hx-target="#dashboard"
    hx-swap="innerHTML"
  >
    ${escapeHtml(label)}
  </button>`;
}

function dashboardUrl(state, overrides) {
  return `/task-3/dashboard?${buildStateQuery({ ...state, ...overrides })}`;
}

function buildStateQuery(state) {
  return new URLSearchParams({
    tab: state.tab,
    region: state.region,
    sort: state.sort,
  }).toString();
}

function buildInspector(kind, item) {
  if (!item) {
    return null;
  }

  if (kind === "customer") {
    return {
      eyebrow: "Customer Segment",
      title: item.segment,
      meta: [item.region.toUpperCase(), item.firstFailedAt, item.arr],
      summary: `${item.affectedAccounts} accounts recorded invoice failures in the first incident wave.`,
      detail: item.note,
      bullets: [
        `First failed at ${item.firstFailedAt}.`,
        `Affected accounts: ${item.affectedAccounts}.`,
        `Segment ARR: ${item.arr}.`,
      ],
    };
  }

  if (kind === "trace") {
    return {
      eyebrow: "Trace Detail",
      title: item.title,
      meta: [item.latency, item.region.toUpperCase(), item.id],
      summary: item.summary,
      detail: item.detail,
      bullets: item.bullets,
    };
  }

  if (kind === "flag") {
    return {
      eyebrow: "Feature Flag Note",
      title: item.name,
      meta: [item.exposure, `Owner: ${item.owner}`],
      summary: item.summary,
      detail: item.detail,
      bullets: item.bullets,
    };
  }

  return {
    eyebrow: "Deployment Drilldown",
    title: item.id,
    meta: [item.shippedAt, `Peak error rate ${item.errorRate}%`],
    summary: item.summary,
    detail: item.insight,
    bullets: item.bullets,
  };
}

function filterTracesByRegion(data, region) {
  if (region === "all") {
    return data.traces;
  }

  if (region === "enterprise") {
    return data.traces.filter((trace) =>
      trace.title.toLowerCase().includes("enterprise"),
    );
  }

  return data.traces.filter((trace) => trace.region === region);
}

function getSortedCustomers(data, state) {
  let customers = data.customers;
  if (state.region === "eu" || state.region === "us") {
    customers = customers.filter(
      (customer) => customer.region === state.region,
    );
  }
  if (state.region === "enterprise") {
    customers = customers.filter((customer) =>
      customer.segment.toLowerCase().includes("enterprise"),
    );
  }

  const sorted = [...customers];
  if (state.sort === "first-failure") {
    sorted.sort((left, right) =>
      left.firstFailedAt.localeCompare(right.firstFailedAt),
    );
    return sorted;
  }

  sorted.sort((left, right) => parseDollar(right.arr) - parseDollar(left.arr));
  return sorted;
}

function parseDollar(value) {
  return Number.parseFloat(value.replace(/[$Mk,]/g, ""));
}

function formatRegionLabel(region) {
  if (region === "all") {
    return "all regions";
  }
  if (region === "enterprise") {
    return "the enterprise lens";
  }
  return `${region.toUpperCase()} traffic`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
