const frameMs = 1000 / 60;
const velocityDecay = 0.58;
const alphaDecay = 1 - Math.pow(0.001, 1 / 300);
const stopThreshold = 0.001;

let nodes = [];
let links = [];
let nodeById = new Map();
let alpha = 1;
let alphaTarget = 0;
let timer = null;
let forces = {
  centerStrength: 0.08,
  linkStrength: 1,
  linkDistance: 145,
  repelStrength: 420
};

self.onmessage = (event) => {
  const message = event.data || {};

  if (message.nodes) {
    syncNodes(message.nodes);
  }

  if (message.links) {
    syncLinks(message.links);
  }

  if (message.forceNode) {
    pinNode(message.forceNode);
  }

  if (message.motionControl) {
    applyMotionControl(message.motionControl);
  }

  if (message.forces) {
    forces = { ...forces, ...message.forces };
  }

  if (Number.isFinite(message.alpha) && alpha < message.alpha) {
    alpha = message.alpha;
  }

  if (Number.isFinite(message.alphaTarget)) {
    alphaTarget = message.alphaTarget;
  }

  if (message.run) {
    scheduleTick();
  }

  if (message.stop) {
    stopSimulation();
  }
};

function syncNodes(nextNodes) {
  const nextIds = new Set(Object.keys(nextNodes));
  nodeById = new Map([...nodeById].filter(([id]) => nextIds.has(id)));
  nodes = [];

  for (const [id, position] of Object.entries(nextNodes)) {
    const node = nodeById.get(id) || {
      id,
      x: 0,
      y: 0,
      previousX: null,
      previousY: null,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null
    };

    if (position) {
      node.x = Number(position[0]) || 0;
      node.y = Number(position[1]) || 0;
    }

    node.index = nodes.length;
    nodeById.set(id, node);
    nodes.push(node);
  }
}

function syncLinks(nextLinks) {
  links = nextLinks
    .map(([sourceId, targetId, kind, id]) => ({
      id: id || `${sourceId}->${targetId}:${kind || "related"}`,
      kind: kind || "related",
      source: nodeById.get(sourceId),
      target: nodeById.get(targetId)
    }))
    .filter((link) => link.source && link.target);
}

function pinNode({ id, x, y }) {
  const node = nodeById.get(id);
  if (!node) return;
  node.fx = Number.isFinite(x) ? x : null;
  node.fy = Number.isFinite(y) ? y : null;
}

function scheduleTick() {
  if (timer) return;
  timer = setTimeout(tick, frameMs);
}

function tick() {
  timer = null;
  if (nodes.length === 0 || alpha <= stopThreshold) {
    postMessage({ settled: true, metrics: makeMetrics() });
    return;
  }

  alpha += (alphaTarget - alpha) * alphaDecay;
  capturePreviousPositions();
  const previousEdgeState = captureEdgeState();
  applyCenterForce();
  applyLinkForce();
  applyRepelForce();
  integrate();
  const metrics = makeMetrics(previousEdgeState);
  postPositions(metrics);
  scheduleTick();
}

function applyCenterForce() {
  const strength = forces.centerStrength * alpha;

  for (const node of nodes) {
    node.vx += -node.x * strength;
    node.vy += -node.y * strength;
  }
}

function applyLinkForce() {
  const distance = Math.max(1, forces.linkDistance);
  const strength = forces.linkStrength * alpha * 0.08;

  for (const link of links) {
    const dx = link.target.x + link.target.vx - link.source.x - link.source.vx || jiggle();
    const dy = link.target.y + link.target.vy - link.source.y - link.source.vy || jiggle();
    const length = Math.max(1, Math.hypot(dx, dy));
    const force = ((length - distance) / length) * strength;
    const x = dx * force;
    const y = dy * force;

    link.target.vx -= x;
    link.target.vy -= y;
    link.source.vx += x;
    link.source.vy += y;
  }
}

