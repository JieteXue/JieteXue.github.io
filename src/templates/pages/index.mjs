import { renderLayout } from "../layout.mjs";
import { escapeAttribute, escapeHtml } from "../../site/lib/html.mjs";

export function renderIndexPage(profile, siteMap) {
  return renderLayout({
    active: "home",
    title: `${profile.name} · Personal Blog`,
    description: profile.intro,
    head: `    <link rel="prefetch" href="./zhihu.html" as="document" />
    <link rel="prefetch" href="./github.html" as="document" />`,
    footer: "Built for GitHub Pages · Updated from structured data files.",
    main: `    <main class="site-shell home-shell">
      <section class="dashboard-hero" aria-labelledby="hero-title">
        <div class="dashboard-intro">
          <p class="eyebrow">Personal dashboard</p>
          <h1 id="hero-title">${escapeHtml(profile.name)}</h1>
          <p class="tagline">${escapeHtml(profile.tagline)}</p>
          <p class="lead">${escapeHtml(profile.intro)}</p>
          <p class="site-notice">本站正在测试搭建中，内容与功能有待继续完善。</p>
        </div>
        <aside class="dashboard-profile" aria-label="Profile summary">
${renderIntroDetails(profile.introDetails)}
        </aside>
      </section>

      <section class="graph-console" aria-label="Interactive site map">
        <div class="graph-panel">
          <div class="graph-toolbar">
            <div>
              <p class="eyebrow">Interactive map</p>
              <h2>知识与入口地图</h2>
            </div>
          </div>
          <div class="site-map-network" aria-label="Draggable and zoomable knowledge map">
            <canvas id="site-map-network" aria-label="Draggable and zoomable knowledge map"></canvas>
            <p id="site-map-status" class="graph-status" aria-live="polite">Preparing graph...</p>
          </div>
        </div>

        <aside class="graph-detail" id="site-map-detail">
          <div id="site-map-node-detail" aria-live="polite">
            <p class="eyebrow">Selected node</p>
            <h2>未选择节点</h2>
            <p>点击图中的节点查看入口说明；拖拽节点、滚轮缩放可以探索关系。</p>
          </div>
          <form class="force-controls" aria-label="Force graph controls">
            <label>
              <span>Repel</span>
              <output for="graph-repel" data-force-output="repelStrength">520</output>
              <input id="graph-repel" type="range" min="160" max="1100" step="20" value="520" data-force-input="repelStrength" />
            </label>
            <label>
              <span>Distance</span>
              <output for="graph-distance" data-force-output="linkDistance">150</output>
              <input id="graph-distance" type="range" min="70" max="260" step="5" value="150" data-force-input="linkDistance" />
            </label>
            <label>
              <span>Link</span>
              <output for="graph-link" data-force-output="linkStrength">1.05</output>
              <input id="graph-link" type="range" min="0.2" max="2.4" step="0.05" value="1.05" data-force-input="linkStrength" />
            </label>
            <label>
              <span>Center</span>
              <output for="graph-center" data-force-output="centerStrength">0.07</output>
              <input id="graph-center" type="range" min="0" max="0.18" step="0.005" value="0.07" data-force-input="centerStrength" />
            </label>
            <label>
              <span>Node size</span>
              <output for="graph-node-size" data-display-output="nodeSize">1.08</output>
              <input id="graph-node-size" type="range" min="0.75" max="1.8" step="0.02" value="1.08" data-display-input="nodeSize" />
            </label>
          </form>
        </aside>
      </section>

      <section class="command-center" aria-label="Site command centre">
        <a class="mission-panel" href="./zhihu.html">
          <p class="eyebrow">Primary route</p>
          <h2>知乎文章库</h2>
          <p>按章节、系列和主题整理已经发表在知乎上的文章。这里是站点目前最主要的阅读入口，也是后续知识地图的中心。</p>
          <div class="mission-meta" aria-label="Article archive summary">
            <span>14 articles</span>
            <span>4 category nodes</span>
            <span>5 series</span>
          </div>
          <strong>进入文章库</strong>
        </a>

        <aside class="command-rail" aria-label="Dashboard status">
          <section>
            <p class="eyebrow">Now</p>
            <h2>${escapeHtml(getBlockTitle(profile.blocks, "now", "探索中"))}</h2>
            <p>${escapeHtml(getBlockBody(profile.blocks, "now", "整理数学物理笔记，同时搭建支持写作和知识管理的小工具。"))}</p>
          </section>
          <section>
            <p class="eyebrow">Interests</p>
${renderTagCloud(getBlockItems(profile.blocks, "interests"))}
          </section>
          <section>
            <p class="eyebrow">Build</p>
            <p>首页信息来自 <code>content/profile.json</code>，内容页由 JSON 和模板生成。</p>
          </section>
        </aside>
      </section>

      <section class="route-console" aria-label="Secondary routes">
        <a href="./github.html">
          <span>01</span>
          <div>
            <strong>GitHub 项目</strong>
            <p>精选仓库、工具建设和后续可公开维护的代码项目。</p>
          </div>
        </a>
        <a href="./zhihu.html#tools">
          <span>02</span>
          <div>
            <strong>工具与代码</strong>
            <p>LaTeX / TikZ / Mathematica 相关工具流会逐渐收拢到这里。</p>
          </div>
        </a>
        <a href="https://github.com/JieteXue/JieteXue" target="_blank" rel="noreferrer">
          <span>03</span>
          <div>
            <strong>About / Links</strong>
            <p>回到 profile 仓库，查看 README、统计图和更多公开入口。</p>
          </div>
        </a>
      </section>

      <section class="profile-console" aria-label="Profile notes">
        <div>
          <p class="eyebrow">About</p>
          <h2>${escapeHtml(getBlockTitle(profile.blocks, "about", "学习者"))}</h2>
          <p>${escapeHtml(getBlockBody(profile.blocks, "about", "这里记录我对数学、物理、工具和写作流程的长期整理。"))}</p>
        </div>
        <div>
          <p class="eyebrow">Timeline</p>
${renderTimelinePreview(profile.timeline)}
        </div>
      </section>
      <script type="application/json" id="site-map-data">${escapeJsonForScript(siteMap)}</script>
      <script type="module" src="./assets/js/site-map.js"></script>
    </main>`,
  });
}

