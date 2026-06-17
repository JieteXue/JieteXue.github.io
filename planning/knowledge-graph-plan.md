# Personal Knowledge Graph Integration Plan

## Summary

The home page should eventually use the user's own Obsidian-like force graph project instead of maintaining a custom graph implementation inside this repository.

The current `vis-network` map is a temporary, low-cost integration for the main entrance. If the existing force graph project already supports drag, zoom, node selection, and relationship rendering, it should become the preferred graph engine for the personal site.

## Goal

Build the home page around a personal knowledge graph that can connect:

- site entrance nodes
- Zhihu articles
- article categories
- series / reading paths
- tags / topics
- GitHub projects
- future gallery albums and images

The graph should feel closer to a personal knowledge system than a generic dashboard widget.

## Preferred Direction

Reuse the existing Obsidian-like force graph project.

Do not keep hand-rolling graph physics, node dragging, zooming, canvas behavior, or selection logic in this repository if the dedicated project already solves those problems.

This site should provide:

- structured JSON data
- page layout
- visual theme integration
- small adapter code when needed

The force graph project should provide:

- rendering engine
- interaction behavior
- graph physics
- node dragging and panning
- zoom controls
- selection / focus behavior

## Candidate Integration Modes

### 1. Static Core Copy

Use this if the force graph project is plain HTML/CSS/JavaScript.

Possible structure:

```text
assets/vendor/knowledge-graph/
  graph.css
  graph.js
```

The home page would load the graph script directly and pass JSON through an inline `<script type="application/json">` block.

This is the simplest GitHub Pages-friendly option.

### 2. Built Bundle

Use this if the force graph project is React, Vite, or another bundled frontend.

Keep the force graph project separate, build it, and copy only the static output into this repository:

```text
assets/vendor/knowledge-graph/
  graph.bundle.js
  graph.css
```

Avoid moving the full frontend toolchain into this personal site unless there is a strong reason.

### 3. Adapter Layer

Use this if the force graph project already expects a different data shape.

Keep this repository's data model stable, then transform it during generation:

```text
content/knowledge-graph.json
src/site/lib/render-graph-data.mjs
assets/vendor/knowledge-graph/graph.js
```

The adapter should translate site records into the graph project's node and edge format.

### 4. Separate App Link

Use this if the force graph project is large, experimental, or has its own release cycle.

Host it as a separate GitHub Pages app or repository, then link to it from the home page. This keeps the personal site stable while allowing the graph project to evolve independently.

## Data Model Direction

The current `content/site-map.json` can remain a small entrance map for now.

Later, introduce a broader graph source:

```text
content/knowledge-graph.json
```

Possible shape:

```json
{
  "nodes": [
    {
      "id": "zhihu",
      "label": "知乎文章库",
      "type": "route",
      "href": "./zhihu.html",
      "description": "按章节、系列和主题整理文章。"
    }
  ],
  "edges": [
    {
      "from": "home",
      "to": "zhihu",
      "type": "contains"
    }
  ]
}
```

The generator can later enrich this automatically from:

- `content/zhihu-articles.json`
- `content/zhihu-categories.json`
- `content/zhihu-series.json`
- `content/github-projects.json`
- future `content/gallery.json`

## Implementation Steps

1. Inspect the existing Obsidian-like force graph project.
2. Identify whether it is plain static JS, bundled frontend, or a larger app.
3. Decide whether to copy the static core, consume a built bundle, write an adapter, or link it as a separate app.
4. Define the graph data contract for this site.
5. Add validation for graph nodes and edges.
6. Replace or wrap the current `vis-network` entrance map.
7. Keep the home page layout dashboard-like, but let the graph become the primary exploratory element.
8. Verify drag, zoom, node click, focus, and mobile fallback behavior.

## Acceptance Criteria

- The graph can be maintained from JSON or generated data.
- The graph supports drag, zoom, panning, and node selection.
- Clicking or double-clicking important nodes can navigate to site pages.
- The home page remains a guide, not a full workbench.
- The integration does not force the personal site to adopt a heavy build system unless explicitly chosen later.
- GitHub Pages can still publish from `/docs`.

## Notes

- The current `vis-network` implementation is acceptable as a temporary bridge.
- Prefer reusing the user's graph project over adding another third-party graph library.
- Do not clone or vendor a large project into this repository until its structure and build output are inspected.
- If the graph project has a good visual system, adapt the site around it rather than forcing it into the current CSS.
