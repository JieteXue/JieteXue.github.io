import { renderLayout } from "../layout.mjs";

export function renderGithubPage({ projects }) {
  return renderLayout({
    active: "github",
    title: "JieteXue · GitHub Projects",
    description: "JieteXue 的精选 GitHub 项目展示页。",
    head: `    <link rel="prefetch" href="./zhihu.html" as="document" />`,
    footer: "Project list is generated from content/github-projects.json.",
    main: `    <main class="site-shell">
      <section class="page-head split-head" aria-labelledby="page-title">
        <div>
          <p class="eyebrow">Selected repositories</p>
          <h1 id="page-title">GitHub 项目</h1>
          <p class="lead">
            这里展示精选仓库和正在维护的项目。项目数据来自 <code>content/github-projects.json</code>，页面由自动化生成。
          </p>
        </div>
        <aside class="profile-panel" aria-label="GitHub profile">
          <strong>@JieteXue</strong>
          <span>Profile · repositories · public work</span>
          <a href="https://github.com/JieteXue" target="_blank" rel="noreferrer">打开 GitHub Profile</a>
        </aside>
      </section>

      <section class="content-grid" aria-label="GitHub projects">
<!-- PROJECTS:START -->
${projects}
<!-- PROJECTS:END -->
      </section>
    </main>`,
  });
}
