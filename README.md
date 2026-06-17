# JieteXue.github.io

Personal site and knowledge graph for JieteXue.

GitHub Pages publishes this repository from the `main` branch and repository root, so the generated HTML files live at the top level.

## File Structure

- `index.html`, `zhihu.html`, `github.html`: generated pages served by GitHub Pages.
- `assets/css/`: shared browser styles.
- `assets/js/`: browser scripts for interactive pages.
- `assets/vendor/`: vendored browser-side dependencies, including the static knowledge graph engine.
- `content/`: structured source data for profile content, Zhihu articles, article categories, article series, GitHub projects, and the home page graph.
- `src/templates/`: page and layout templates used by the generator.
- `src/site/`: static site generation, rendering helpers, and data validators.
- `planning/`: implementation notes and future feature plans.
- `skills/`: local Codex skill drafts related to the site.
- `.github/workflows/site.yml`: validation and generated-page refresh workflow.

## Maintenance

- Run `node src/site/build-site.mjs` from the repository root after changing `content/`, `src/templates/`, or rendering scripts.
- Edit home page personal sections in `content/profile.json`.
- Edit the home page draggable/zoomable map in `content/site-map.json`.
- Add Zhihu article records in `content/zhihu-articles.json`.
- Add or reorganize article categories in `content/zhihu-categories.json`.
- Add reading paths in `content/zhihu-series.json`.
- Do not guess article dates. Omit `date` unless the date is known.

## Generated Pages

The generated pages are committed intentionally because this repository is a simple GitHub Pages site without a separate build artifact branch.

The `Site` workflow reruns the generator on relevant pushes and commits refreshed generated pages only when output changes.
