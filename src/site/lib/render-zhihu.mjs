import { flattenCategories, sortCategories } from "./category-tree.mjs";
import { escapeAttribute, escapeHtml } from "./html.mjs";

export function renderChapterNav(categories) {
  return renderChapterNavItems(categories, 0, { isFirst: true });
}

export function renderArticleSections(categories, items, seriesMap = new Map()) {
  return flattenCategories(categories).map((entry) => renderCategorySection(entry.category, items, entry.depth, seriesMap)).join("\n\n");
}

function renderChapterNavItems(categories, depth, state) {
  return sortCategories(categories)
    .map((category) => {
      const activeClass = state.isFirst ? " is-active" : "";
      state.isFirst = false;
      const current = `          <a class="chapter-link${activeClass}" style="--depth: ${depth}" href="#${escapeAttribute(category.id)}">${escapeHtml(category.label)}</a>`;
      const children = renderChapterNavItems(category.children ?? [], depth + 1, state);
      return children ? `${current}\n${children}` : current;
    })
    .join("\n");
}

function renderCategorySection(category, items, depth, seriesMap) {
  const categoryArticles = items.filter((item) => item.categoryIds.includes(category.id));
  const children = sortCategories(category.children ?? []);
  const headingTag = `h${Math.min(depth + 1, 6)}`;
  const eyebrow = getCategoryLevelLabel(depth);
  const emptyText = depth === 1 ? "这个章节暂时还没有文章。" : "这个主题暂时还没有文章。";
  const childTree = children.length === 0 ? "" : `            <div class="child-tree">
${renderChildLinks(children)}
            </div>
`;
  const body =
    categoryArticles.length === 0
      ? `            <p class="section-empty">${emptyText}</p>`
      : `            <div class="article-list">
${renderArticleCards(categoryArticles, seriesMap)}
            </div>`;

  return `          <section class="article-section" id="${escapeAttribute(category.id)}" data-section data-depth="${depth}" style="--depth: ${depth - 1}">
            <div class="section-heading">
              <p class="eyebrow">${eyebrow}</p>
              <${headingTag}>${escapeHtml(category.label)}</${headingTag}>
              <p>${escapeHtml(category.description)}</p>
            </div>
${childTree}
${body}
          </section>`;
}

function renderChildLinks(categories) {
  return sortCategories(categories)
    .map((category) => {
      return `              <a class="child-link" href="#${escapeAttribute(category.id)}">
                <strong>${escapeHtml(category.label)}</strong>
                <span>${escapeHtml(category.description)}</span>
              </a>`;
    })
    .join("\n");
}

function getCategoryLevelLabel(depth) {
  if (depth === 1) {
    return "Section";
  }

  if (depth === 2) {
    return "Subsection";
  }

  return "Topic";
}

function renderArticleCards(items, seriesMap) {
  return items
    .map((item) => {
      const tags = item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
      const series = item.seriesId ? seriesMap.get(item.seriesId) : undefined;
      const metaParts = [item.date, series?.label, "Zhihu Article"].filter(Boolean).map(escapeHtml);
      const meta = metaParts.join(" · ");
      return `              <article class="article-item">
                <div>
                  <div class="item-meta">${meta}</div>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.summary)}</p>
                  <div class="tag-row">${tags}</div>
                </div>
                <div class="article-actions">
                  <a class="button-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">原文</a>
                </div>
              </article>`;
    })
    .join("\n");
}
