import { siteConfig } from "./site-config.js";
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
// Links without a configured URL stay visible but disabled (e.g. arXiv before release).
for (const link of document.querySelectorAll("[data-link]")) {
  const url = siteConfig.links[link.dataset.link];
  if (url) {
    link.href = url;
    link.classList.remove("project-link--disabled");
    link.removeAttribute("aria-disabled");
  } else {
    link.removeAttribute("href");
    link.classList.add("project-link--disabled");
    link.setAttribute("aria-disabled", "true");
  }
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
    const video = panel.querySelector("video");
    if (selected && video.paused) video.currentTime = 0;
  }
  loops.forEach(updateLoop);
  if (moveFocus) tab.focus();
}
tablist.closest(".force-select").hidden = false;
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

// Short clips ([data-loop]) play muted and looped while on screen; the static HTML keeps
// controls for no-JS and reduced-motion visitors. Longer recordings load on demand.
const autoLoop = !reducedMotion.matches;
const loops = [...document.querySelectorAll("video[data-loop]")];
const recordings = [...document.querySelectorAll("video:not([data-loop])")];
const onScreen = new Set();
// Clips sharing a data-loop value run as one group: all play while any is visible, kept in step.
const groupOf = video => video.dataset.loop ? loops.filter(v => v.dataset.loop === video.dataset.loop) : [video];
function updateLoop(video) {
  const play = autoLoop && !document.hidden && !video.closest("[hidden]") && groupOf(video).some(v => onScreen.has(v));
  if (play) video.play().catch(() => {}); else video.pause();
}
if (autoLoop) {
  for (const video of loops) {
    video.controls = false;
    video.muted = video.defaultMuted = video.loop = true;
  }
  for (const group of new Set(loops.filter(v => v.dataset.loop).map(v => v.dataset.loop))) {
    const [leader, ...followers] = groupOf(loops.find(v => v.dataset.loop === group));
    leader.addEventListener("timeupdate", () => {
      const d = leader.duration;
      if (!d) return;
      for (const video of followers) {
        const drift = ((video.currentTime - leader.currentTime + 1.5 * d) % d) - d / 2;
        if (!video.paused && Math.abs(drift) > 0.2) video.currentTime = leader.currentTime;
      }
    });
  }
}
selectTab(tabs[0]);
for (const video of recordings) {
  video.addEventListener("play", () => {
    for (const other of recordings) if (other !== video) other.pause();
  });
}
for (const video of [...loops, ...recordings]) {
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
  const watchLoops = new IntersectionObserver(entries => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) onScreen.add(target); else onScreen.delete(target);
      groupOf(target).forEach(updateLoop);
    }
  }, { threshold: 0.05 });
  loops.forEach(video => watchLoops.observe(video));
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
  loops.forEach(updateLoop);
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
