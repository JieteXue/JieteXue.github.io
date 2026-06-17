export const defaultDisplayOptions = {
  showArrows: true,
  textFade: 0.6,
  nodeSize: 1,
  linkThickness: 1
};

export const defaultRendererTheme = {
  canvas: {
    background: "#111418"
  },
  node: {
    fill: "#7dd3fc",
    stroke: "rgba(255,255,255,0.16)",
    hoverFill: "#ffd166",
    hoverStroke: "#fff4c2",
    selectedFill: "#f8fafc",
    selectedStroke: "#38bdf8",
    dimmedFill: "rgba(74, 86, 103, 0.2)",
    dimmedStroke: "rgba(255,255,255,0.05)",
    accentRingColor: "#38bdf8",
    accentRingWidth: 2,
    accentByStatus: {
      blocked: "#ef4444",
      done: "#22c55e",
      failed: "#ef4444",
      running: "#38bdf8",
      waiting: "#f59e0b"
    }
  },
  link: {
    defaultColor: "rgba(120, 138, 160, 0.28)",
    activeColor: "rgba(82, 169, 255, 0.78)",
    dimmedColor: "rgba(93, 107, 124, 0.08)",
    byKind: {}
  },
  label: {
    color: "rgba(247, 249, 251, 0.96)",
    dimmedColor: "rgba(247, 249, 251, 0.18)",
    font: "",
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
    fontSize: 12,
    fontStyle: "normal",
    fontWeight: "400",
    density: 1
  }
};

export const defaultGraphAppearance = {
  display: defaultDisplayOptions,
  hitTest: {
    minRadius: 9,
    padding: 4
  },
  hooks: {
    getLabelStyle: null,
    getLinkStyle: null,
    getNodeStyle: null
  },
  labelPolicy: {
    density: 1,
    mode: "density",
    priority: "degree",
    textFade: 0.6
  },
  nodeSizePolicy: {
    maxScale: 1.9,
    minScale: 1,
    mode: "metric",
    priority: "degree",
    strength: 0.32
  },
  theme: defaultRendererTheme,
  viewport: {
    fitPadding: 48,
    maxScale: 3.6,
    minScale: 0.18,
    zoomStep: 1.2
  }
};

const defaultCanvasFontFamily = "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";

export const defaultInteractionOptions = {
  clearSelectionOnCanvasClick: true,
  dragNodes: true,
  hover: true,
  openOn: "legacy",
  panCanvas: true,
  selectOnClick: undefined,
  zoomCanvas: true
};

export class Canvas2DRenderer {
  constructor({
    appearance,
    canvas,
    events,
    getAppearance,
    model,
    getQuery,
    getDisplayOptions,
    getHighlightedLinks,
    getHighlightedNodes,
    getTheme,
    hoveredNodeId,
    onNodeClick,
    onNodeDoubleClick,
    onNodeDrag,
    onNodeHover,
    onNodeOpen,
    onNodeRelease,
    onNodeSelect,
    onStatus,
    selectedNodeId,
    theme,
    interaction
  }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.model = model;
    this.events = events || {};
    this.getAppearance = getAppearance || (() => appearance || {});
    this.getQuery = getQuery || (() => "");
    this.getDisplayOptions = getDisplayOptions || (() => defaultDisplayOptions);
    this.getHighlightedLinks = getHighlightedLinks;
    this.getHighlightedNodes = getHighlightedNodes;
    this.getTheme = getTheme || (() => theme || {});
    this.interaction = normalizeInteractionOptions(interaction, {
      hasSelectHandler: Boolean(onNodeSelect || events?.onNodeSelect)
    });
    this.onNodeClick = onNodeClick;
    this.onNodeDoubleClick = onNodeDoubleClick;
    this.onNodeDrag = onNodeDrag;
    this.onNodeHover = onNodeHover;
    this.onNodeOpen = onNodeOpen;
    this.onNodeRelease = onNodeRelease;
    this.onNodeSelect = onNodeSelect;
    this.onStatus = onStatus;
    this.isSelectedControlled = selectedNodeId !== undefined || interaction?.selectedNodeId !== undefined;
    this.isHoveredControlled = hoveredNodeId !== undefined || interaction?.hoveredNodeId !== undefined;
    this.selectedNodeId = selectedNodeId ?? interaction?.selectedNodeId ?? null;
    this.hoveredNodeId = hoveredNodeId ?? interaction?.hoveredNodeId ?? null;
    this.state = {
      dpr: 1,
      width: 1,
      height: 1,
      scale: 1,
      panX: 0,
      panY: 0,
      draggingCanvas: false,
      draggedNode: null,
      hoverNode: null,
      lastX: 0,
      lastY: 0,
      downX: 0,
      downY: 0
    };

    this.handleDoubleClick = (event) => this.onDoubleClick(event);
    this.handleResize = () => this.resize();
    this.handlePointerDown = (event) => this.onPointerDown(event);
    this.handlePointerMove = (event) => this.onPointerMove(event);
    this.handlePointerUp = (event) => this.onPointerUp(event);
    this.handleWheel = (event) => this.onWheel(event);
    window.addEventListener("resize", this.handleResize);
    this.installPointerEvents();
    this.resize();
  }

