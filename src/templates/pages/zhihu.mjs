import { renderLayout } from "../layout.mjs";

export function renderZhihuPage({ articleSections, chapterNav }) {
  return renderLayout({
    active: "zhihu",
    title: "JieteXue · Zhihu Articles",
    description: "JieteXue 发表在知乎上的文章展示页。",
    head: `    <link rel="prefetch" href="./github.html" as="document" />
    <script src="./assets/js/zhihu.js" defer></script>`,
    footer: "Zhihu chapters are generated from JSON data files.",
    main: `    <main class="site-shell">
      <section class="page-head" aria-labelledby="page-title">
        <p class="eyebrow">Published on Zhihu</p>
        <h1 id="page-title">知乎文章</h1>
        <p class="lead">
          这里按章节整理已经发表在知乎上的文章。分类由 JSON 控制，文章只在所属章节里展示。
        </p>
      </section>

      <div class="reading-layout">
        <div class="reading-main">
<!-- ARTICLE_SECTIONS:START -->
${articleSections}
<!-- ARTICLE_SECTIONS:END -->
        </div>

        <aside class="chapter-nav" aria-label="Zhihu chapter navigation">
          <p>目录</p>
<!-- CHAPTER_NAV:START -->
${chapterNav}
<!-- CHAPTER_NAV:END -->
        </aside>
      </div>
    </main>`,
  });
}
