# Personal Gallery Plan

## Summary

The gallery should become an independent `gallery.html` page for life photos, article illustrations, works, screenshots, simulations, and tool outputs.

Because the long-term gallery may contain thousands of images and preserve both compressed versions and originals, the repository should not store every original image directly. The repository should store page templates, rendering code, and JSON metadata; image assets should later live in object storage or a CDN.

## Storage Model

Recommended long-term storage:

- `thumb`: small WebP/AVIF image for masonry cards, around 400-700px wide.
- `display`: compressed large image for site viewing, around 1600-2400px wide.
- `original`: optional original image stored outside the GitHub Pages repository.

Recommended storage providers to compare later:

- Cloudflare R2
- S3-compatible object storage
- UpYun
- Qiniu Cloud
- Backblaze B2

Safety default:

- Strip sensitive EXIF from public life photos before upload.
- Do not commit large original photo collections to this repository without an explicit decision.

Short-term local fallback:

- `assets/gallery/thumbs/`
- `assets/gallery/display/`
- Keep originals outside the public repository unless explicitly approved.

## Data Model

Future file: `content/gallery.json`.

```json
{
  "albums": [
    {
      "id": "life",
      "label": "生活",
      "description": "日常照片和随手记录。"
    },
    {
      "id": "articles",
      "label": "文章配图",
      "description": "知乎文章、推导和说明图。"
    },
    {
      "id": "works",
      "label": "作品",
      "description": "绘图、模拟、工具输出和视觉成果。"
    }
  ],
  "items": [
    {
      "id": "example-image",
      "title": "示例图片",
      "albumId": "works",
      "description": "图片说明。",
      "tags": ["TikZ", "Tool"],
      "variants": {
        "thumb": "https://cdn.example.com/gallery/thumbs/example.webp",
        "display": "https://cdn.example.com/gallery/display/example.webp",
        "original": "https://cdn.example.com/gallery/originals/example.png"
      },
      "width": 1600,
      "height": 1000,
      "source": "local"
    }
  ]
}
```

Notes:

- `date` is optional. Do not guess it.
- `albumId` must reference an album.
- `variants.thumb` and `variants.display` are required.
- `variants.original` is optional.
- `width` and `height` should describe the display image dimensions.

## Layout Recommendation

Use an independent `gallery.html` page.

Recommended first layout:

- Header intro.
- Album chips.
- CSS-column masonry / waterfall grid.
- Small metadata on each image card.
- Lazy-loaded images.
- Click opens the `display` image.
- Provide an `original` link only when available.

Use:

```html
<img loading="lazy" decoding="async">
```

For thousands of images:

- Do not render all images on one page forever.
- Split by album or by JSON file when the data grows.
- Keep the first implementation static and dependency-free.

## Template Search Criteria

When searching for a better gallery template later, prefer:

- plain HTML/CSS/JS
- masonry or waterfall layout
- lazy loading support
- lightbox support
- easy JSON rendering
- minimal dependencies
- dark theme compatibility
- no backend, CMS, database, or framework lock-in

Avoid templates that require manually writing every image card.

## Future Implementation Steps

1. Add `content/gallery.json`.
2. Add gallery validation.
3. Add `src/site/lib/render-gallery.mjs`.
4. Add `src/templates/pages/gallery.mjs`.
5. Generate `gallery.html`.
6. Update shared navigation and homepage route cards.
7. Add gallery CSS to `assets/css/site.css`.
8. Document storage, EXIF, and metadata maintenance in `README.md`.
9. Later, add an upload/optimization workflow for object storage.
