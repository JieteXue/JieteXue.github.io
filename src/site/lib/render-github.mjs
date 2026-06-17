import { escapeAttribute, escapeHtml } from "./html.mjs";

export function renderProjects(items) {
  return items
    .map((item) => {
      const stack = item.stack.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
      return `        <article class="content-card project-card">
          <div class="card-meta">${escapeHtml(item.status)} · GitHub</div>
          <h2>${escapeHtml(item.name)}</h2>
          <p>${escapeHtml(item.description)}</p>
          <div class="tag-row">${stack}</div>
          <a class="button-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer">打开仓库</a>
        </article>`;
    })
    .join("\n");
}
