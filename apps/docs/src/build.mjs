import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const distDir = join(appRoot, "dist");
const publicDir = join(appRoot, "public");
const checkOnly = process.argv.includes("--check");

const pages = [
  { source: "README.md", output: "index.html", title: "ModelDock" },
  { source: "README.ko.md", output: "README.ko.html", title: "ModelDock Korean README" },
  { source: "README.zh.md", output: "README.zh.html", title: "ModelDock Chinese README" },
  { source: "README.ja.md", output: "README.ja.html", title: "ModelDock Japanese README" },
  { source: "README.es.md", output: "README.es.html", title: "ModelDock Spanish README" },
  { source: "README.vi.md", output: "README.vi.html", title: "ModelDock Vietnamese README" },
  { source: "README.pt.md", output: "README.pt.html", title: "ModelDock Portuguese README" },
  { source: "docs/quickstart.md", output: "docs/quickstart.html", title: "Quickstart" },
  { source: "docs/architecture.md", output: "docs/architecture.html", title: "Architecture" },
  { source: "docs/auth.md", output: "docs/auth.html", title: "Authentication" },
  { source: "docs/byok.md", output: "docs/byok.html", title: "BYOK" },
  { source: "docs/credits.md", output: "docs/credits.html", title: "Credits" },
  { source: "docs/litellm.md", output: "docs/litellm.html", title: "LiteLLM" },
  { source: "docs/mcp.md", output: "docs/mcp.html", title: "MCP" },
  { source: "docs/security.md", output: "docs/security.html", title: "Security" },
  { source: "docs/storage-rag.md", output: "docs/storage-rag.html", title: "Storage and RAG" },
  { source: "docs/deployment/docker.md", output: "docs/deployment/docker.html", title: "Docker Deployment" },
  {
    source: "docs/deployment/production-docker.md",
    output: "docs/deployment/production-docker.html",
    title: "Production Docker"
  },
  { source: "docs/deployment/operations.md", output: "docs/deployment/operations.html", title: "Operations" },
  { source: "docs/deployment/cloudflare.md", output: "docs/deployment/cloudflare.html", title: "Cloudflare Deployment" },
  { source: "docs/deployment/kubernetes.md", output: "docs/deployment/kubernetes.html", title: "Kubernetes Deployment" },
  { source: "docs/faq.md", output: "docs/faq.html", title: "FAQ" }
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replaceAll(
      /\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/g,
      (_, alt, src, href) => `<a href="${toHref(href)}"><img src="${toImageSrc(src)}" alt="${alt}"></a>`
    )
    .replaceAll(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => `<img src="${toImageSrc(src)}" alt="${alt}">`)
    .replaceAll(/`([^`]+)`/g, "<code>$1</code>")
    .replaceAll(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replaceAll(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => `<a href="${toHref(href)}">${text}</a>`);
}

function toHref(href) {
  const rawHref = href.replaceAll("&amp;", "&");
  if (rawHref.startsWith("#")) {
    return escapeHtml(rawHref);
  }
  if (/^[a-z]+:/i.test(rawHref)) {
    return /^(https?:|mailto:)/i.test(rawHref) ? escapeHtml(rawHref) : "#";
  }
  return escapeHtml(rawHref.replace(/\.md(#.*)?$/, ".html$1").replace(/README\.html$/, "index.html"));
}

function toImageSrc(src) {
  const rawSrc = src.replaceAll("&amp;", "&");
  if (/^[a-z]+:/i.test(rawSrc) && !/^https?:/i.test(rawSrc)) {
    return "#";
  }
  if (rawSrc.startsWith("apps/docs/public/")) {
    return escapeHtml(`/${rawSrc.slice("apps/docs/public/".length)}`);
  }
  return escapeHtml(rawSrc);
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const blocks = [];
  let list = [];
  let inCode = false;
  let code = [];

  const flushList = () => {
    if (list.length) {
      blocks.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) {
        blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
        code = [];
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(line);
      continue;
    }
    if (!line.trim()) {
      flushList();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushList();
      const level = heading[1].length;
      blocks.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    blocks.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  flushList();
  return blocks.join("\n");
}

function renderPage(page, markdown) {
  const description = "ModelDock is a LiteLLM-first control plane for self-hosted multi-user LLM services.";
  const canonical = `https://modeldock.example.com/${page.output.replace(/index\.html$/, "").replace(/\.html$/, "")}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: page.title,
    description,
    url: canonical,
    publisher: { "@type": "Organization", name: "ModelDock" },
    isPartOf: { "@type": "WebSite", name: "ModelDock" }
  };
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(page.title)} | ModelDock</title>
  <meta name="description" content="${description}">
  <meta property="og:title" content="${escapeHtml(page.title)} | ModelDock">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="/docs-og-image.svg">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/modeldock-app-icon.png">
  <link rel="apple-touch-icon" href="/modeldock-app-icon.png">
  <link rel="canonical" href="${canonical}">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
  <header><a href="/">ModelDock</a><nav><a href="/docs/quickstart.html">Quickstart</a><a href="/docs/security.html">Security</a><a href="/docs/litellm.html">LiteLLM</a></nav></header>
  <main>${markdownToHtml(markdown)}</main>
</body>
</html>`;
}

async function listPublicFiles(dir = publicDir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listPublicFiles(path)));
    } else {
      files.push(path);
    }
  }
  return files;
}

async function main() {
  if (!checkOnly) {
    await rm(distDir, { recursive: true, force: true });
  }
  for (const page of pages) {
    const markdown = await readFile(join(repoRoot, page.source), "utf8");
    const output = join(distDir, page.output);
    if (!checkOnly) {
      await mkdir(dirname(output), { recursive: true });
      await writeFile(output, renderPage(page, markdown));
    }
  }
  if (!checkOnly) {
    await writeFile(join(distDir, "styles.css"), await readFile(join(appRoot, "src/styles.css"), "utf8"));
    for (const asset of ["robots.txt", "sitemap.xml", "llms.txt", "llms-full.txt"]) {
      await copyFile(join(repoRoot, asset), join(distDir, asset));
    }
    for (const file of await listPublicFiles()) {
      await copyFile(file, join(distDir, relative(publicDir, file)));
    }
  }
}

await main();