function applyRepelForce() {
  const strength = Math.max(1, forces.repelStrength) * alpha;

  for (let sourceIndex = 0; sourceIndex < nodes.length; sourceIndex += 1) {
    const source = nodes[sourceIndex];

    for (let targetIndex = sourceIndex + 1; targetIndex < nodes.length; targetIndex += 1) {
      const target = nodes[targetIndex];
      const dx = target.x - source.x || jiggle();
      const dy = target.y - source.y || jiggle();
      const distanceSq = Math.max(36, dx * dx + dy * dy);
      const force = strength / distanceSq;
      const x = dx * force;
      const y = dy * force;

      source.vx -= x;
      source.vy -= y;
      target.vx += x;
      target.vy += y;
    }
  }
}

function integrate() {
  for (const node of nodes) {
    if (node.fx == null) {
      node.x += node.vx *= velocityDecay;
    } else {
      node.x = node.fx;
      node.vx = 0;
    }

    if (node.fy == null) {
      node.y += node.vy *= velocityDecay;
    } else {
      node.y = node.fy;
      node.vy = 0;
    }
  }
}

function postPositions(metrics) {
  const buffer = new ArrayBuffer(nodes.length * 2 * Float32Array.BYTES_PER_ELEMENT);
  const coords = new Float32Array(buffer);
  const ids = [];

  nodes.forEach((node, index) => {
    ids.push(node.id);
    coords[index * 2] = node.x;
    coords[index * 2 + 1] = node.y;
  });

  postMessage({ id: ids, buffer, metrics }, [buffer]);
}

function capturePreviousPositions() {
  for (const node of nodes) {
    node.previousX = node.x;
    node.previousY = node.y;
  }
}

function captureEdgeState() {
  return links.map((link) => {
    const dx = link.target.x - link.source.x;
    const dy = link.target.y - link.source.y;
    return {
      id: link.id,
      angle: Math.atan2(dy, dx),
      length: Math.hypot(dx, dy)
    };
  });
}

function makeMetrics(previousEdgeState = []) {
  let totalMovement = 0;
  let maxMovement = 0;

  for (const node of nodes) {
    const movement = Number.isFinite(node.previousX)
      ? Math.hypot(node.x - node.previousX, node.y - node.previousY)
      : 0;
    totalMovement += movement;
    maxMovement = Math.max(maxMovement, movement);
  }

  let totalEdgeLengthDelta = 0;
  let maxEdgeLengthDelta = 0;
  let totalEdgeAngleDelta = 0;
  let maxEdgeAngleDelta = 0;
  const previousById = new Map(previousEdgeState.map((edge) => [edge.id, edge]));

  for (const link of links) {
    const previous = previousById.get(link.id);
    if (!previous) continue;

    const dx = link.target.x - link.source.x;
    const dy = link.target.y - link.source.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const lengthDelta = Math.abs(length - previous.length);
    const angleDelta = angleDifference(angle, previous.angle);
    totalEdgeLengthDelta += lengthDelta;
    maxEdgeLengthDelta = Math.max(maxEdgeLengthDelta, lengthDelta);
    totalEdgeAngleDelta += angleDelta;
    maxEdgeAngleDelta = Math.max(maxEdgeAngleDelta, angleDelta);
  }

  const edgeCount = Math.max(1, links.length);
  return {
    alpha,
    averageMovement: nodes.length ? totalMovement / nodes.length : 0,
    edgeAngleDelta: totalEdgeAngleDelta / edgeCount,
    edgeLengthDelta: totalEdgeLengthDelta / edgeCount,
    energy: alpha,
    maxEdgeAngleDelta,
    maxEdgeLengthDelta,
    maxMovement,
    stopped: alpha <= stopThreshold
  };
}

function applyMotionControl(control) {
  if (Number.isFinite(control.damp)) {
    const damp = Math.max(0, Math.min(1, control.damp));
    for (const node of nodes) {
      node.vx *= 1 - damp;
      node.vy *= 1 - damp;
    }
  }

  for (const pin of control.pin || []) {
    pinNode(pin);
  }

  if (control.stop) {
    stopSimulation();
  }
}

function stopSimulation() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  alpha = 0;
  postMessage({ settled: true, metrics: makeMetrics() });
}

function angleDifference(first, second) {
  let difference = Math.abs(first - second);
  while (difference > Math.PI) difference = Math.abs(difference - Math.PI * 2);
  return difference;
}

function jiggle() {
  return (Math.random() - 0.5) * 1e-6;
}
