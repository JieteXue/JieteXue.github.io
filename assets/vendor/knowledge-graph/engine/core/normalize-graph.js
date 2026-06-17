const defaultNodePalette = {
  default: "#7dd3fc",
  blocked: "#fca5a5",
  done: "#86efac",
  failed: "#fca5a5",
  running: "#93c5fd",
  waiting: "#fde68a"
};

export function normalizeGraph({ nodes = [], links = [] } = {}) {
  const normalizedNodes = [];
  const nodeIds = new Set();

  for (const node of nodes) {
    if (!node?.id || nodeIds.has(node.id)) continue;
    nodeIds.add(node.id);
    normalizedNodes.push(normalizeNode(node));
  }

  const normalizedLinks = [];
  const linkIds = new Set();

  for (const link of links) {
    const normalized = normalizeLink(link);
    if (!normalized.source || !normalized.target) continue;
    if (!nodeIds.has(normalized.source) || !nodeIds.has(normalized.target)) continue;
    const id = normalized.id || `${normalized.source}->${normalized.target}:${normalized.kind}`;
    if (linkIds.has(id)) continue;
    linkIds.add(id);
    normalizedLinks.push({ ...normalized, id });
  }

  return {
    nodes: normalizedNodes,
    links: normalizedLinks
  };
}

function normalizeNode(node) {
  const status = node.status || node.data?.status || "";
  return {
    ...node,
    id: String(node.id),
    label: String(node.label || node.id),
    kind: node.kind || "node",
    status,
    radius: Number.isFinite(node.radius) ? node.radius : 8,
    color: node.color || defaultNodePalette[status] || defaultNodePalette.default,
    x: Number.isFinite(node.x) ? node.x : undefined,
    y: Number.isFinite(node.y) ? node.y : undefined,
    data: node.data || {}
  };
}

function normalizeLink(link) {
  if (Array.isArray(link)) {
    return {
      id: link[3],
      source: link[0],
      target: link[1],
      kind: link[2] || "related",
      directed: true,
      data: {}
    };
  }

  return {
    ...link,
    source: link?.source,
    target: link?.target,
    kind: link?.kind || "related",
    directed: link?.directed ?? true,
    data: link?.data || {}
  };
}
