# Personal Knowledge Graph Plan

## Summary

The home page now uses the user's forked Obsidian-like force graph engine as a static GitHub Pages integration.

The first integration is complete:

- the site lives in `JieteXue/JieteXue.github.io`
- generated pages publish from the repository root
- source data lives in `content/`
- templates and generator code live in `src/`
- browser assets are split under `assets/css/`, `assets/js/`, and `assets/vendor/`
- the force graph engine is vendored in `assets/vendor/knowledge-graph/engine/`
- the home page consumes `content/site-map.json`

The next phase is expanding the graph from a small site entrance map into a broader personal knowledge graph.

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

## Current Direction

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

## Integration Status

### Completed: Static Core Copy

The force graph engine is dependency-free ESM and has been copied into:

```text
assets/vendor/knowledge-graph/engine/
```

The active adapter is:

```text
assets/js/site-map.js
```

The home page passes JSON through an inline `<script type="application/json" id="site-map-data">` block.

Current controls:

- default dynamic force simulation
- node drag
- canvas pan / zoom
- node hover / selection
- double-click open
- force controls for repel, distance, link strength, center strength, and node size

### Deferred: Built Bundle

Only use this if the upstream graph engine later becomes a bundled frontend:

```text
assets/vendor/knowledge-graph/
  graph.bundle.js
  graph.css
```

Avoid moving the full frontend toolchain into this personal site unless there is a strong reason.

### Next: Adapter Layer

Use this when the graph grows beyond `content/site-map.json`.

Keep this repository's data model stable, then transform it during generation:

```text
content/knowledge-graph.json
src/site/lib/render-graph-data.mjs
assets/vendor/knowledge-graph/graph.js
```

The adapter should translate site records into the graph project's node and edge format.

### Optional: Separate App Link

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

### Completed

1. Inspect the existing Obsidian-like force graph project.
2. Identify it as a dependency-free ESM/static engine.
3. Copy the static core into `assets/vendor/knowledge-graph/engine/`.
4. Replace the former temporary graph with the force graph engine.
5. Keep the home page layout dashboard-like while making the graph the primary exploratory element.
6. Add drag, zoom, selection, double-click navigation, dynamic physics, and force controls.
7. Migrate the site out of the profile repository into `JieteXue.github.io`.
8. Reorganize repository structure into `content/`, `src/`, and split browser assets.

### Next

1. Add validation for `content/site-map.json` node `href`, type, and edge references if it becomes more complex.
2. Introduce `content/knowledge-graph.json` for broader graph data.
3. Add `src/site/lib/render-graph-data.mjs` to enrich graph data from:
   - `content/zhihu-articles.json`
   - `content/zhihu-categories.json`
   - `content/zhihu-series.json`
   - `content/github-projects.json`
   - future `content/gallery.json`
4. Decide how many article/category/project nodes should appear on the home page by default.
5. Add a compact search/filter control only if the graph becomes too dense.
6. Verify mobile layout once graph data grows.

## Acceptance Criteria

- The graph can be maintained from JSON or generated data.
- The graph supports drag, zoom, panning, and node selection.
- Clicking or double-clicking important nodes can navigate to site pages.
- The home page remains a guide, not a full workbench.
- The integration does not force the personal site to adopt a heavy build system unless explicitly chosen later.
- GitHub Pages publishes from the repository root.

## Notes

- The previous temporary `vis-network` implementation has been removed.
- Prefer reusing the user's graph project over adding another third-party graph library.
- Do not vendor additional graph libraries unless the current fork cannot support a required behavior.
- If the graph project has a good visual system, adapt the site around it rather than forcing it into the current CSS.
