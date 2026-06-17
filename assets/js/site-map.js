import {
  Canvas2DRenderer,
  createSimulationClient,
  defaultDisplayOptions,
  GraphModel,
  normalizeGraph
} from "../vendor/knowledge-graph/engine/index.js";

const canvas = document.getElementById("site-map-network");
const dataElement = document.getElementById("site-map-data");
const detail = document.getElementById("site-map-detail");
const nodeDetail = document.getElementById("site-map-node-detail");
const status = document.getElementById("site-map-status");

const palette = {
  root: "#58a6ff",
  primary: "#3fb950",
  knowledge: "#79c0ff",
  math: "#a371f7",
  physics: "#d29922",
  tool: "#39c5cf",
  project: "#d2a8ff",
  future: "#8b949e",
  profile: "#ffa657"
};

const linkPalette = {
  contains: "rgba(63, 185, 80, 0.42)",
  related: "rgba(121, 192, 255, 0.36)",
  route: "rgba(57, 197, 207, 0.42)"
};

if (canvas && dataElement && detail && nodeDetail) {
  const siteMap = JSON.parse(dataElement.textContent || "{}");
  const graph = normalizeGraph({
    nodes: (siteMap.nodes || []).map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.type || "node",
      radius: node.type === "root" ? 15 : node.type === "primary" ? 12 : 9,
      color: palette[node.type] || palette.future,
      x: Number.isFinite(node.x) ? node.x - 460 : undefined,
      y: Number.isFinite(node.y) ? node.y - 300 : undefined,
      data: {
        description: node.description || "",
        href: node.href || "#",
        type: node.type || "node"
      }
    })),
    links: (siteMap.edges || []).map((edge, index) => ({
      id: edge.id || `${edge.from}->${edge.to}:${index}`,
      source: edge.from,
      target: edge.to,
      kind: edge.type || "contains",
      directed: true
    }))
  });

  const model = new GraphModel(graph);
  let renderer = null;
  let selectedNodeId = null;
  let hoveredNodeId = null;
  let fitOnNextTick = true;
  let forceSettings = readForceSettings();
  let displaySettings = readDisplaySettings();

  const simulation = createSimulationClient({
    workerUrl: new URL("../vendor/knowledge-graph/engine/layout/force-worker.js", import.meta.url),
    model,
    motionController: {
      onTick(metrics) {
        if (!metrics) return null;
        if (metrics.edgeAngleDelta < 0.002 && metrics.edgeLengthDelta < 0.25 && metrics.alpha < 0.1) {
          return { damp: 0.12 };
        }
        return null;
      }
    },
    onSettled: () => {
      status && (status.textContent = `${model.nodes.length} nodes, ${model.links.length} links`);
      renderer?.render();
    },
    onTick: () => {
      if (fitOnNextTick) {
        fitOnNextTick = false;
        renderer?.resetZoom({ padding: 72 });
        return;
      }
      renderer?.render();
    }
  });

  renderer = new Canvas2DRenderer({
    canvas,
    model,
    getAppearance: () => ({
      display: {
        ...defaultDisplayOptions,
        linkThickness: 1.15,
        nodeSize: displaySettings.nodeSize,
        textFade: 0.55
      },
      labelPolicy: {
        density: 0.95,
        mode: "density",
        priority: "degree",
        textFade: 0.55
      },
      nodeSizePolicy: {
        maxScale: 1.75,
        minScale: 1,
        mode: "metric",
        priority: "degree",
        strength: 0.28
      },
      theme: {
        canvas: {
          background: "rgba(5, 8, 15, 0.92)"
        },
        node: {
          fill: "#7dd3fc",
          stroke: "rgba(230, 237, 243, 0.22)",
          hoverFill: "#facc15",
          hoverStroke: "#fde68a",
          selectedFill: "#f8fafc",
          selectedStroke: "#39c5cf",
          dimmedFill: "rgba(74, 86, 103, 0.22)",
          dimmedStroke: "rgba(230, 237, 243, 0.06)",
          accentRingColor: "#39c5cf",
          accentRingWidth: 2
        },
        link: {
          defaultColor: "rgba(139, 148, 158, 0.28)",
          activeColor: "rgba(57, 197, 207, 0.78)",
          dimmedColor: "rgba(139, 148, 158, 0.08)",
          byKind: linkPalette
        },
        label: {
          color: "rgba(230, 237, 243, 0.96)",
          dimmedColor: "rgba(230, 237, 243, 0.18)",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 12,
          fontWeight: "700",
          density: 0.95
        }
      },
      viewport: {
        fitPadding: 72,
        maxScale: 3.8,
        minScale: 0.18,
        zoomStep: 1.18
      }
    }),
    getHighlightedLinks,
    getHighlightedNodes,
    interaction: {
      hoveredNodeId,
      openOn: "double-click",
      selectedNodeId,
      selectOnClick: true
    },
    events: {
      onNodeDrag: ({ alpha, node, point }) => {
        simulation.pinNode(node.id, point, alpha);
      },
      onNodeHover: ({ node }) => {
        hoveredNodeId = node?.id || null;
        renderer?.setInteractionState({ hoveredNodeId }, { render: false });
      },
      onNodeOpen: ({ node }) => {
        openNode(node);
      },
      onNodeRelease: ({ node }) => {
        simulation.releaseNode(node.id);
      },
      onNodeSelect: ({ node }) => {
        selectedNodeId = node?.id || null;
        renderer?.setInteractionState({ selectedNodeId });
        renderDetail(selectedNodeId);
      },
      onStatus: ({ statusText }) => {
        if (status) status.textContent = statusText;
      }
    }
  });

  bindForceControls();
  bindDisplayControls();

  renderDetail(null);
  simulation.start(forceSettings, 1);

  function bindForceControls() {
    document.querySelectorAll("[data-force-input]").forEach((input) => {
      const key = input.dataset.forceInput;
      syncOutput("force", key, input.value);
      input.addEventListener("input", () => {
        forceSettings = {
          ...forceSettings,
          [key]: Number(input.value)
        };
        syncOutput("force", key, input.value);
        simulation.updateForces(forceSettings, 0.85);
      });
    });
  }

  function bindDisplayControls() {
    document.querySelectorAll("[data-display-input]").forEach((input) => {
      const key = input.dataset.displayInput;
      syncOutput("display", key, input.value);
      input.addEventListener("input", () => {
        displaySettings = {
          ...displaySettings,
          [key]: Number(input.value)
        };
        syncOutput("display", key, input.value);
        renderer?.render();
      });
    });
  }
}

