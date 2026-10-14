(() => {
  "use strict";

  // Setiap slide punya suasana warna sendiri; dunianya (scene) digambar oleh scenes.js.
  const backgrounds = [
    { scene: 1,  gx1: "72%", gy1: "42%", gx2: "10%", gy2: "104%", tone: "#1d5239", tone2: "#0e2d21", aur1: "#2a7a55", aur2: "#b8913f" },
    { scene: 2,  gx1: "78%", gy1: "30%", gx2: "16%", gy2: "98%",  tone: "#1a4c48", tone2: "#0c2a28", aur1: "#2a8077", aur2: "#9a8a4a" },
    { scene: 3,  gx1: "70%", gy1: "60%", gx2: "8%",  gy2: "24%",  tone: "#3a4a2c", tone2: "#14281c", aur1: "#5e7a3a", aur2: "#c79a45" },
    { scene: 4,  gx1: "74%", gy1: "62%", gx2: "26%", gy2: "108%", tone: "#5a4a2a", tone2: "#17291d", aur1: "#b9803a", aur2: "#e0a85a" },
    { scene: 5,  gx1: "72%", gy1: "50%", gx2: "12%", gy2: "10%",  tone: "#1b4d4a", tone2: "#0d2b2a", aur1: "#2a8a86", aur2: "#a8b068" },
    { scene: 6,  gx1: "76%", gy1: "46%", gx2: "22%", gy2: "100%", tone: "#2a5035", tone2: "#14291b", aur1: "#3a8a55", aur2: "#c9a24a" },
    { scene: 7,  gx1: "70%", gy1: "36%", gx2: "10%", gy2: "90%",  tone: "#17405a", tone2: "#0a1f2e", aur1: "#2a6f9a", aur2: "#6aa0b8" },
    { scene: 8,  gx1: "78%", gy1: "30%", gx2: "20%", gy2: "100%", tone: "#2d4a50", tone2: "#0e2226", aur1: "#3a7a86", aur2: "#c0a060" },
    { scene: 9,  gx1: "70%", gy1: "55%", gx2: "26%", gy2: "104%", tone: "#2f5a2e", tone2: "#12301b", aur1: "#4a9a3e", aur2: "#c8b24a" },
    { scene: 10, gx1: "74%", gy1: "48%", gx2: "10%", gy2: "30%",  tone: "#1c4a55", tone2: "#0c2530", aur1: "#2a7f94", aur2: "#a89a5a" },
    { scene: 11, gx1: "72%", gy1: "50%", gx2: "20%", gy2: "96%",  tone: "#4a4228", tone2: "#17271c", aur1: "#9a7e3a", aur2: "#d6b060" },
    { scene: 12, gx1: "74%", gy1: "46%", gx2: "14%", gy2: "100%", tone: "#215a40", tone2: "#0f2e21", aur1: "#2f9468", aur2: "#d8b968" }
  ];

  const slides = Array.isArray(window.materiPresentasi) ? window.materiPresentasi : [];
  const root = document.getElementById("presentation");
  const content = document.getElementById("slideContent");
  const backgroundStack = document.getElementById("backgroundStack");
  const previousButton = document.getElementById("previousButton");
  const nextButton = document.getElementById("nextButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const overviewButton = document.getElementById("overviewButton");
  const closeOverviewButton = document.getElementById("closeOverviewButton");
  const overviewPanel = document.getElementById("overviewPanel");
  const overviewGrid = document.getElementById("overviewGrid");
  const progressSegments = document.getElementById("progressSegments");
  const slideCounter = document.getElementById("slideCounter");
  const progressPercent = document.getElementById("progressPercent");
  const topSlideLabel = document.getElementById("topSlideLabel");
  const slideTypeLabel = document.getElementById("slideTypeLabel");
  const railFill = document.getElementById("railFill");
  const opening = document.getElementById("opening");
  const skipOpening = document.getElementById("skipOpening");
  const soundMotionButton = document.getElementById("soundMotionButton");
  const announcement = document.getElementById("announcement");

  let currentIndex = 0;
  let transitionRunning = false;
  let queuedIndex = null;
  let introFinished = false;
  let announcementTimer = null;
  let pointerStart = null;
  let backgroundToken = 0;
  let currentSlideNode = null;
  let motionReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.deckMotionReduced = motionReduced;

  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
  const hasText = (value) => typeof value === "string" && value.trim().length > 0;
  const asArray = (value) => value == null ? [] : (Array.isArray(value) ? value : [value]);
  const textWithBreaks = (value) => escapeHTML(value).replace(/\n/g, "<br>");
  const labelForType = (type) => ({
    pembuka: "OPENING", anggota: "THE TEAM", materi: "KEY IDEAS", tujuan: "OBJECTIVES",
    kesimpulan: "SUMMARY", referensi: "REFERENCES", penutup: "CLOSING"
  }[type] || "PRESENTATION");
  const currentTitle = (slide) => String(slide?.judul || "").replace(/\s+/g, " ").trim();

  function kicker(text) {
    return `<div class="slide-kicker r">${escapeHTML(text)}</div>`;
  }

  function titleMarkup(title, className = "slide-title", split = "words") {
    if (!hasText(title)) return "";
    return `<h1 class="${className} r" data-split="${split}">${textWithBreaks(title)}</h1>`;
  }

  function paragraphsMarkup(value) {
    const paragraphs = asArray(value).filter(hasText);
    if (!paragraphs.length) return "";
    const para = (text) => `<p class="slide-paragraph" data-split="words">${textWithBreaks(text)}</p>`;
    if (paragraphs.length === 1) return `<div class="slide-body glass r">${para(paragraphs[0])}</div>`;
    return `<div class="slide-paragraphs glass r">${paragraphs.map(para).join("")}</div>`;
  }

  function pointsMarkup(points) {
    const list = asArray(points).filter(hasText);
    if (!list.length) return "";
    return `<ol class="point-list">${list.map((point, i) => `<li class="r"><span class="point-index">${String(i + 1).padStart(2, "0")}</span><span class="point-copy">${textWithBreaks(point)}</span></li>`).join("")}</ol>`;
  }

  function memberMarkup(points) {
    const list = asArray(points).filter(hasText);
    return `<div class="member-grid">${list.map((person, i) => {
      const match = String(person).match(/^(.*?)\s*\(([^)]+)\)\s*$/);
      const name = match ? match[1].trim() : String(person);
      const id = match ? match[2].trim() : "";
      return `<article class="member-card r"><span class="member-number">${String(i + 1).padStart(2, "0")}</span><div><div class="member-name">${escapeHTML(name)}</div>${id ? `<span class="member-id">NIM / ${escapeHTML(id)}</span>` : ""}</div></article>`;
    }).join("")}</div>`;
  }

  function objectiveMarkup(points) {
    const list = asArray(points).filter(hasText);
    return `<div class="objective-grid">${list.map((point, i) => `<article class="objective-card r tilt"><span class="objective-number">${String(i + 1).padStart(2, "0")}</span><div class="objective-text">${textWithBreaks(point)}</div></article>`).join("")}</div>`;
  }

  function referenceMarkup(points) {
    const list = asArray(points).filter(hasText);
    return `<div class="reference-list">${list.map((point, i) => `<article class="reference-item r"><span class="reference-number">${String(i + 1).padStart(2, "0")}</span><span class="reference-text">${textWithBreaks(point)}</span><span class="reference-mark" aria-hidden="true">↗</span></article>`).join("")}</div>`;
  }

  function renderSlide(slide, index) {
    const type = slide?.tipe || "materi";
    const title = slide?.judul || "";
    const number = String(index + 1).padStart(2, "0");
    let html = "";
    let layout = `slide-layout-${type}`;

    if (type === "pembuka") {
      const rawTitle = String(title).replace(/\n/g, " ").trim();
      const hasAmp = rawTitle.includes("&");
      const heroHtml = hasAmp
        ? `<span class="mask"><span class="inner" data-split="chars">${escapeHTML(rawTitle.split("&")[0].trim())}</span></span><span class="mask hero-line-two"><span class="inner" data-split="chars"><em>&amp;</em> ${escapeHTML(rawTitle.split("&").slice(1).join("&").trim())}</span></span>`
        : `<span class="mask"><span class="inner" data-split="chars">${textWithBreaks(title)}</span></span>`;
      html = `${kicker(slide.subjudul || "KELOMPOK 1 / PRESENTASI AKADEMIK")}<h1 class="hero-title r">${heroHtml}</h1><div class="cover-bottom r"><span class="cover-rule"><i></i> AQIDAH &amp; TAUHID</span><span class="cover-coordinates">${number} <span>/</span> ${String(slides.length).padStart(2, "0")}</span></div>`;
    } else if (type === "anggota") {
      html = `${kicker(`KELOMPOK / ${number}`)}${titleMarkup(title)}${memberMarkup(slide.poin)}`;
      layout += " member-layout";
    } else if (type === "tujuan") {
      html = `${kicker(`ARAH PEMBAHASAN / ${number}`)}${titleMarkup(title)}${objectiveMarkup(slide.poin)}`;
    } else if (type === "kesimpulan") {
      const paragraphs = asArray(slide.paragraf).filter(hasText);
      html = `${kicker(`INTISARI / ${number}`)}${titleMarkup(title)}<div class="conclusion-layout"><div class="conclusion-copy glass r">${paragraphs.map((paragraph) => `<p class="slide-paragraph" data-split="words">${textWithBreaks(paragraph)}</p>`).join("")}</div></div>`;
    } else if (type === "referensi") {
      html = `${kicker(`RUJUKAN / ${number}`)}${titleMarkup(title)}${referenceMarkup(slide.poin)}`;
    } else if (type === "penutup") {
      html = `${kicker(`AKHIR PRESENTASI / ${number}`)}${titleMarkup(title, "slide-title closing-title", "chars")}<div class="closing-rule r" aria-hidden="true"></div>`;
    } else {
      html = `${kicker(`PEMBAHASAN / ${number}`)}${titleMarkup(title)}${paragraphsMarkup(slide.paragraf)}${pointsMarkup(slide.poin)}`;
    }

    const shell = document.createElement("article");
    shell.className = `slide-shell ${layout}`;
    shell.dataset.slideIndex = String(index);
    shell.innerHTML = html;
    return shell;
  }

  function buildProgress() {
    progressSegments.style.setProperty("--slide-count", String(slides.length || 1));
    progressSegments.innerHTML = slides.map((_, index) => `<span class="progress-segment${index === 0 ? " is-active" : ""}" aria-hidden="true"></span>`).join("");
  }

  function buildOverview() {
    overviewGrid.innerHTML = "";
    slides.forEach((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "overview-card";
      button.dataset.index = String(index);
      button.style.setProperty("--tone", backgrounds[index % backgrounds.length].tone);
      button.style.setProperty("--n", String(index));
      button.innerHTML = `<span class="overview-card-num">${String(index + 1).padStart(2, "0")} / ${String(slides.length).padStart(2, "0")}</span><span class="overview-card-title">${escapeHTML(currentTitle(slide) || "SLIDE KOSONG")}</span>`;
      button.addEventListener("click", () => { closeOverview(); goToSlide(index); });
      overviewGrid.appendChild(button);
    });
  }

  function updateUI() {
    const total = slides.length;
    const number = total ? currentIndex + 1 : 0;
    const percentage = total ? Math.round((number / total) * 100) : 0;
    slideCounter.textContent = `${String(number).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    progressPercent.textContent = `${String(percentage).padStart(2, "0")}%`;
    topSlideLabel.textContent = currentTitle(slides[currentIndex]) || "PRESENTATION";
    slideTypeLabel.textContent = labelForType(slides[currentIndex]?.tipe);
    railFill.style.height = `${total > 1 ? (currentIndex / (total - 1)) * 100 : 100}%`;
    previousButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= total - 1;
    progressSegments.querySelectorAll(".progress-segment").forEach((segment, index) => {
      segment.classList.toggle("is-past", index < currentIndex);
      segment.classList.toggle("is-active", index === currentIndex);
    });
    overviewGrid.querySelectorAll(".overview-card").forEach((card, index) => {
      const isCurrent = index === currentIndex;
      card.classList.toggle("is-current", isCurrent);
      if (isCurrent) card.setAttribute("aria-current", "true");
      else card.removeAttribute("aria-current");
    });
  }

  function notify(message) {
    announcement.textContent = message;
    announcement.classList.add("is-visible");
    window.clearTimeout(announcementTimer);
    announcementTimer = window.setTimeout(() => announcement.classList.remove("is-visible"), 1500);
  }

  function setBackground(index, direction, animate = true) {
    const variant = backgrounds[index % backgrounds.length];
    window.DeckFX?.setOrnamentStep(index);
    window.DeckFXLive?.setMood(index);
    if (!animate || !window.DeckFX?.changeBackground) {
      const current = backgroundStack.querySelector("#slideBackground");
      if (current) window.DeckFX?.applyVariant(current, variant);
      return;
    }
    window.DeckFX.changeBackground(backgroundStack, variant, direction);
  }

  function showImmediate(index) {
    currentIndex = Math.max(0, Math.min(index, slides.length - 1));
    content.replaceChildren();
    currentSlideNode = renderSlide(slides[currentIndex], currentIndex);
    content.appendChild(currentSlideNode);
    setBackground(currentIndex, 1, false);
    updateUI();
  }

  function goToSlide(requestedIndex) {
    if (!slides.length) return;
    const targetIndex = Math.max(0, Math.min(Number(requestedIndex), slides.length - 1));
    if (targetIndex === currentIndex && !transitionRunning) return;
    if (targetIndex === currentIndex && transitionRunning) return;
    if (transitionRunning) { queuedIndex = targetIndex; return; }

    const direction = targetIndex >= currentIndex ? 1 : -1;
    const oldNode = currentSlideNode || content.querySelector(".slide-shell");
    currentIndex = targetIndex;
    const newNode = renderSlide(slides[currentIndex], currentIndex);
    content.appendChild(newNode);
    currentSlideNode = newNode;
    transitionRunning = true;
    updateUI();
    setBackground(currentIndex, direction, true);

    const complete = () => {
      transitionRunning = false;
      currentSlideNode = newNode;
      if (queuedIndex !== null) {
        const nextTarget = queuedIndex;
        queuedIndex = null;
        if (nextTarget !== currentIndex) goToSlide(nextTarget);
      }
    };

    if (window.DeckFX?.transitionSlides) {
      window.DeckFX.transitionSlides(oldNode, newNode, direction, complete);
    } else {
      oldNode?.remove();
      complete();
    }
  }

  function next() { if (currentIndex < slides.length - 1) goToSlide(currentIndex + 1); }
  function previous() { if (currentIndex > 0) goToSlide(currentIndex - 1); }

  function openOverview() {
    overviewPanel.classList.add("is-open");
    overviewPanel.setAttribute("aria-hidden", "false");
    overviewButton.setAttribute("aria-expanded", "true");
    closeOverviewButton.focus({ preventScroll: true });
  }

  function closeOverview() {
    overviewPanel.classList.remove("is-open");
    overviewPanel.setAttribute("aria-hidden", "true");
    overviewButton.setAttribute("aria-expanded", "false");
    overviewButton.focus({ preventScroll: true });
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await root.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      notify("Fullscreen tidak didukung browser ini");
    }
  }

  function toggleMotion() {
    motionReduced = !motionReduced;
    window.DeckFX?.setReducedMotion(motionReduced);
    soundMotionButton.setAttribute("aria-pressed", String(motionReduced));
    document.body.classList.toggle("motion-reduced", motionReduced);
    notify(motionReduced ? "Efek gerak dikurangi" : "Efek gerak aktif");
    window.dispatchEvent(new CustomEvent("deck-motion-change", { detail: { reduced: motionReduced } }));
  }

  function finishIntro() {
    if (introFinished) return;
    introFinished = true;
    const complete = () => {
      if (currentSlideNode) window.DeckFX?.enterSlide(currentSlideNode, true);
    };
    if (window.DeckFX?.skipIntro) window.DeckFX.skipIntro(complete);
    else { opening.style.display = "none"; document.body.classList.add("deck-ready"); complete(); }
  }

  previousButton.addEventListener("click", previous);
  nextButton.addEventListener("click", next);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  overviewButton.addEventListener("click", openOverview);
  closeOverviewButton.addEventListener("click", closeOverview);
  skipOpening.addEventListener("click", finishIntro);
  soundMotionButton.addEventListener("click", toggleMotion);
  document.querySelectorAll("[data-close-overview='true']").forEach((element) => element.addEventListener("click", closeOverview));
  document.querySelector(".identity").addEventListener("click", (event) => { event.preventDefault(); goToSlide(0); });

  document.addEventListener("keydown", (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (overviewPanel.classList.contains("is-open")) {
      if (event.key === "Escape") { event.preventDefault(); closeOverview(); }
      if (event.key === "ArrowRight" || event.key === "ArrowDown") { event.preventDefault(); overviewGrid.querySelectorAll(".overview-card")[Math.min(currentIndex + 1, slides.length - 1)]?.focus(); }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") { event.preventDefault(); overviewGrid.querySelectorAll(".overview-card")[Math.max(currentIndex - 1, 0)]?.focus(); }
      return;
    }
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); previous(); }
    else if (event.key === "Home") { event.preventDefault(); goToSlide(0); }
    else if (event.key === "End") { event.preventDefault(); goToSlide(slides.length - 1); }
    else if (event.key.toLowerCase() === "f") { event.preventDefault(); toggleFullscreen(); }
    else if (event.key.toLowerCase() === "o") { event.preventDefault(); openOverview(); }
    else if (event.key === "Escape" && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  });

  root.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    pointerStart = { x: event.clientX, y: event.clientY, time: Date.now() };
  }, { passive: true });
  root.addEventListener("pointerup", (event) => {
    if (!pointerStart || overviewPanel.classList.contains("is-open")) { pointerStart = null; return; }
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) dx < 0 ? next() : previous();
    pointerStart = null;
  }, { passive: true });

  document.addEventListener("fullscreenchange", () => {
    const full = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute("aria-label", full ? "Keluar dari layar penuh" : "Aktifkan layar penuh");
    fullscreenButton.title = full ? "Keluar dari layar penuh (F)" : "Layar penuh (F)";
  });

  // Build the deck beneath the opening; the first slide is revealed as the opening lifts.
  buildProgress();
  buildOverview();
  showImmediate(0);
  backgroundStack.querySelectorAll(".background-layer").forEach((layer) => window.DeckFX?.applyVariant(layer, backgrounds[0]));

  function startIntro() {
    // wait for web fonts (max 1.2s) so the title never reflows mid-animation
    const fontsReady = document.fonts?.ready ? Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 1200))]) : Promise.resolve();
    fontsReady.then(() => {
      if (introFinished) return;
      if (window.DeckFX?.playIntro) window.DeckFX.playIntro(() => {
        introFinished = true;
        if (currentSlideNode) window.DeckFX?.enterSlide(currentSlideNode, true);
      });
      else finishIntro();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startIntro, { once: true });
  else startIntro();
})();
