import { countCategoryNodes } from "./lib/category-tree.mjs";
import { readJson, writeText } from "./lib/io.mjs";
import { renderProjects } from "./lib/render-github.mjs";
import { renderArticleSections, renderChapterNav } from "./lib/render-zhihu.mjs";
import { validateArticles, validateCategoryTree, validateProfile, validateProjects, validateSeries, validateSiteMap } from "./lib/validators.mjs";
import { renderGithubPage } from "../templates/pages/github.mjs";
import { renderIndexPage } from "../templates/pages/index.mjs";
import { renderZhihuPage } from "../templates/pages/zhihu.mjs";

const articlePath = "content/zhihu-articles.json";
const articleCategoryPath = "content/zhihu-categories.json";
const articleSeriesPath = "content/zhihu-series.json";
const profilePath = "content/profile.json";
const projectPath = "content/github-projects.json";
const siteMapPath = "content/site-map.json";

const profile = readJson(profilePath);
const articles = readJson(articlePath);
const articleCategories = readJson(articleCategoryPath);
const articleSeries = readJson(articleSeriesPath);
const projects = readJson(projectPath);
const siteMap = readJson(siteMapPath);
const articleCategoryMap = validateCategoryTree(articleCategories, articleCategoryPath);
const articleCategoryCount = countCategoryNodes(articleCategories);
const articleSeriesMap = validateSeries(articleSeries, articleCategoryMap, articleSeriesPath);

validateProfile(profile, profilePath);
validateArticles(articles, articleCategoryMap, articleSeriesMap, articlePath);
validateProjects(projects, projectPath);
validateSiteMap(siteMap, siteMapPath);

writeText("index.html", renderIndexPage(profile, siteMap));
writeText(
  "zhihu.html",
  renderZhihuPage({
    articleSections: renderArticleSections(articleCategories, articles, articleSeriesMap),
    chapterNav: renderChapterNav(articleCategories),
  }),
);
writeText("github.html", renderGithubPage({ projects: renderProjects(projects) }));

console.log(
  `Generated ${articles.length} Zhihu article(s), ${articleCategoryCount} category node(s), ${articleSeries.length} series, and ${projects.length} GitHub project(s).`,
);