function getHighlightedNodes(activeNodeId, { model }) {
  const nodes = new Set([activeNodeId]);
  for (const link of model.links) {
    if (link.sourceId === activeNodeId) nodes.add(link.targetId);
    if (link.targetId === activeNodeId) nodes.add(link.sourceId);
  }
  return nodes;
}

function getHighlightedLinks(activeNodeId, { model }) {
  return model.links
    .filter((link) => link.sourceId === activeNodeId || link.targetId === activeNodeId)
    .map((link) => link.id);
}

function readForceSettings() {
  return {
    repelStrength: readControlNumber("force", "repelStrength", 520),
    linkDistance: readControlNumber("force", "linkDistance", 150),
    linkStrength: readControlNumber("force", "linkStrength", 1.05),
    centerStrength: readControlNumber("force", "centerStrength", 0.07)
  };
}

function readDisplaySettings() {
  return {
    nodeSize: readControlNumber("display", "nodeSize", 1.08)
  };
}

function readControlNumber(kind, key, fallback) {
  const input = document.querySelector(`[data-${kind}-input="${key}"]`);
  const value = Number(input?.value);
  return Number.isFinite(value) ? value : fallback;
}

function syncOutput(kind, key, value) {
  const output = document.querySelector(`[data-${kind}-output="${key}"]`);
  if (!output) return;
  output.value = formatControlValue(Number(value));
  output.textContent = output.value;
}

function formatControlValue(value) {
  if (!Number.isFinite(value)) return "-";
  if (Math.abs(value) < 10 && !Number.isInteger(value)) {
    return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  }
  return String(value);
}

function renderDetail(nodeId) {
  const node = nodeId ? getNode(nodeId) : null;
  if (!node) {
    nodeDetail.innerHTML = `
      <p class="eyebrow">Selected node</p>
      <h2>未选择节点</h2>
      <p>点击图中的节点查看入口说明；拖拽节点、滚轮缩放可以探索关系。</p>
    `;
    return;
  }

  const href = node.data?.href || "#";
  const external = href.startsWith("http://") || href.startsWith("https://");
  nodeDetail.innerHTML = `
    <p class="eyebrow">${escapeHtml(node.data?.type || node.kind)}</p>
    <h2>${escapeHtml(node.label)}</h2>
    <p>${escapeHtml(node.data?.description || "")}</p>
    <a href="${escapeAttribute(href)}"${external ? ' target="_blank" rel="noreferrer"' : ""}>Open node</a>
  `;
}

function openNode(node) {
  const href = node?.data?.href;
  if (!href || href === "#") return;
  window.location.href = href;
}

function getNode(nodeId) {
  if (!dataElement) return null;
  const siteMap = JSON.parse(dataElement.textContent || "{}");
  const raw = (siteMap.nodes || []).find((node) => node.id === nodeId);
  if (!raw) return null;
  return {
    id: raw.id,
    label: raw.label,
    kind: raw.type,
    data: {
      description: raw.description,
      href: raw.href,
      type: raw.type
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
