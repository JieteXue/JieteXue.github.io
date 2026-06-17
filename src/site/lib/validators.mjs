import { visitCategories } from "./category-tree.mjs";

export function validateCategoryTree(items, path) {
  if (!Array.isArray(items)) {
    throw new Error(`${path} must contain an array.`);
  }

  const ids = new Map();
  visitCategories(items, path, (item, label) => {
    requireId(item, "id", label);
    requireString(item, "label", label);
    requireString(item, "description", label);

    if (item.order !== undefined && !isFiniteNumber(item.order)) {
      throw new Error(`${label}.order must be omitted or a number.`);
    }

    if (item.aliases !== undefined) {
      requireArray(item, "aliases", label);
    }

    if (item.defaultExpanded !== undefined && typeof item.defaultExpanded !== "boolean") {
      throw new Error(`${label}.defaultExpanded must be omitted or a boolean.`);
    }

    if (item.display !== undefined) {
      validateDisplay(item.display, `${label}.display`);
    }

    if (item.children !== undefined && !Array.isArray(item.children)) {
      throw new Error(`${label}.children must be an array when present.`);
    }

    if (ids.has(item.id)) {
      throw new Error(`${label}.id duplicates ${ids.get(item.id).source}.`);
    }

    ids.set(item.id, { ...item, source: label });
  });

  return ids;
}

export function validateSeries(items, categoryMap, seriesPath) {
  if (!Array.isArray(items)) {
    throw new Error(`${seriesPath} must contain an array.`);
  }

  const ids = new Map();
  items.forEach((item, index) => {
    const label = `${seriesPath}[${index}]`;
    requireId(item, "id", label);
    requireString(item, "label", label);
    requireString(item, "description", label);
    requireArray(item, "categoryIds", label);
    requireArray(item, "tags", label);

    if (item.order !== undefined && !isFiniteNumber(item.order)) {
      throw new Error(`${label}.order must be omitted or a number.`);
    }

    if (item.status !== undefined) {
      requireEnum(item, "status", ["active", "paused", "archived"], label);
    }

    item.categoryIds.forEach((categoryId) => {
      if (!categoryMap.has(categoryId)) {
        throw new Error(`${label}.categoryIds contains unknown category "${categoryId}".`);
      }
    });

    if (ids.has(item.id)) {
      throw new Error(`${label}.id duplicates ${ids.get(item.id).source}.`);
    }

    ids.set(item.id, { ...item, source: label });
  });

  return ids;
}

export function validateArticles(items, categoryMap, seriesMap, articlePath) {
  if (!Array.isArray(items)) {
    throw new Error(`${articlePath} must contain an array.`);
  }

  items.forEach((item, index) => {
    requireString(item, "title", `${articlePath}[${index}]`);
    requireString(item, "url", `${articlePath}[${index}]`);
    requireString(item, "summary", `${articlePath}[${index}]`);
    requireArray(item, "tags", `${articlePath}[${index}]`);
    requireArray(item, "categoryIds", `${articlePath}[${index}]`);

    if (item.date !== undefined && (typeof item.date !== "string" || item.date.trim() === "")) {
      throw new Error(`${articlePath}[${index}].date must be omitted or a non-empty string.`);
    }

    if (item.featured !== undefined && typeof item.featured !== "boolean") {
      throw new Error(`${articlePath}[${index}].featured must be omitted or a boolean.`);
    }

    if (item.seriesId !== undefined && !seriesMap.has(item.seriesId)) {
      throw new Error(`${articlePath}[${index}].seriesId contains unknown series "${item.seriesId}".`);
    }

    if (item.status !== undefined) {
      requireEnum(item, "status", ["draft", "published", "archived"], `${articlePath}[${index}]`);
    }

    if (item.source !== undefined) {
      requireEnum(item, "source", ["zhihu", "local", "external"], `${articlePath}[${index}]`);
    }

    if (!isZhihuUrl(item.url)) {
      throw new Error(`${articlePath}[${index}].url must be a Zhihu or Zhuanlan URL.`);
    }

    item.categoryIds.forEach((categoryId) => {
      if (!categoryMap.has(categoryId)) {
        throw new Error(`${articlePath}[${index}].categoryIds contains unknown category "${categoryId}".`);
      }
    });
  });
}

export function validateProjects(items, projectPath) {
  if (!Array.isArray(items)) {
    throw new Error(`${projectPath} must contain an array.`);
  }

  items.forEach((item, index) => {
    requireString(item, "name", `${projectPath}[${index}]`);
    requireString(item, "url", `${projectPath}[${index}]`);
    requireString(item, "description", `${projectPath}[${index}]`);
    requireString(item, "status", `${projectPath}[${index}]`);
    requireArray(item, "stack", `${projectPath}[${index}]`);

    if (!item.url.startsWith("https://github.com/")) {
      throw new Error(`${projectPath}[${index}].url must be a GitHub URL.`);
    }
  });
}

