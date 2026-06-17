---
name: personal-gallery-planner
description: Use when planning, designing, or implementing the JieteXue personal site gallery, including image storage strategy, gallery metadata JSON, static GitHub Pages rendering, masonry layouts, object storage, image variants, and long-term maintainability.
---

# Personal Gallery Planner

Use this skill when working on the JieteXue personal site gallery.

## Project Context

The site is a static GitHub Pages site generated from JSON data and templates.

Core constraints:

- Keep the site static.
- Prefer JSON-driven maintenance.
- Do not introduce React, Vite, a CMS, or a database unless explicitly requested.
- Keep GitHub dark / personal knowledge site visual style.
- The gallery may eventually contain thousands of images.
- Images may include life photos, article illustrations, works, screenshots, simulations, and tool outputs.

## Storage Policy

Do not put thousands of original images directly into the GitHub Pages repo.

Recommended long-term model:

- Store metadata in the repo.
- Store image assets in object storage or a CDN.
- Use three variants per image:
  - `thumb`: small WebP/AVIF for masonry grid.
  - `display`: compressed large view for site browsing.
  - `original`: optional full source image.
- Strip sensitive EXIF from public life photos before upload.

Short-term local fallback:

- `assets/gallery/thumbs/`
- `assets/gallery/display/`
- Keep originals outside the public repo unless explicitly approved.

## Data Model

Prefer `content/gallery.json`:

- `albums`: album definitions.
- `items`: image records.

Each item should include:

- `id`
- `title`
- `albumId`
- `description`
- `tags`
- `variants.thumb`
- `variants.display`
- optional `variants.original`
- `width`
- `height`
- optional `date`
- optional `source`

Do not guess dates.

Validate:

- unique album IDs
- unique item IDs
- item `albumId` exists
- variants have non-empty URLs
- width/height are positive numbers
- tags are non-empty strings

## Layout Guidance

Default gallery page:

- independent `gallery.html`
- top intro and album chips
- masonry/waterfall body
- card metadata kept small
- lazy-loaded images
- no heavy decorative UI

Start with CSS columns unless there is a strong reason to use JS masonry.

Use:

```html
<img loading="lazy" decoding="async">
```

For click behavior:

- default: link to `display`
- optional: provide `original` link when available

## Template Selection

When searching for gallery templates, prefer:

- plain HTML/CSS/JS
- masonry or waterfall layout
- lazy loading support
- lightbox support
- easy JSON rendering
- minimal dependencies
- dark theme compatibility

Avoid templates that require:

- a backend
- a CMS
- build tooling
- client-side framework lock-in
- manually writing every image card

## Implementation Workflow

1. Inspect current generator and templates.
2. Add or update gallery JSON data.
3. Add validation before rendering.
4. Add gallery render module.
5. Add gallery page template.
6. Update shared layout nav and homepage route card.
7. Add CSS for masonry and responsive behavior.
8. Run build and static checks.
9. Verify generated `gallery.html`.

## Safety Notes

- Never commit large original photo collections without explicit approval.
- Do not preserve EXIF for public life photos unless explicitly requested.
- Prefer stable CDN/object-storage URLs for long-term galleries.
