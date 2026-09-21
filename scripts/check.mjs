import { access, readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function checkSite(directory = path.join(root, "dist")) {
  const html = await readFile(path.join(directory, "index.html"), "utf8");
  const css = await readFile(path.join(directory, "styles.css"), "utf8");
  const { siteConfig } = await import(`${pathToFileURL(path.join(directory, "site-config.js")).href}?check=${Date.now()}`);
  const fail = message => { throw new Error(message); };
  if (!html.includes('<html lang="en">')) fail("Document language missing");
  if ((html.match(/<h1\b/g) || []).length !== 1) fail("Expected one main heading");
  if (siteConfig.showAuthors || siteConfig.authors.length || siteConfig.affiliations.length || siteConfig.venue) fail("Anonymous build must not contain author or venue metadata");
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  if (new Set(ids).size !== ids.length) fail("Duplicate HTML IDs");
  for (const match of html.matchAll(/\b(?:href|aria-controls|aria-labelledby)="([^"]+)"/g)) {
    if (match[0].startsWith('href=') && !match[1].startsWith("#")) continue;
    for (const id of match[1].replace(/^#/, "").split(/\s+/)) if (!ids.includes(id)) fail(`Broken anchor or ARIA reference: ${id}`);
  }
  for (const image of html.matchAll(/<img\b[^>]*>/g)) if (!/\balt="[^"]*"/.test(image[0])) fail("Image missing alt text");
  for (const video of html.matchAll(/<video\b[^>]*>/g)) {
    for (const attribute of ['controls', 'playsinline', 'preload="none"', 'poster=', 'aria-label=']) if (!video[0].includes(attribute)) fail(`Recording missing ${attribute}`);
  }
  // Content coverage is separate from layout: a visual revision must not drop the
  // complete research materials the user asked us to preserve.
  const recordings = ["presentation", "establish", "trajectory-25", "trajectory-40", "trajectory-55", "point-upper", "point-lower-left", "point-lower-right"];
  for (const name of recordings) if (!html.includes(`src="./videos/${name}.mp4"`)) fail(`Required research recording missing: ${name}`);
  if ((html.match(/class="metric-table"/g) || []).length !== 3) fail("Each of the three trajectory forces needs its aggregate data table");
  if (!html.includes('class="ablation-table"') || !html.includes('class="region-strip"')) fail("Ablation and region comparison content must be retained");
  const expectedSiteUrl = "https://brace-yourself-robotics.github.io/";
  if (siteConfig.siteUrl !== expectedSiteUrl) fail(`Expected organization root URL: ${expectedSiteUrl}`);
  const base = new URL(siteConfig.siteUrl);
  if (/<base\b/i.test(html)) fail("Root site must not override the document base URL");
  for (const tag of [
    `<link rel="canonical" href="${base.href}">`,
    `<meta property="og:url" content="${base.href}">`,
    `content="${new URL('images/social-preview.jpg', base).href}"`,
  ]) if (!html.includes(tag)) fail(`Missing root-domain metadata: ${tag}`);
  const references = [...html.matchAll(/\b(?:src|href|poster)="([^"]+)"/g)].map(match => match[1]);
  references.push(...[...html.matchAll(/\bcontent="((?:https?:\/\/|\.\/|\/)[^"]+)"/g)].map(match => match[1]));
  references.push(...[...css.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(match => match[1]));
  references.push(...Object.values(siteConfig.links).filter(Boolean), ...Object.values(siteConfig.heroMedia).filter(Boolean));
  for (const filename of ['main.js', 'site-config.js']) {
    const script = await readFile(path.join(directory, filename), 'utf8');
    references.push(...[...script.matchAll(/\bfrom\s+["']([^"']+)["']/g)].map(match => match[1]));
  }
  const localUrls = new Set([base.href]);
  for (const reference of references) {
    const url = new URL(reference, base);
    if (!['https:', 'http:'].includes(url.protocol)) fail(`Unexpected reference protocol: ${reference}`);
    if (url.origin !== base.origin) continue; // External links are not hosted assets.
    if (url.pathname === '/' && url.hash && !ids.includes(decodeURIComponent(url.hash.slice(1)))) fail(`Broken root anchor: ${reference}`);
    const file = path.resolve(directory, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(path.resolve(directory) + path.sep)) fail(`Reference escapes build directory: ${reference}`);
    const info = await stat(file);
    if (!info.isFile() || info.size === 0) fail(`Missing or empty asset: ${reference}`);
    url.hash = '';
    localUrls.add(url.href);
  }
  const manifest = JSON.parse(await readFile(path.join(root, "ASSET_MANIFEST.json"), "utf8"));
  for (const asset of manifest.assets) {
    const file = path.join(directory, asset.asset.replace(/^public\//, ""));
    const buffer = await readFile(file);
    if (createHash("sha256").update(buffer).digest("hex") !== asset.sha256) fail(`Asset differs from provenance manifest: ${asset.asset}`);
    if (buffer.length > 25 * 1024 * 1024) fail(`Web asset exceeds 25 MiB budget: ${asset.asset}`);
  }
  let totalBytes = 0;
  for (const entry of await readdir(directory, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filename = path.join(entry.parentPath || entry.path, entry.name);
    totalBytes += (await stat(filename)).size;
    if (!/\.(?:html|css|js|svg|json|txt|vtt|xml)$/.test(filename)) continue;
    const text = await readFile(filename, "utf8");
    for (const token of ["/home/", "C:\\Users\\", "model_6000", "model_7999", "localhost:23119"]) if (text.toLowerCase().includes(token.toLowerCase())) fail(`Private/internal token ${token} in ${entry.name}`);
  }
  await access(path.join(directory, ".nojekyll"));
  console.log(`Checks passed at ${base.href}: ${ids.length} unique anchors; ${references.length} references; ${localUrls.size} hosted URLs; ${manifest.assets.length} checksummed derivatives; ${(totalBytes / 1024 ** 2).toFixed(1)} MiB total.`);
  return { siteUrl: base.href, localUrls: [...localUrls] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await checkSite();