export function validateSiteMap(item, siteMapPath) {
  const label = siteMapPath;
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw new Error(`${siteMapPath} must contain an object.`);
  }

  requireArrayObject(item, "nodes", label);
  requireArrayObject(item, "edges", label);

  const nodeIds = new Set();
  item.nodes.forEach((node, index) => {
    const nodeLabel = `${siteMapPath}.nodes[${index}]`;
    requireId(node, "id", nodeLabel);
    requireString(node, "label", nodeLabel);
    requireString(node, "type", nodeLabel);
    requireString(node, "description", nodeLabel);
    requireString(node, "href", nodeLabel);

    if (!isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
      throw new Error(`${nodeLabel}.x and ${nodeLabel}.y must be numbers.`);
    }

    if (nodeIds.has(node.id)) {
      throw new Error(`${nodeLabel}.id duplicates another site map node.`);
    }

    nodeIds.add(node.id);
  });

  item.edges.forEach((edge, index) => {
    const edgeLabel = `${siteMapPath}.edges[${index}]`;
    requireString(edge, "from", edgeLabel);
    requireString(edge, "to", edgeLabel);

    if (!nodeIds.has(edge.from)) {
      throw new Error(`${edgeLabel}.from contains unknown node "${edge.from}".`);
    }

    if (!nodeIds.has(edge.to)) {
      throw new Error(`${edgeLabel}.to contains unknown node "${edge.to}".`);
    }
  });
}

export function validateProfile(item, profilePath) {
  const label = profilePath;
  if (typeof item !== "object" || item === null || Array.isArray(item)) {
    throw new Error(`${profilePath} must contain an object.`);
  }

  requireString(item, "name", label);
  requireString(item, "tagline", label);
  requireString(item, "intro", label);
  requireArrayObject(item, "primaryLinks", label);
  requireArrayObject(item, "blocks", label);

  if (item.introDetails !== undefined) {
    requireArrayObject(item, "introDetails", label);
    item.introDetails.forEach((detail, index) => {
      const detailLabel = `${profilePath}.introDetails[${index}]`;
      requireString(detail, "label", detailLabel);
      requireString(detail, "value", detailLabel);
    });
  }

  if (item.timeline !== undefined) {
    requireArrayObject(item, "timeline", label);
    item.timeline.forEach((entry, index) => {
      const entryLabel = `${profilePath}.timeline[${index}]`;
      requireString(entry, "period", entryLabel);
      requireString(entry, "title", entryLabel);
      requireString(entry, "description", entryLabel);
    });
  }

  item.primaryLinks.forEach((link, index) => {
    const linkLabel = `${profilePath}.primaryLinks[${index}]`;
    requireString(link, "label", linkLabel);
    requireString(link, "href", linkLabel);

    if (link.style !== undefined) {
      requireEnum(link, "style", ["primary"], linkLabel);
    }
  });

  item.blocks.forEach((block, index) => {
    const blockLabel = `${profilePath}.blocks[${index}]`;
    requireId(block, "id", blockLabel);
    requireString(block, "eyebrow", blockLabel);
    requireString(block, "title", blockLabel);
    requireString(block, "body", blockLabel);
    requireArray(block, "items", blockLabel);

    if (block.links !== undefined) {
      requireArrayObject(block, "links", blockLabel);
      block.links.forEach((link, linkIndex) => {
        const linkLabel = `${blockLabel}.links[${linkIndex}]`;
        requireString(link, "label", linkLabel);
        requireString(link, "href", linkLabel);
      });
    }
  });
}

function requireString(item, key, label) {
  if (typeof item?.[key] !== "string" || item[key].trim() === "") {
    throw new Error(`${label}.${key} must be a non-empty string.`);
  }
}

function requireId(item, key, label) {
  requireString(item, key, label);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item[key])) {
    throw new Error(`${label}.${key} must be kebab-case lowercase text.`);
  }
}

function requireArray(item, key, label) {
  if (!Array.isArray(item?.[key]) || item[key].some((value) => typeof value !== "string" || value.trim() === "")) {
    throw new Error(`${label}.${key} must be an array of non-empty strings.`);
  }
}

function requireArrayObject(item, key, label) {
  if (!Array.isArray(item?.[key]) || item[key].some((value) => typeof value !== "object" || value === null || Array.isArray(value))) {
    throw new Error(`${label}.${key} must be an array of objects.`);
  }
}

function requireEnum(item, key, values, label) {
  if (!values.includes(item?.[key])) {
    throw new Error(`${label}.${key} must be one of: ${values.join(", ")}.`);
  }
}

function validateDisplay(display, label) {
  if (typeof display !== "object" || display === null || Array.isArray(display)) {
    throw new Error(`${label} must be an object when present.`);
  }

  if (display.tone !== undefined) {
    requireString(display, "tone", label);
  }

  if (display.showInNav !== undefined && typeof display.showInNav !== "boolean") {
    throw new Error(`${label}.showInNav must be omitted or a boolean.`);
  }
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isZhihuUrl(url) {
  return url.startsWith("https://www.zhihu.com/") || url.startsWith("https://zhuanlan.zhihu.com/");
}
