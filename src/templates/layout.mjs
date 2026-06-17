import { escapeAttribute, escapeHtml } from "../site/lib/html.mjs";

const navItems = [
  { id: "home", label: "Home", href: "./index.html" },
  { id: "zhihu", label: "Zhihu", href: "./zhihu.html" },
  { id: "github", label: "GitHub", href: "./github.html" },
];

export function renderLayout({ active, title, description, head = "", footer, main }) {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeAttribute(description)}" />
    <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230d1117'/%3E%3Ctext x='32' y='40' text-anchor='middle' font-family='Arial,sans-serif' font-size='24' font-weight='700' fill='%237dd3fc'%3EJX%3C/text%3E%3C/svg%3E" />
    <link rel="stylesheet" href="./assets/css/site.css" />
${head}
  </head>
  <body>
    <header class="topbar">
      <div class="site-shell topbar-inner">
        <a class="brand" href="./index.html" aria-label="JieteXue home">
          <span class="mark">JX</span>
          <span>JieteXue</span>
        </a>
        <nav class="nav" aria-label="Primary navigation">
${renderNav(active)}
        </nav>
      </div>
    </header>

${main}

    <footer class="footer">
      <div class="site-shell">${escapeHtml(footer)}</div>
    </footer>
  </body>
</html>
`;
}

function renderNav(active) {
  const internal = navItems
    .map((item) => {
      const current = item.id === active ? ' aria-current="page"' : "";
      return `          <a href="${escapeAttribute(item.href)}"${current}>${escapeHtml(item.label)}</a>`;
    })
    .join("\n");

  const profileHref =
    active === "github" ? "https://github.com/JieteXue" : "https://www.zhihu.com/people/7-63-5-13-42";
  return `${internal}
          <a href="${profileHref}" target="_blank" rel="noreferrer">Profile</a>`;
}