function renderIntroDetails(items = []) {
  if (items.length === 0) {
    return "";
  }

  return `            <dl class="intro-details">
${items
  .map((item) => {
    return `              <div>
                <dt>${escapeHtml(item.label)}</dt>
                <dd>${escapeHtml(item.value)}</dd>
              </div>`;
  })
  .join("\n")}
            </dl>`;
}

function renderTagCloud(items = []) {
  if (items.length === 0) {
    return "";
  }

  return `          <div class="tag-row dashboard-tags">
${items.map((item) => `            <span>${escapeHtml(item)}</span>`).join("\n")}
          </div>`;
}

function renderTimelinePreview(items = []) {
  if (items.length === 0) {
    return "";
  }

  return `          <div class="mini-timeline">
${items
  .slice(0, 3)
  .map((item) => {
    return `            <div>
              <span>${escapeHtml(item.period)}</span>
              <strong>${escapeHtml(item.title)}</strong>
            </div>`;
  })
  .join("\n")}
          </div>`;
}

function getBlock(blocks, id) {
  return blocks.find((block) => block.id === id);
}

function getBlockTitle(blocks, id, fallback) {
  return getBlock(blocks, id)?.title ?? fallback;
}

function getBlockBody(blocks, id, fallback) {
  return getBlock(blocks, id)?.body ?? fallback;
}

function getBlockItems(blocks, id) {
  return getBlock(blocks, id)?.items ?? [];
}

function escapeJsonForScript(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll(">", "\\u003e").replaceAll("&", "\\u0026");
}
