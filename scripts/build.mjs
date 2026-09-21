import { cp, mkdir, readdir, rm, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkSite } from "./check.mjs";
import { siteConfig } from "../src/site-config.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "src");
const publicDirectory = path.join(root, "public");
const output = path.join(root, "dist");
const sourceFiles = ["index.html", "styles.css", "main.js", "site-config.js"];

export async function buildSite() {
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(publicDirectory, output, { recursive: true });

  for (const filename of sourceFiles) {
    await cp(path.join(source, filename), path.join(output, filename));
  }

  if (siteConfig.siteUrl) {
    const url = new URL(siteConfig.siteUrl);
    if (url.protocol !== "https:") throw new Error("siteUrl must use HTTPS");
    if (!url.pathname.endsWith("/")) url.pathname += "/";
    const escape = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
    const indexPath = path.join(output, "index.html");
    let html = await readFile(indexPath, "utf8");
    html = html.replace('content="./images/social-preview.jpg"', `content="${escape(new URL("images/social-preview.jpg", url).href)}"`);
    html = html.replace("</head>", `<link rel="canonical" href="${escape(url.href)}">\n  <meta property="og:url" content="${escape(url.href)}">\n</head>`);
    await writeFile(indexPath, html);
  }
  await checkSite(output);
  const entries = await readdir(output, { recursive: true });
  console.log(`built ${entries.length} entries in ${path.relative(root, output)}/`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildSite();
}
