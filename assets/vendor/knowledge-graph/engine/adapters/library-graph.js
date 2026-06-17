import { resolveColorGroupColor } from "../core/color-groups.js";

const palette = {
  note: "#7dd3fc",
  course: "#a7f3d0",
  tag: "#fde68a",
  type: "#fca5a5",
  author: "#c4b5fd",
  orphan: "#94a3b8"
};

export const defaultLibraryGraphOptions = {
  depth: 2,
  showNeighborLinks: true,
  showForelinks: true,
  showBacklinks: true,
  showTags: true,
  showAttachments: true,
  showExistingOnly: false,
  showOrphans: true,
  groups: []
};

export const defaultGraphOptions = defaultLibraryGraphOptions;

export function buildLibraryGraph({ files, focusFileId = "", options = {} }) {
  const graphOptions = { ...defaultLibraryGraphOptions, ...options };
  const safeFiles = Array.isArray(files) ? files : [];
  const fullGraph = buildFullGraph(safeFiles, focusFileId, graphOptions);
  const scopedGraph = focusFileId ? scopeLocalGraph(fullGraph, `file:${focusFileId}`, graphOptions) : fullGraph;

  return {
    ...scopedGraph,
    focusFile: safeFiles.find((file) => file.id === focusFileId) || null
  };
}

function buildFullGraph(files, focusFileId, options) {
  const nodes = [];
  const links = [];
  const nodeIds = new Set();
  const linkIds = new Set();

  function addNode(node) {
    if (!node?.id || nodeIds.has(node.id)) return;
    nodeIds.add(node.id);
    nodes.push(applyGraphGroups(node, options.groups));
  }

  function addLink(source, target, kind = "related") {
    if (!nodeIds.has(source) || !nodeIds.has(target)) return;
    const linkId = `${source}\u0000${target}\u0000${kind}`;
    if (linkIds.has(linkId)) return;
    linkIds.add(linkId);
    links.push([source, target, kind]);
  }

  for (const file of files) {
    if (!file?.id) continue;
    const isFocus = file.id === focusFileId;
    addNode({
      id: `file:${file.id}`,
      fileId: file.id,
      label: file.title || file.id,
      kind: "note",
      radius: isFocus ? 13 : 8 + Math.min(5, Math.round((file.references || 0) / 3)),
      color: isFocus ? "#52a9ff" : palette.note
    });
  }

  for (const file of files) {
    if (!file?.id) continue;
    const fileNodeId = `file:${file.id}`;
    const courseNodeId = file.course ? `course:${file.course}` : "";
    const typeNodeId = file.type ? `type:${file.type}` : "";
    const authorNodeId = file.author ? `author:${file.author}` : "";

    if (file.course) addNode({ id: courseNodeId, label: file.course, kind: "course", radius: 10, color: palette.course });
    if (options.showAttachments && file.type) addNode({ id: typeNodeId, label: file.type, kind: "type", radius: 7, color: palette.type });
    if (file.author) addNode({ id: authorNodeId, label: file.author, kind: "author", radius: 7, color: palette.author });

    if (options.showForelinks) {
      if (courseNodeId) addLink(fileNodeId, courseNodeId, "outgoing");
      if (options.showAttachments && typeNodeId) addLink(fileNodeId, typeNodeId, "outgoing");
      if (authorNodeId) addLink(fileNodeId, authorNodeId, "outgoing");
    }

    if (options.showBacklinks) {
      if (courseNodeId) addLink(courseNodeId, fileNodeId, "incoming");
      if (options.showAttachments && typeNodeId) addLink(typeNodeId, fileNodeId, "incoming");
      if (authorNodeId) addLink(authorNodeId, fileNodeId, "incoming");
    }

    if (options.showTags) {
      for (const tag of file.tags || []) {
        const tagNodeId = `tag:${tag}`;
        addNode({ id: tagNodeId, label: tag, kind: "tag", radius: 7, color: palette.tag });
        if (options.showForelinks) addLink(fileNodeId, tagNodeId, "outgoing");
        if (options.showBacklinks) addLink(tagNodeId, fileNodeId, "incoming");
      }
    }
  }

  for (const course of unique(files.map((file) => file.course))) {
    const sameCourseFiles = files.filter((file) => file.course === course && file.id);
    for (let index = 1; index < sameCourseFiles.length; index += 1) {
      addLink(`file:${sameCourseFiles[index - 1].id}`, `file:${sameCourseFiles[index].id}`, "neighbor");
    }
  }

  const filtered = options.showOrphans ? { nodes, links } : removeOrphans({ nodes, links });

  return {
    nodes: focusFileId ? prioritizeFocus(filtered.nodes, focusFileId) : filtered.nodes,
    links: filtered.links
  };
}

function prioritizeFocus(nodes, focusFileId) {
  const focusNodeId = `file:${focusFileId}`;
  return [...nodes].sort((first, second) => {
    if (first.id === focusNodeId) return -1;
    if (second.id === focusNodeId) return 1;
    return 0;
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function applyGraphGroups(node, groups = []) {
  const colorGroups = groups.map((group, index) => ({
    id: group.id || `group:${index}`,
    ...group
  }));
  const result = resolveColorGroupColor({ node }, colorGroups, {
    fallbackColor: () => node.color
  });
  return result.groupId ? { ...node, color: result.color, colorGroupId: result.groupId } : node;
}

function removeOrphans(graph) {
  const linkedNodeIds = new Set(graph.links.flatMap(([source, target]) => [source, target]));
  return {
    nodes: graph.nodes.filter((node) => linkedNodeIds.has(node.id)),
    links: graph.links
  };
}

function scopeLocalGraph(graph, focusNodeId, options) {
  const distanceByNodeId = new Map([[focusNodeId, 0]]);
  const queue = [focusNodeId];
  const adjacency = makeAdjacency(graph.links);

  while (queue.length > 0) {
    const current = queue.shift();
    const distance = distanceByNodeId.get(current);
    if (distance >= Number(options.depth)) continue;

    for (const next of adjacency.get(current) || []) {
      if (distanceByNodeId.has(next)) continue;
      distanceByNodeId.set(next, distance + 1);
      queue.push(next);
    }
  }

  const scopedNodeIds = new Set(distanceByNodeId.keys());
  const links = graph.links.filter(([source, target, kind]) => {
    if (!scopedNodeIds.has(source) || !scopedNodeIds.has(target)) return false;
    if (!options.showNeighborLinks && kind === "neighbor" && source !== focusNodeId && target !== focusNodeId) return false;
    return true;
  });

  return {
    nodes: graph.nodes.filter((node) => scopedNodeIds.has(node.id)),
    links
  };
}

function makeAdjacency(links) {
  const adjacency = new Map();
  for (const [source, target] of links) {
    if (!adjacency.has(source)) adjacency.set(source, new Set());
    if (!adjacency.has(target)) adjacency.set(target, new Set());
    adjacency.get(source).add(target);
    adjacency.get(target).add(source);
  }
  return adjacency;
}