  dispose() {
    window.removeEventListener("resize", this.handleResize);
    this.canvas.removeEventListener("dblclick", this.handleDoubleClick);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
    this.canvas.removeEventListener("wheel", this.handleWheel);
  }

  setInteractionState({ selectedNodeId, hoveredNodeId } = {}, { render = true } = {}) {
    if (selectedNodeId !== undefined) {
      this.isSelectedControlled = true;
      this.selectedNodeId = selectedNodeId;
    }

    if (hoveredNodeId !== undefined) {
      this.isHoveredControlled = true;
      this.hoveredNodeId = hoveredNodeId;
      this.state.hoverNode = this.model.nodeById.get(hoveredNodeId) || null;
      this.canvas.classList.toggle("has-node-hover", Boolean(this.state.hoverNode));
    }

    if (render) this.render();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.state.dpr = window.devicePixelRatio || 1;
    this.state.width = Math.max(1, rect.width);
    this.state.height = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.state.width * this.state.dpr);
    this.canvas.height = Math.round(this.state.height * this.state.dpr);
    this.ctx.setTransform(this.state.dpr, 0, 0, this.state.dpr, 0, 0);
    this.render();
  }

  render() {
    const { ctx, state } = this;
    const appearance = this.resolveAppearance();
    const displayOptions = appearance.display;
    const theme = appearance.theme;
    const highlight = this.getHighlightContext();
    const degreeByNode = this.getNodeDegreeMap();

    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = theme.canvas.background;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.save();
    ctx.translate(state.width / 2 + state.panX, state.height / 2 + state.panY);
    ctx.scale(state.scale, state.scale);
    this.drawLinks(highlight, displayOptions, theme, appearance, degreeByNode);
    this.drawNodes(highlight, displayOptions, theme, appearance, degreeByNode);
    ctx.restore();

    this.drawLabels(highlight, displayOptions, theme, appearance, degreeByNode);
    const resolvedAppearance = this.getResolvedAppearance();
    const statusText = `${this.model.nodes.length} nodes, ${this.model.links.length} links`;
    this.onStatus?.(statusText);
    this.events.onStatus?.(this.createEventPayload("status", null, null, { resolvedAppearance, statusText }));
  }

  resetZoom(options = {}) {
    const appearance = this.resolveAppearance();
    const padding = options.padding ?? appearance.viewport.fitPadding;
    const minScale = options.minScale ?? appearance.viewport.minScale;
    const maxScale = options.maxScale ?? appearance.viewport.maxScale;
    const bounds = this.getNodeBounds();
    if (!bounds) return false;

    const availableWidth = Math.max(1, this.state.width - padding * 2);
    const availableHeight = Math.max(1, this.state.height - padding * 2);
    const graphWidth = Math.max(1, bounds.maxX - bounds.minX);
    const graphHeight = Math.max(1, bounds.maxY - bounds.minY);
    const nextScale = Math.max(minScale, Math.min(maxScale, Math.min(availableWidth / graphWidth, availableHeight / graphHeight)));
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    this.state.scale = nextScale;
    this.state.panX = -centerX * nextScale;
    this.state.panY = -centerY * nextScale;
    this.render();
    return true;
  }

  getNodeBounds() {
    const appearance = this.resolveAppearance();
    const displayOptions = appearance.display;
    const degreeByNode = this.getNodeDegreeMap();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let hasNode = false;

    for (const node of this.model.nodes) {
      if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
      const radius = Math.max(1, this.getNodeRadius(node, displayOptions, appearance, degreeByNode));
      minX = Math.min(minX, node.x - radius);
      minY = Math.min(minY, node.y - radius);
      maxX = Math.max(maxX, node.x + radius);
      maxY = Math.max(maxY, node.y + radius);
      hasNode = true;
    }

    return hasNode ? { minX, minY, maxX, maxY } : null;
  }

  drawLinks(highlight, displayOptions, theme, appearance, degreeByNode) {
    const { ctx, state } = this;
    ctx.lineWidth = Math.max(0.5, displayOptions.linkThickness) / state.scale;

    for (const link of this.model.links) {
      const active = highlight.links.has(link) || highlight.links.has(link.id);
      const dimmed = highlight.shouldDim && !active;
      const style = this.getLinkStyle(link, { active, dimmed }, appearance);
      ctx.strokeStyle = style.color;
      ctx.lineWidth = Math.max(0.5, style.width ?? displayOptions.linkThickness) / state.scale;
      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.stroke();
      if (displayOptions.showArrows && link.directed !== false && state.scale >= 0.7) {
        this.drawArrow(link, active, dimmed, theme, appearance, degreeByNode);
      }
    }
  }

  drawArrow(link, active, dimmed, theme, appearance, degreeByNode) {
    const { ctx, state } = this;
    const angle = Math.atan2(link.target.y - link.source.y, link.target.x - link.source.x);
    const radius = Math.max(5, this.getNodeRadius(link.target, appearance.display, appearance, degreeByNode));
    const size = 7 / state.scale;
    const x = link.target.x - Math.cos(angle) * (radius + 3);
    const y = link.target.y - Math.sin(angle) * (radius + 3);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = this.getLinkStyle(link, { active, dimmed }, appearance).color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, size * 0.45);
    ctx.lineTo(-size, -size * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawNodes(highlight, displayOptions, theme, appearance, degreeByNode) {
    const { ctx, state } = this;
    const selectedNode = this.getSelectedNode();
    const hoveredNode = this.getHoveredNode();

    for (const node of this.model.nodes) {
      const isSelected = node === selectedNode;
      const isHovered = node === hoveredNode;
      const isMatch = highlight.nodes.has(node) || highlight.nodes.has(node.id);
      const dimmed = highlight.shouldDim && !isMatch;
      const radius = this.getNodeRadius(node, displayOptions, appearance, degreeByNode);
      const style = this.getNodeStyle(node, { dimmed, isHovered, isMatch, isSelected }, appearance);
      ctx.beginPath();
      ctx.fillStyle = style.fill;
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = style.stroke;
      ctx.lineWidth = (style.strokeWidth ?? (isHovered || isSelected ? 2 : 1)) / state.scale;
      ctx.stroke();
      this.drawNodeAccent(node, radius, { dimmed, isHovered, isSelected }, theme, style);
    }
  }

  drawNodeAccent(node, radius, flags, theme, style = {}) {
    const color = style.accentColor ?? getNodeAccentColor(node, flags, theme);
    if (!color || flags.dimmed) return;

    const { ctx, state } = this;
    const width = Number(style.accentWidth ?? theme.node.accentRingWidth) || 2;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width / state.scale;
    ctx.arc(node.x, node.y, radius + 4 / state.scale, 0, Math.PI * 2);
    ctx.stroke();
  }

  drawLabels(highlight, displayOptions, theme, appearance, degreeByNode) {
    const { ctx, state } = this;
    const selectedNode = this.getSelectedNode();
    const hoveredNode = this.getHoveredNode();
    const labelOptions = this.getResolvedLabelOptions(appearance);
    if (labelOptions.mode === "none") return;
    const normalLabelCoverage = this.getNormalLabelCoverage(highlight, selectedNode, hoveredNode, labelOptions, degreeByNode);
    ctx.save();
    ctx.font = labelOptions.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    this.model.nodes.forEach((node) => {
      const pos = this.worldToScreen(node);
      if (pos.x < -80 || pos.y < -40 || pos.x > state.width + 80 || pos.y > state.height + 40) return;

      const isSelected = node === selectedNode;
      const isHovered = node === hoveredNode;
      const isMatch = highlight.nodes.has(node) || highlight.nodes.has(node.id);
      const dimmed = highlight.shouldDim && !isMatch;
      const isActiveLabel = isSelected || isHovered || isMatch;
      const labelCoverage = this.getNodeLabelCoverage({ isActiveLabel, node, scale: state.scale }, labelOptions, normalLabelCoverage);
      if (labelCoverage <= 0) return;

      const baseAlpha = dimmed ? 0.18 : isActiveLabel ? 0.98 : Math.min(0.76, Math.max(0.24, state.scale / Math.max(labelOptions.textFade, 0.2)));
      const alpha = isActiveLabel ? baseAlpha : baseAlpha * labelCoverage;
      const labelStyle = this.getLabelStyle(node, { alpha, dimmed, isHovered, isMatch, isSelected }, appearance);
      ctx.fillStyle = labelStyle.color;
      if (labelStyle.font) ctx.font = labelStyle.font;
      ctx.fillText(node.label, pos.x, pos.y + this.getNodeRadius(node, displayOptions, appearance, degreeByNode) * state.scale + 5);
    });

    ctx.restore();
  }

  installPointerEvents() {
    this.canvas.addEventListener("dblclick", this.handleDoubleClick);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  onPointerDown(event) {
    this.canvas.setPointerCapture(event.pointerId);
    const node = this.findNodeAt(event.clientX, event.clientY);
    this.state.lastX = event.clientX;
    this.state.lastY = event.clientY;
    this.state.downX = event.clientX;
    this.state.downY = event.clientY;
    this.state.draggedNode = this.interaction.dragNodes ? node : null;
    this.state.draggingCanvas = !node && this.interaction.panCanvas;
    this.canvas.classList.add("dragging");

    if (node && this.interaction.dragNodes) {
      const point = this.clientToWorld(event.clientX, event.clientY);
      this.emitNodeDrag(node, point, event, 0.35);
    }
  }

  onPointerMove(event) {
    if (this.state.draggedNode) {
      this.emitNodeDrag(this.state.draggedNode, this.clientToWorld(event.clientX, event.clientY), event, 0.28);
    } else if (this.state.draggingCanvas) {
      this.state.panX += event.clientX - this.state.lastX;
      this.state.panY += event.clientY - this.state.lastY;
      this.render();
    } else if (this.interaction.hover) {
      this.updateHoverNode(this.findNodeAt(event.clientX, event.clientY), event);
      this.render();
    }

    this.state.lastX = event.clientX;
    this.state.lastY = event.clientY;
  }

  onPointerUp(event) {
    if (this.canvas.hasPointerCapture?.(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }

    const draggedNode = this.state.draggedNode;
    const distance = Math.hypot(event.clientX - this.state.downX, event.clientY - this.state.downY);
    if (draggedNode) {
      this.emitNodeRelease(draggedNode, event);
      if (distance < 4) this.handleNodeClick(draggedNode, event);
    } else if (this.state.draggingCanvas && distance < 4 && this.interaction.clearSelectionOnCanvasClick) {
      this.handleNodeClick(null, event);
    }

    this.state.draggedNode = null;
    this.state.draggingCanvas = false;
    this.canvas.classList.remove("dragging");
    this.render();
  }

  onDoubleClick(event) {
    const node = this.findNodeAt(event.clientX, event.clientY);
    if (!node) return;
    const payload = this.createEventPayload("node:double-click", node, event);
    this.onNodeDoubleClick?.(node, event);
    this.events.onNodeDoubleClick?.(payload);
    if (this.shouldOpenOn("double-click")) {
      this.emitNodeOpen(node, event, "double-click");
    }
  }

  onWheel(event) {
    if (!this.interaction.zoomCanvas) return;
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const before = this.screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
    const viewport = this.resolveAppearance().viewport;
    const factor = Math.pow(viewport.zoomStep, -event.deltaY / 120);
    this.state.scale = Math.max(viewport.minScale, Math.min(viewport.maxScale, this.state.scale * factor));
    const after = this.worldToScreen(before);
    this.state.panX += event.clientX - rect.left - after.x;
    this.state.panY += event.clientY - rect.top - after.y;
    this.render();
  }

  handleNodeClick(node, event) {
    const payload = this.createEventPayload("node:click", node, event);
    this.onNodeClick?.(node, event);
    this.events.onNodeClick?.(payload);

    if (this.shouldSelectOnClick()) {
      this.selectNode(node, event);
    }

    if (node && this.shouldOpenOn("click")) {
      this.emitNodeOpen(node, event, "click");
    }
  }

  selectNode(node, event) {
    if (!this.isSelectedControlled) {
      this.selectedNodeId = node?.id || null;
    }
    const payload = this.createEventPayload("node:select", node, event);
    this.onNodeSelect?.(node, event);
    this.events.onNodeSelect?.(payload);
  }

  updateHoverNode(node, event) {
    const previousNode = this.getHoveredNode();
    if (!this.isHoveredControlled) {
      this.state.hoverNode = node;
      this.hoveredNodeId = node?.id || null;
    }
    this.canvas.classList.toggle("has-node-hover", Boolean(node));
    if (previousNode !== node) {
      const payload = this.createEventPayload("node:hover", node, event);
      this.onNodeHover?.(node, event);
      this.events.onNodeHover?.(payload);
    }
  }

  findNodeAt(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    let best = null;
    let bestDistance = Infinity;
    const appearance = this.resolveAppearance();
    const degreeByNode = this.getNodeDegreeMap();

    for (const node of this.model.nodes) {
      const pos = this.worldToScreen(node);
      const dx = pos.x - x;
      const dy = pos.y - y;
      const distance = Math.hypot(dx, dy);
      const hitRadius = Math.max(
        appearance.hitTest.minRadius,
        this.getNodeRadius(node, appearance.display, appearance, degreeByNode) * this.state.scale + appearance.hitTest.padding
      );
      if (distance < hitRadius && distance < bestDistance) {
        best = node;
        bestDistance = distance;
      }
    }

    return best;
  }

  clientToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return this.screenToWorld(clientX - rect.left, clientY - rect.top);
  }

  worldToScreen(point) {
    const { width, height, panX, panY, scale } = this.state;
    return {
      x: width / 2 + panX + point.x * scale,
      y: height / 2 + panY + point.y * scale
    };
  }

  screenToWorld(x, y) {
    const { width, height, panX, panY, scale } = this.state;
    return {
      x: (x - width / 2 - panX) / scale,
      y: (y - height / 2 - panY) / scale
    };
  }

  getHighlightContext() {
    const activeNode = this.getActiveNode();
    const query = this.getQuery();

    if (activeNode) {
      const activeNodeId = activeNode.id;
      const customNodes = this.getHighlightedNodes?.(activeNodeId, { model: this.model, node: activeNode });
      const customLinks = this.getHighlightedLinks?.(activeNodeId, { model: this.model, node: activeNode });
      const nodes = normalizeNodeSet(customNodes, this.model) || this.getDefaultNeighborhoodNodes(activeNode);
      const links = normalizeLinkSet(customLinks, this.model) || this.getDefaultNeighborhoodLinks(activeNode);
      nodes.add(activeNode);
      nodes.add(activeNode.id);
      return { nodes, links, shouldDim: true };
    }

    const nodes = query ? this.model.highlightedNodes(query) : new Set();
    const links = new Set();
    for (const link of this.model.links) {
      if (nodes.has(link.source) && nodes.has(link.target)) {
        links.add(link);
        links.add(link.id);
      }
    }

    return {
      nodes,
      links,
      shouldDim: Boolean(query),
      queryActive: Boolean(query)
    };
  }

  getDefaultNeighborhoodNodes(activeNode) {
    const nodes = new Set([activeNode, activeNode.id]);
    for (const link of this.model.links) {
      if (link.source === activeNode) {
        nodes.add(link.target);
        nodes.add(link.target.id);
      }
      if (link.target === activeNode) {
        nodes.add(link.source);
        nodes.add(link.source.id);
      }
    }
    return nodes;
  }

  getDefaultNeighborhoodLinks(activeNode) {
    const links = new Set();
    for (const link of this.model.links) {
      if (link.source === activeNode || link.target === activeNode) {
        links.add(link);
        links.add(link.id);
      }
    }
    return links;
  }

  getActiveNode() {
    return this.state.draggedNode || this.getSelectedNode() || this.getHoveredNode();
  }

  getSelectedNode() {
    return this.selectedNodeId ? this.model.nodeById.get(this.selectedNodeId) || null : null;
  }

  getHoveredNode() {
    if (this.isHoveredControlled) {
      return this.hoveredNodeId ? this.model.nodeById.get(this.hoveredNodeId) || null : null;
    }
    return this.state.hoverNode;
  }

  getNodeFill(node, flags, theme) {
    if (flags.dimmed) return theme.node.dimmedFill;
    if (flags.isSelected) return theme.node.selectedFill;
    if (flags.isHovered) return theme.node.hoverFill;
    return node.color || theme.node.fill;
  }

  getNodeStroke(node, flags, theme) {
    if (flags.dimmed) return theme.node.dimmedStroke;
    if (flags.isSelected) return theme.node.selectedStroke;
    if (flags.isHovered) return theme.node.hoverStroke;
    return node.stroke || theme.node.stroke;
  }

  getLinkColor(link, active, dimmed, theme) {
    if (dimmed) return theme.link.dimmedColor;
    if (active) return theme.link.activeColor;
    return theme.link.byKind?.[link.kind] || theme.link.defaultColor;
  }

  getNodeStyle(node, flags, appearance) {
    const style = {
      accentColor: getNodeAccentColor(node, flags, appearance.theme),
      accentWidth: appearance.theme.node.accentRingWidth,
      fill: this.getNodeFill(node, flags, appearance.theme),
      stroke: this.getNodeStroke(node, flags, appearance.theme),
      strokeWidth: flags.isHovered || flags.isSelected ? 2 : 1
    };
    return {
      ...style,
      ...(appearance.hooks.getNodeStyle?.({ appearance, flags, node, renderer: this, style }) || {})
    };
  }

  getLinkStyle(link, flags, appearance) {
    const style = {
      color: this.getLinkColor(link, flags.active, flags.dimmed, appearance.theme),
      width: appearance.display.linkThickness
    };
    return {
      ...style,
      ...(appearance.hooks.getLinkStyle?.({ appearance, flags, link, renderer: this, style }) || {})
    };
  }

  getLabelStyle(node, flags, appearance) {
    const labelOptions = this.getResolvedLabelOptions(appearance);
    const color = flags.dimmed ? appearance.theme.label.dimmedColor : withAlpha(appearance.theme.label.color, flags.alpha);
    const style = {
      color,
      font: labelOptions.font
    };
    return {
      ...style,
      ...(appearance.hooks.getLabelStyle?.({ appearance, flags, node, renderer: this, style }) || {})
    };
  }

  resolveAppearance() {
    const base = normalizeAppearance(defaultGraphAppearance);
    const legacy = {
      display: this.getDisplayOptions?.() || {},
      theme: this.getTheme?.() || {}
    };
    return normalizeAppearance(mergeTheme(mergeTheme(base, legacy), this.getAppearance?.() || {}));
  }

  getResolvedAppearance() {
    const appearance = this.resolveAppearance();
    return {
      label: this.getResolvedLabelOptions(appearance),
      nodeSize: this.getResolvedNodeSizeOptions(appearance),
      viewport: {
        maxScale: appearance.viewport.maxScale,
        minScale: appearance.viewport.minScale,
        scale: this.state.scale
      }
    };
  }

  getResolvedLabelOptions(appearance = this.resolveAppearance()) {
    const policy = appearance.labelPolicy || {};
    const font = resolveCanvasFont(appearance.theme.label);
    return {
      density: clampNumber(policy.density ?? appearance.theme.label.density, 0, 1, 1),
      font,
      fontSize: Math.max(8, Number(appearance.theme.label.fontSize) || 12),
      mode: policy.mode || "density",
      priority: policy.priority || "degree",
      textFade: Number.isFinite(policy.textFade) ? policy.textFade : appearance.display.textFade
    };
  }

  getResolvedNodeSizeOptions(appearance = this.resolveAppearance()) {
    const policy = appearance.nodeSizePolicy || {};
    const minScale = Math.max(0.1, Number(policy.minScale) || 1);
    const maxScale = Math.max(minScale, Number(policy.maxScale) || minScale);
    return {
      maxScale,
      minScale,
      mode: policy.mode || "metric",
      priority: policy.priority || "degree",
      strength: Math.max(0, Number(policy.strength) || 0)
    };
  }

  getNodeRadius(
    node,
    displayOptions = this.resolveAppearance().display,
    appearance = this.resolveAppearance(),
    degreeByNode = this.getNodeDegreeMap()
  ) {
    const radius = Number.isFinite(node.radius) ? node.radius : 8;
    return Math.max(1, radius * displayOptions.nodeSize * this.getNodeSizeMultiplier(node, appearance, degreeByNode));
  }

  getNodeSizeMultiplier(node, appearance = this.resolveAppearance(), degreeByNode = this.getNodeDegreeMap()) {
    const options = this.getResolvedNodeSizeOptions(appearance);
    if (options.mode === "fixed") return 1;

    const metric = getNodeSizeMetric(node, options.priority, degreeByNode);
    if (metric <= 0 || options.strength <= 0) return options.minScale;
    const multiplier = options.minScale + Math.log1p(metric) * options.strength;
    return clampNumber(multiplier, options.minScale, options.maxScale, options.minScale);
  }

  getNormalLabelCoverage(highlight, selectedNode, hoveredNode, labelOptions, degreeByNode = this.getNodeDegreeMap()) {
    const coverage = new Map();
    if (labelOptions.mode !== "density") return coverage;
    if (labelOptions.density <= 0 || this.state.scale < labelOptions.textFade) return coverage;

    const candidates = [];
    for (const node of this.model.nodes) {
      const pos = this.worldToScreen(node);
      if (!isLabelInViewport(pos, this.state)) continue;
      const isActiveLabel = node === selectedNode || node === hoveredNode || highlight.nodes.has(node) || highlight.nodes.has(node.id);
      if (!isActiveLabel) candidates.push(node);
    }

    return buildLinearLabelCoverage(candidates, labelOptions, degreeByNode);
  }

  getNodeLabelCoverage({ isActiveLabel, node, scale }, labelOptions, normalLabelCoverage) {
    if (labelOptions.mode === "none") return 0;
    if (isActiveLabel) return 1;
    if (labelOptions.mode === "all") return 1;
    if (scale < labelOptions.textFade) return 0;
    if (labelOptions.mode === "active-neighborhood") return 0;
    return normalLabelCoverage.get(node) || 0;
  }

  resolveTheme() {
    return this.resolveAppearance().theme;
  }

  getNodeDegreeMap() {
    const degree = new Map();
    for (const node of this.model.nodes) degree.set(node, 0);
    for (const link of this.model.links) {
      if (link.source) degree.set(link.source, (degree.get(link.source) || 0) + 1);
      if (link.target && link.target !== link.source) degree.set(link.target, (degree.get(link.target) || 0) + 1);
    }
    return degree;
  }

  usesStructuredClickSemantics() {
    return Boolean(this.onNodeClick || this.onNodeDoubleClick || this.onNodeSelect);
  }

  shouldSelectOnClick() {
    if (this.interaction.selectOnClick !== undefined) return this.interaction.selectOnClick;
    return Boolean(this.onNodeSelect || this.events.onNodeSelect);
  }

  shouldOpenOn(trigger) {
    const openOn = this.interaction.openOn;
    if (!this.onNodeOpen && !this.events.onNodeOpen) return false;
    if (openOn === "none") return false;
    if (openOn === "legacy") return trigger === "click" && !this.usesStructuredClickSemantics();
    return openOn === trigger;
  }

  emitNodeDrag(node, point, event, alpha) {
    const payload = this.createEventPayload("node:drag", node, event, { alpha, point });
    this.onNodeDrag?.(node, point, alpha);
    this.events.onNodeDrag?.(payload);
  }

  emitNodeRelease(node, event) {
    const payload = this.createEventPayload("node:release", node, event);
    this.onNodeRelease?.(node);
    this.events.onNodeRelease?.(payload);
  }

  emitNodeOpen(node, event, trigger) {
    const payload = this.createEventPayload("node:open", node, event, { trigger });
    this.onNodeOpen?.(node, event);
    this.events.onNodeOpen?.(payload);
  }

  createEventPayload(type, node, sourceEvent, extra = {}) {
    const point = sourceEvent ? this.clientToWorld(sourceEvent.clientX, sourceEvent.clientY) : null;
    return {
      ...extra,
      model: this.model,
      node,
      nodeId: node?.id || null,
      renderer: this,
      sourceEvent,
      type,
      viewport: {
        panX: this.state.panX,
        panY: this.state.panY,
        scale: this.state.scale
      },
      worldPoint: point
    };
  }
}

function normalizeAppearance(appearance = {}) {
  const display = { ...defaultDisplayOptions, ...(appearance.display || {}) };
  return {
    ...appearance,
    display,
    hitTest: { ...defaultGraphAppearance.hitTest, ...(appearance.hitTest || {}) },
    hooks: { ...defaultGraphAppearance.hooks, ...(appearance.hooks || {}) },
    labelPolicy: {
      ...defaultGraphAppearance.labelPolicy,
      textFade: display.textFade,
      ...(appearance.labelPolicy || {})
    },
    nodeSizePolicy: { ...defaultGraphAppearance.nodeSizePolicy, ...(appearance.nodeSizePolicy || {}) },
    theme: mergeTheme(defaultRendererTheme, appearance.theme || {}),
    viewport: { ...defaultGraphAppearance.viewport, ...(appearance.viewport || {}) }
  };
}

function normalizeInteractionOptions(interaction = {}, context = {}) {
  const normalized = {
    ...defaultInteractionOptions,
    ...interaction
  };
  if (normalized.selectOnClick === undefined && context.hasSelectHandler) {
    normalized.selectOnClick = true;
  }
  return normalized;
}

function normalizeNodeSet(value, model) {
  if (!value) return null;
  const set = new Set();
  for (const item of value) {
    if (!item) continue;
    if (typeof item === "string") {
      set.add(item);
      const node = model.nodeById.get(item);
      if (node) set.add(node);
    } else {
      set.add(item);
      if (item.id) set.add(item.id);
    }
  }
  return set;
}

function normalizeLinkSet(value, model) {
  if (!value) return null;
  const linkById = model.linkById || new Map(model.links.map((link) => [link.id, link]));
  const set = new Set();
  for (const item of value) {
    if (!item) continue;
    if (typeof item === "string") {
      set.add(item);
      const link = linkById.get(item);
      if (link) set.add(link);
    } else {
      set.add(item);
      if (item.id) set.add(item.id);
    }
  }
  return set;
}

function getNodeAccentColor(node, flags, theme) {
  if (flags.isSelected) return theme.node.selectedStroke || theme.node.accentRingColor;
  if (flags.isHovered) return theme.node.hoverStroke || theme.node.accentRingColor;
  return node.accentColor || node.data?.accentColor || theme.node.accentByStatus?.[node.status] || null;
}

function buildLinearLabelCoverage(nodes, labelOptions, degreeByNode) {
  const coverage = new Map();
  const density = labelOptions.density;
  if (density <= 0 || nodes.length === 0) return coverage;
  if (density >= 1) {
    for (const node of nodes) coverage.set(node, 1);
    return coverage;
  }

  const budget = density * nodes.length;
  const fullCount = Math.floor(budget);
  const partialCoverage = budget - fullCount;
  const sorted = sortLabelCandidates(nodes, labelOptions.priority, degreeByNode);
  for (let index = 0; index < fullCount; index += 1) {
    coverage.set(sorted[index], 1);
  }
  if (partialCoverage > 0 && fullCount < sorted.length) {
    coverage.set(sorted[fullCount], partialCoverage);
  }
  return coverage;
}

function sortLabelCandidates(nodes, priority, degreeByNode) {
  const comparator = getLabelPriorityComparator(priority, degreeByNode);
  return [...nodes].sort(comparator);
}

function getLabelPriorityComparator(priority, degreeByNode) {
  if (typeof priority === "function") {
    return (left, right) => {
      const leftScore = Number(priority(left, { degree: degreeByNode.get(left) || 0 })) || 0;
      const rightScore = Number(priority(right, { degree: degreeByNode.get(right) || 0 })) || 0;
      return rightScore - leftScore || compareLabelRank(left, right);
    };
  }
  if (priority === "stable") return compareLabelRank;
  return (left, right) => {
    const degreeDelta = (degreeByNode.get(right) || 0) - (degreeByNode.get(left) || 0);
    return degreeDelta || compareLabelRank(left, right);
  };
}

function getNodeSizeMetric(node, priority, degreeByNode) {
  if (typeof priority === "function") {
    return Math.max(0, Number(priority(node, { degree: degreeByNode.get(node) || 0 })) || 0);
  }
  if (priority === "none") return 0;
  return degreeByNode.get(node) || 0;
}

function compareLabelRank(left, right) {
  const rankDelta = stableLabelRank(left) - stableLabelRank(right);
  if (rankDelta !== 0) return rankDelta;
  return String(left?.id || left?.label || "").localeCompare(String(right?.id || right?.label || ""));
}

function isLabelInViewport(pos, state) {
  return pos.x >= -80 && pos.y >= -40 && pos.x <= state.width + 80 && pos.y <= state.height + 40;
}

function stableLabelRank(node) {
  const key = String(node?.id || node?.label || "");
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function resolveCanvasFont(labelTheme = {}) {
  const directFont = typeof labelTheme.font === "string" ? labelTheme.font.trim() : "";
  if (isCanvasFontSafe(directFont)) return directFont;

  const fontSize = Math.max(8, Number(labelTheme.fontSize) || 12);
  const fontStyle = sanitizeFontStyle(labelTheme.fontStyle);
  const fontWeight = sanitizeFontWeight(labelTheme.fontWeight);
  const fontFamily = sanitizeFontFamily(labelTheme.fontFamily);
  return `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`.trim();
}

function sanitizeFontFamily(fontFamily) {
  const value = String(fontFamily || defaultCanvasFontFamily).trim();
  if (!value || value.includes("var(") || /[{};]/.test(value)) return defaultCanvasFontFamily;
  return value;
}

function sanitizeFontStyle(fontStyle) {
  const value = String(fontStyle || "normal").trim().toLowerCase();
  return ["italic", "normal", "oblique"].includes(value) ? value : "normal";
}

function sanitizeFontWeight(fontWeight) {
  const value = String(fontWeight ?? "400").trim();
  return /^(normal|bold|lighter|bolder|[1-9]00)$/.test(value) ? value : "400";
}

function isCanvasFontSafe(font) {
  if (!font || font.includes("var(") || /[{};]/.test(font)) return false;
  return /\b\d+(\.\d+)?px\b/.test(font);
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(min, Math.min(max, numeric));
}

function withAlpha(color, alpha) {
  if (!color.startsWith("rgb(")) return color;
  return color.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
}

function mergeTheme(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && base[key] && typeof base[key] === "object") {
      result[key] = mergeTheme(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
