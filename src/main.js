import { siteConfig } from "./site-config.js";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

document.querySelector("[data-review-status]").textContent = siteConfig.reviewStatus;
if (siteConfig.showAuthors) {
  const section = document.querySelector("[data-author-section]");
  section.hidden = false;
  section.querySelector("[data-authors]").textContent = siteConfig.authors.join(", ");
  section.querySelector("[data-affiliations]").textContent = siteConfig.affiliations.join(" · ");
  if (siteConfig.venue) {
    const venue = section.querySelector("[data-venue]");
    venue.textContent = siteConfig.venue;
    venue.hidden = false;
  }
}
const links = document.querySelector("[data-project-links]");
links.replaceChildren();
for (const [key, label] of [["paper", "Paper"], ["arxiv", "arXiv"], ["video", "Video"], ["code", "Code"]]) {
  if (!siteConfig.links[key]) continue;
  const link = document.createElement("a");
  link.className = "project-link";
  link.href = siteConfig.links[key];
  link.textContent = label;
  links.append(link);
}
const header = document.querySelector(".site-header");
const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

// Responsive navigation and force selection enhance otherwise complete static content.
const mobile = window.matchMedia("(max-width: 680px)");
const menu = document.querySelector(".menu-toggle");
const navigation = document.querySelector("#navigation");
function closeMenu() {
  menu.setAttribute("aria-expanded", "false");
  navigation.classList.remove("is-open");
}
function setNavigationMode() { closeMenu(); menu.hidden = !mobile.matches; }
menu.addEventListener("click", () => {
  const open = menu.getAttribute("aria-expanded") !== "true";
  menu.setAttribute("aria-expanded", String(open));
  navigation.classList.toggle("is-open", open);
});
navigation.addEventListener("click", event => { if (event.target.closest("a")) closeMenu(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && menu.getAttribute("aria-expanded") === "true") { closeMenu(); menu.focus(); }
});
mobile.addEventListener("change", setNavigationMode);
setNavigationMode();

const tablist = document.querySelector(".force-tabs");
const tabs = [...tablist.querySelectorAll('[role="tab"]')];
function selectTab(tab, moveFocus = false) {
  for (const item of tabs) {
    const selected = item === tab;
    item.setAttribute("aria-selected", String(selected));
    item.tabIndex = selected ? 0 : -1;
    const panel = document.getElementById(item.getAttribute("aria-controls"));
    panel.hidden = !selected;
    if (!selected) panel.querySelector("video").pause();
  }
  if (moveFocus) tab.focus();
}
tablist.hidden = false;
selectTab(tabs[0]);
for (const [index, tab] of tabs.entries()) {
  tab.addEventListener("click", () => selectTab(tab));
  tab.addEventListener("keydown", event => {
    let target;
    if (event.key === "ArrowRight") target = tabs[(index + 1) % tabs.length];
    if (event.key === "ArrowLeft") target = tabs[(index - 1 + tabs.length) % tabs.length];
    if (event.key === "Home") target = tabs[0];
    if (event.key === "End") target = tabs.at(-1);
    if (target) { event.preventDefault(); selectTab(target, true); }
  });
}

// Native controls load recordings on demand. There is no autoplay below the hero.
const recordings = [...document.querySelectorAll("video")];
for (const video of recordings) {
  video.addEventListener("play", () => {
    for (const other of document.querySelectorAll("video")) if (other !== video) other.pause();
  });
  video.addEventListener("error", () => {
    if (video.parentElement.querySelector(".video-error")) return;
    const link = document.createElement("a");
    link.className = "video-error";
    link.textContent = "Open this recording directly ↗";
    link.href = video.querySelector("source")?.src || video.src;
    video.after(link);
  });
}
if ("IntersectionObserver" in window) {
  const pauseOffscreen = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) if (!isIntersecting) target.pause();
  }, { threshold: 0.05 });
  recordings.forEach(video => pauseOffscreen.observe(video));
}

const heroContainer = document.querySelector("[data-hero-media]");
const heroToggle = document.querySelector(".hero-toggle");
const hero = document.createElement("video");
hero.muted = true;
hero.defaultMuted = true;
hero.loop = true;
hero.playsInline = true;
hero.preload = "none";
hero.poster = siteConfig.heroMedia.posterUrl;
hero.setAttribute("aria-hidden", "true");
let heroLoaded = false;
let heroVisible = false;
let heroManuallyPaused = false;
function loadHero() {
  if (!heroLoaded) {
    hero.src = siteConfig.heroMedia.videoUrl;
    heroContainer.append(hero);
    heroLoaded = true;
  }
}
function autoplayAllowed() {
  return !reducedMotion.matches && !navigator.connection?.saveData && !heroManuallyPaused;
}
function maybePlayHero() {
  if (!heroVisible || document.hidden || !autoplayAllowed()) return;
  if (recordings.some(video => !video.paused)) return;
  loadHero();
  hero.play().catch(() => {});
}
heroToggle.hidden = false;
heroToggle.addEventListener("click", () => {
  if (hero.paused) {
    heroManuallyPaused = false;
    loadHero();
    hero.play().catch(() => {});
  } else { heroManuallyPaused = true; hero.pause(); }
});
function updateHeroControl() {
  heroToggle.textContent = hero.paused ? "Play" : "Pause";
  heroToggle.setAttribute("aria-label", `${hero.paused ? "Play" : "Pause"} background video`);
}
hero.addEventListener("play", updateHeroControl);
hero.addEventListener("pause", updateHeroControl);
hero.addEventListener("error", () => { hero.remove(); heroToggle.hidden = true; });
if ("IntersectionObserver" in window) {
  new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting;
    if (heroVisible) maybePlayHero(); else hero.pause();
  }, { threshold: 0.1 }).observe(heroContainer);
}
reducedMotion.addEventListener("change", () => { if (reducedMotion.matches) hero.pause(); else maybePlayHero(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) document.querySelectorAll("video").forEach(video => video.pause());
  else maybePlayHero();
});

// Native dialog supplies modal focus handling and Escape support. Image links still
// open the full-size figure when JavaScript or dialog support is unavailable.
const lightbox = document.querySelector(".lightbox");
if (typeof lightbox.showModal === "function") {
  for (const link of document.querySelectorAll("[data-lightbox]")) {
    link.addEventListener("click", event => {
      event.preventDefault();
      const image = lightbox.querySelector("img");
      image.src = link.href;
      image.alt = link.querySelector("img").alt;
      lightbox.querySelector("p").textContent = image.alt;
      lightbox.showModal();
      document.body.style.overflow = "hidden";
    });
  }
  lightbox.querySelector("button").addEventListener("click", () => lightbox.close());
  lightbox.addEventListener("click", event => { if (event.target === lightbox) lightbox.close(); });
  lightbox.addEventListener("close", () => { document.body.style.overflow = ""; });
}

const copyButton = document.querySelector("[data-copy-citation]");
const copyStatus = document.querySelector("[data-copy-status]");
copyButton.hidden = false;
copyButton.addEventListener("click", async () => {
  const citation = document.querySelector("[data-citation]");
  try {
    await navigator.clipboard.writeText(citation.textContent.trim());
    copyButton.textContent = "Copied ✓";
    copyStatus.textContent = "BibTeX copied to clipboard.";
  } catch {
    const range = document.createRange();
    range.selectNodeContents(citation);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    copyStatus.textContent = "Citation selected. Use your browser’s Copy command.";
    copyButton.textContent = "Selected — copy manually";
  }
  setTimeout(() => { copyButton.textContent = "Copy BibTeX"; }, 3500);
});
