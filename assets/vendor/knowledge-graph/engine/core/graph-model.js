export class GraphModel {
  constructor(rawGraph) {
    this.nodes = (rawGraph.nodes || []).map((node) => ({ ...node }));
    this.nodeById = new Map(this.nodes.map((node) => [node.id, node]));
    this.linkIds = (rawGraph.links || [])
      .map((link) => normalizeLink(link))
      .map((link) => [link.source, link.target, link.kind, link.id, link.directed, link.data]);
    this.links = this.linkIds
      .map(([source, target, kind, id, directed, data]) => ({
        id: id || `${source}->${target}:${kind}`,
        source: this.nodeById.get(source),
        sourceId: source,
        target: this.nodeById.get(target),
        targetId: target,
        kind,
        directed,
        data: data || {}
      }))
      .filter((link) => link.source && link.target);
    this.linkById = new Map(this.links.map((link) => [link.id, link]));
  }

  resetPositions() {
    for (const node of this.nodes) {
      node.x = undefined;
      node.y = undefined;
    }
  }

  applyPositions(ids, coords) {
    ids.forEach((id, index) => {
      const node = this.nodeById.get(id);
      if (!node) return;
      node.x = coords[index * 2];
      node.y = coords[index * 2 + 1];
      node.z = node.z ?? 0;
    });
  }

  makeWorkerNodes() {
    const payload = {};
    this.nodes.forEach((node, index) => {
      const seed = seededPosition(index, this.nodes.length);
      payload[node.id] = [
        Number.isFinite(node.x) ? node.x : seed.x,
        Number.isFinite(node.y) ? node.y : seed.y
      ];
    });
    return payload;
  }

  highlightedNodes(query) {
    if (!query) return new Set(this.nodes);

    const normalized = query.trim().toLowerCase();
    const matches = this.nodes.filter((node) => String(node.label || "").toLowerCase().includes(normalized));
    const set = new Set(matches);

    for (const link of this.links) {
      if (set.has(link.source)) set.add(link.target);
      if (set.has(link.target)) set.add(link.source);
    }

    return set;
  }
}

function normalizeLink(link) {
  if (Array.isArray(link)) {
    return {
      source: link[0],
      target: link[1],
      kind: link[2] || "related",
      id: link[3] || `${link[0]}->${link[1]}:${link[2] || "related"}`,
      directed: true,
      data: {}
    };
  }

  return {
    id: link.id || `${link.source}->${link.target}:${link.kind || "related"}`,
    source: link.source,
    target: link.target,
    kind: link.kind || "related",
    directed: link.directed ?? true,
    data: link.data || {}
  };
}

function seededPosition(index, total) {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const radius = 140 + (index % 5) * 22;
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}
