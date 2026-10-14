/*
 * Koreografi presentasi.
 * Semua gerak dilakukan CSS (transition / keyframes) yang dipicu lewat class;
 * berkas ini hanya mengatur urutan waktunya: opening, masuk/keluar slide,
 * dunia visual (scene) dan warna latar tiap slide.
 */
(() => {
  "use strict";

  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => Boolean(window.deckMotionReduced) || reduceQuery.matches;
  const frame = (fn) => requestAnimationFrame(() => requestAnimationFrame(fn));
  const timers = new Set();
  let introTimers = [];
  let backgroundSequence = 0;
  let sceneSequence = 0;
  let deckReady = false;
  let pendingScene = null;
  let wipeTimer = 0;

  function later(fn, ms, bucket) {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    if (bucket) bucket.push(id);
    return id;
  }

  /* ---------- pemecah teks: kata (.w > .wi) dan huruf (.w > .ch) ---------- */
  function splitText(root, mode) {
    let wordIndex = 0;
    let charIndex = 0;
    const make = (className, text) => {
      const span = document.createElement("span");
      span.className = className;
      if (text != null) span.textContent = text;
      return span;
    };
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const fragment = document.createDocumentFragment();
          child.nodeValue.split(/(\s+)/).forEach((token) => {
            if (!token) return;
            if (/^\s+$/.test(token)) { fragment.appendChild(document.createTextNode(token)); return; }
            const word = make("w");
            if (mode === "chars") {
              Array.from(token).forEach((character) => {
                const ch = make("ch", character);
                ch.style.setProperty("--ci", String(charIndex++));
                word.appendChild(ch);
              });
            } else {
              const inner = make("wi", token);
              inner.style.setProperty("--wi", String(wordIndex++));
              word.appendChild(inner);
            }
            fragment.appendChild(word);
          });
          child.replaceWith(fragment);
        } else if (child.nodeType === Node.ELEMENT_NODE && child.tagName !== "BR") {
          walk(child);
        }
      });
    };
    walk(root);
    return { words: wordIndex, chars: charIndex };
  }

  function prepareSplits(scope) {
    scope.querySelectorAll("[data-split]").forEach((el) => {
      if (el.dataset.splitDone) return;
      el.dataset.splitDone = "1";
      const mode = el.dataset.split === "chars" ? "chars" : "words";
      const result = splitText(el, mode);
      if (mode === "chars") el.closest(".mask")?.classList.add("is-chars");
      // paragraf panjang tidak boleh muncul terlalu lama: sebar dalam ±0,9 detik
      if (mode === "words" && result.words > 0) {
        const step = Math.max(7, Math.min(40, Math.round(900 / result.words)));
        el.style.setProperty("--ws", `${step}ms`);
      }
    });
  }

  /* ---------- dunia visual (scene) ---------- */
  function sceneFor(index) {
    return window.DeckScenes ? window.DeckScenes.build(index) : null;
  }

  function showScene(index) {
    const stage = document.getElementById("sceneStage");
    if (!stage) return;
    if (!deckReady) { pendingScene = index; return; }
    const sequence = ++sceneSequence;
    const incoming = sceneFor(index);
    stage.querySelectorAll(".scene:not(.is-out)").forEach((old) => {
      old.classList.remove("is-in");
      old.classList.add("is-out");
      later(() => old.remove(), 1700);
    });
    if (!incoming) return;
    stage.appendChild(incoming);
    if (reduced()) { incoming.classList.add("is-in"); return; }
    frame(() => { if (sequence === sceneSequence) incoming.classList.add("is-in"); });
  }

  /* ---------- opening ---------- */
  function openingCenter(root) {
    const orn = document.getElementById("openingOrnament");
    const box = root.getBoundingClientRect();
    const rect = (orn || root).getBoundingClientRect();
    const cx = rect.left + rect.width / 2 - box.left;
    const cy = rect.top + rect.height / 2 - box.top;
    root.style.setProperty("--ocx", `${((cx / box.width) * 100).toFixed(2)}%`);
    root.style.setProperty("--ocy", `${((cy / box.height) * 100).toFixed(2)}%`);
    return { cx, cy };
  }

  function markReady() {
    if (deckReady) return;
    deckReady = true;
    document.body.classList.add("deck-ready");
    if (pendingScene !== null) {
      const index = pendingScene;
      pendingScene = null;
      later(() => showScene(index), 250);
    }
  }

  function finishOpening(root, onComplete) {
    const live = window.DeckFXLive;
    root.classList.add("is-leaving");
    markReady();
    live?.burst(0.72, 0.5, 110);
    later(() => onComplete?.(), reduced() ? 0 : 520);
    later(() => { root.style.display = "none"; live?.openingStop(); }, reduced() ? 20 : 1750);
  }

  function playIntro(onComplete) {
    const root = document.getElementById("opening");
    if (!root) { markReady(); onComplete?.(); return; }
    if (reduced()) {
      root.style.display = "none";
      markReady();
      onComplete?.();
      return;
    }
    introTimers = [];
    prepareSplits(root);
    const orn = document.getElementById("openingOrnament");
    const scene = sceneFor(0);
    if (orn && scene) orn.appendChild(scene);
    const { cx, cy } = openingCenter(root);
    frame(() => {
      root.classList.add("is-playing");
      scene?.classList.add("is-in");
      window.DeckFXLive?.openingStart(cx, cy);
    });
    later(() => { root.classList.add("is-burst"); window.DeckFXLive?.openingBurst(); }, 3500, introTimers);
    later(() => root.classList.add("is-shine"), 3900, introTimers);
    later(() => finishOpening(root, onComplete), 6300, introTimers);
  }

  function skipIntro(onComplete) {
    const root = document.getElementById("opening");
    introTimers.forEach((id) => window.clearTimeout(id));
    introTimers = [];
    if (!root) { onComplete?.(); return; }
    finishOpening(root, onComplete);
  }

  /* ---------- slide ---------- */
  function prepare(node) {
    prepareSplits(node);
    node.querySelectorAll(".r").forEach((el, i) => {
      el.style.setProperty("--bi", String(i * 95));
    });
    // kata-kata paragraf menunggu panel kacanya membuka dulu
    node.querySelectorAll(".glass .slide-paragraph").forEach((el) => {
      const base = Number(el.closest(".glass.r")?.style.getPropertyValue("--bi")) || 0;
      el.style.setProperty("--bi", String(base + 260));
    });
    node.querySelectorAll(".r .point-copy").forEach((el) => {
      const base = Number(el.closest(".r")?.style.getPropertyValue("--bi")) || 0;
      el.style.setProperty("--bi", String(base));
    });
  }

  function settle(node, delay) {
    later(() => { if (node.isConnected && node.classList.contains("is-in") && !node.classList.contains("is-leaving")) node.classList.add("is-settled"); }, delay);
  }

  function enterSlide(node, first = false) {
    if (!node) return;
    prepare(node);
    if (reduced()) { node.classList.add("is-in"); return; }
    node.classList.toggle("is-first", Boolean(first));
    frame(() => node.classList.add("is-in"));
    settle(node, first ? 3400 : 2800);
  }

  function wipe(direction) {
    const root = document.getElementById("presentation");
    if (!root || reduced()) return;
    window.clearTimeout(wipeTimer);
    root.classList.remove("is-wiping-fwd", "is-wiping-back");
    void root.offsetWidth;
    root.classList.add(direction >= 0 ? "is-wiping-fwd" : "is-wiping-back");
    wipeTimer = window.setTimeout(() => root.classList.remove("is-wiping-fwd", "is-wiping-back"), 1250);
  }

  function transitionSlides(oldNode, newNode, direction, done) {
    if (!newNode) { done?.(); return; }
    if (reduced()) {
      oldNode?.remove();
      enterSlide(newNode);
      done?.();
      return;
    }
    const dir = direction >= 0 ? 1 : -1;
    newNode.style.setProperty("--dir", String(dir));
    prepare(newNode);
    wipe(dir);
    window.DeckFXLive?.burst(0.7, 0.5, 46);
    if (oldNode) {
      oldNode.style.setProperty("--dir", String(dir));
      oldNode.classList.remove("is-settled");
      oldNode.classList.add("is-exiting");
      frame(() => oldNode.classList.add("is-leaving"));
      later(() => { newNode.classList.add("is-in"); settle(newNode, 2800); }, 420);
      later(() => { oldNode.remove(); done?.(); }, 1000);
    } else {
      frame(() => { newNode.classList.add("is-in"); settle(newNode, 2800); });
      later(() => done?.(), 900);
    }
  }

  /* ---------- warna latar & dunia visual tiap slide ---------- */
  const STACK_KEYS = new Set(["aur1", "aur2"]);
  const SKIP_KEYS = new Set(["scene"]);

  function applyVariant(layer, variant) {
    const stack = document.getElementById("backgroundStack");
    Object.entries(variant || {}).forEach(([key, value]) => {
      if (SKIP_KEYS.has(key)) return;
      (STACK_KEYS.has(key) && stack ? stack : layer).style.setProperty(`--${key}`, value);
    });
  }

  function changeBackground(stack, variant, direction = 1, done) {
    if (!stack) { done?.(); return; }
    const sequence = ++backgroundSequence;
    const layer = stack.querySelector("#slideBackground") || stack.querySelector(".background-layer");
    if (layer) applyVariant(layer, variant);
    later(() => { if (sequence === backgroundSequence) done?.(true); }, 1200);
  }

  function setOrnamentStep(index) {
    showScene(index);
  }

  function setReducedMotion(enabled) {
    window.deckMotionReduced = Boolean(enabled);
  }

  window.DeckFX = { playIntro, skipIntro, enterSlide, transitionSlides, changeBackground, setOrnamentStep, setReducedMotion, applyVariant };
})();
