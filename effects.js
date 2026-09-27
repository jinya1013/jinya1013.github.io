<script>
(() => {
  document.documentElement.classList.add("motion-ready");
  const glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789?!#@$%&*+=";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const randomGlyph = () => glyphs[Math.floor(Math.random() * glyphs.length)];

  function scrambleText(element, finalText, duration = 1450) {
    if (reduceMotion) { element.textContent = finalText; return; }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const resolved = Math.floor(progress * finalText.length);
      element.textContent = [...finalText].map((char, index) => char === " " ? " " : index < resolved ? char : randomGlyph()).join("");
      if (progress < 1) requestAnimationFrame(tick);
      else element.textContent = finalText;
    };
    requestAnimationFrame(tick);
  }

  function buildProfileDiffusion() {
    const image = document.querySelector(".about-image");
    if (!image || image.closest(".profile-diffusion")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "profile-diffusion";
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", image.alt || "Portrait of Jinya Sakurai");
    image.parentNode.insertBefore(wrapper, image);
    wrapper.appendChild(image);
    image.setAttribute("aria-hidden", "true");

    const field = document.createElement("div");
    field.className = "token-field";
    field.setAttribute("aria-hidden", "true");
    const cells = Array.from({ length: 256 }, () => {
      const span = document.createElement("span");
      span.textContent = randomGlyph();
      span.dataset.noise = String(Math.random());
      field.appendChild(span);
      return span;
    });
    wrapper.append(field);

    if (reduceMotion) { wrapper.classList.add("is-complete"); return; }
    const duration = 1500;
    const start = performance.now();
    let lastShuffle = 0;
    const denoise = (now) => {
      const progress = Math.max(0, Math.min((now - start) / duration, 1));
      const eased = 1 - Math.pow(1 - progress, 3);
      if (now - lastShuffle > 55) {
        cells.forEach((cell) => {
          const threshold = Number(cell.dataset.noise);
          if (threshold > eased) cell.textContent = randomGlyph();
          cell.style.opacity = threshold < eased ? "0" : String(0.35 + threshold * 0.65);
          cell.style.transform = threshold < eased ? "scale(0.3)" : "scale(1)";
        });
        image.style.opacity = String(0.18 + eased * 0.82);
        image.style.filter = `blur(${(1 - eased) * 18}px) saturate(${0.25 + eased * 0.8}) contrast(1.08)`;
        lastShuffle = now;
      }
      if (progress < 1) requestAnimationFrame(denoise);
      else { image.removeAttribute("style"); wrapper.classList.add("is-complete"); }
    };
    requestAnimationFrame(denoise);
  }

  function decodeElement(element, delay = 0, duration = 1700) {
    if (!element || element.dataset.decoded === "true") return;
    element.dataset.decoded = "true";

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      const finalText = node.nodeValue;
      const thresholds = [...finalText].map((char) => /\s/.test(char) ? 0 : Math.random());
      nodes.push({ node, finalText, thresholds });
    }

    if (reduceMotion) return;
    const start = performance.now() + delay;
    const tick = (now) => {
      const progress = Math.max(0, Math.min((now - start) / duration, 1));
      nodes.forEach(({ node: textNode, finalText, thresholds }) => {
        textNode.nodeValue = [...finalText].map((char, index) => {
          if (/\s/.test(char) || thresholds[index] <= progress) return char;
          if (/[^A-Za-z0-9]/.test(char)) return char;
          return randomGlyph();
        }).join("");
      });
      if (progress < 1) requestAnimationFrame(tick);
      else nodes.forEach(({ node: textNode, finalText }) => { textNode.nodeValue = finalText; });
    };
    requestAnimationFrame(tick);
  }

  function decodeAbout() {
    const paragraphs = [...document.querySelectorAll("#about > p")];
    paragraphs.forEach((paragraph, index) => decodeElement(paragraph, 60 + index * 70, 850));
  }

  function initSectionPanels() {
    const sections = [...document.querySelectorAll("main.content > section.level2")];
    const panelIds = sections.map((section) => section.id).filter(Boolean);
    if (!panelIds.includes("about")) return;

    document.body.classList.add("panel-mode");
    sections.forEach((section) => section.classList.add("content-panel"));

    const panelShell = document.querySelector(".quarto-about-solana");
    const fitPanelToViewport = () => {
      if (!panelShell) return;
      const panelTop = Math.max(0, panelShell.getBoundingClientRect().top);
      panelShell.style.height = `${Math.max(0, window.innerHeight - panelTop)}px`;
    };
    let resizeFrame = 0;
    const schedulePanelFit = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(fitPanelToViewport);
    };
    schedulePanelFit();
    window.addEventListener("resize", schedulePanelFit, { passive: true });
    const siteHeader = document.getElementById("quarto-header");
    if (siteHeader && "ResizeObserver" in window) {
      new ResizeObserver(schedulePanelFit).observe(siteHeader);
    }

    const navLinks = [...document.querySelectorAll(".navbar .nav-link")];
    const contentRoot = document.querySelector("main.content");
    const mobileLayout = window.matchMedia("(max-width: 860px)");
    let activeId = null;
    let transitionId = 0;

    const syncPanelHeight = (panel) => {
      if (!contentRoot) return;
      if (!mobileLayout.matches || !panel) {
        contentRoot.style.removeProperty("height");
        return;
      }
      requestAnimationFrame(() => {
        if (panel.id === activeId) contentRoot.style.height = `${panel.scrollHeight}px`;
      });
    };

    const idFromLink = (link) => {
      const url = new URL(link.href, window.location.href);
      if (url.pathname !== window.location.pathname) return null;
      if (panelIds.includes(url.hash.slice(1))) return url.hash.slice(1);
      return null;
    };

    const setNavState = (id) => {
      navLinks.forEach((link) => {
        const selected = idFromLink(link) === id;
        link.classList.toggle("active", selected);
        if (selected) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    };

    let previewState = null;
    let previewToken = 0;

    const cleanPreviewStyles = (state) => {
      if (state.animations) {
        state.animations.forEach((animation) => animation.cancel());
        state.animations = null;
      }
      [state.current, state.target].forEach((panel) => {
        panel.style.removeProperty("transform");
        panel.style.removeProperty("opacity");
        panel.style.removeProperty("z-index");
        panel.style.removeProperty("will-change");
      });
      if (state.target.id !== activeId) {
        state.target.hidden = true;
        state.target.setAttribute("aria-hidden", "true");
      }
    };

    const clearPreview = (animated = false) => {
      if (!previewState) return;
      const state = previewState;
      const token = ++previewToken;

      if (!animated || reduceMotion || !("animate" in state.current)) {
        cleanPreviewStyles(state);
        previewState = null;
        return;
      }

      const width = state.current.parentElement.clientWidth;
      const currentTransform = state.current.style.transform || "translate3d(0, 0, 0)";
      const targetTransform = state.target.style.transform;
      const targetRest = `translate3d(${state.direction * width}px, 0, 0)`;
      const options = { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" };
      const animations = [
        state.current.animate([
          { transform: currentTransform },
          { transform: "translate3d(0, 0, 0)" }
        ], options),
        state.target.animate([
          { transform: targetTransform, opacity: 1 },
          { transform: targetRest, opacity: 0.7 }
        ], options)
      ];
      state.animations = animations;

      Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
        if (token !== previewToken) return;
        cleanPreviewStyles(state);
        if (previewState === state) previewState = null;
      });
    };

    const commitPreview = async (updateHistory = true) => {
      if (!previewState) return;
      const state = previewState;
      const runId = ++transitionId;
      ++previewToken;
      activeId = state.target.id;

      if (activeId === "about") decodeAbout();
      state.current.setAttribute("aria-hidden", "true");
      state.target.hidden = false;
      state.target.removeAttribute("aria-hidden");
      state.target.scrollTop = 0;
      syncPanelHeight(state.target);
      setNavState(activeId);
      if (updateHistory) history.replaceState(null, "", `#${activeId}`);

      if (reduceMotion || !("animate" in state.current)) {
        cleanPreviewStyles(state);
        previewState = null;
        sections.forEach((section) => {
          section.hidden = section !== state.target;
          section.toggleAttribute("aria-hidden", section !== state.target);
        });
        return;
      }

      const width = state.current.parentElement.clientWidth;
      const currentTransform = state.current.style.transform || "translate3d(0, 0, 0)";
      const targetTransform = state.target.style.transform;
      const options = { duration: 430, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "both" };
      const animations = [
        state.current.animate([
          { transform: currentTransform, opacity: 1 },
          { transform: `translate3d(${-state.direction * width}px, 0, 0)`, opacity: 0.75 }
        ], options),
        state.target.animate([
          { transform: targetTransform, opacity: 1 },
          { transform: "translate3d(0, 0, 0)", opacity: 1 }
        ], options)
      ];
      state.animations = animations;

      await Promise.allSettled(animations.map((animation) => animation.finished));
      if (runId !== transitionId) return;
      cleanPreviewStyles(state);
      if (previewState === state) previewState = null;
      sections.forEach((section) => {
        section.hidden = section !== state.target;
        section.toggleAttribute("aria-hidden", section !== state.target);
      });
    };

    const previewPanel = (displacement) => {
      if (!activeId || Math.abs(displacement) < 2) return;
      const direction = displacement < 0 ? 1 : -1;
      const currentIndex = panelIds.indexOf(activeId);
      const targetIndex = (currentIndex + direction + panelIds.length) % panelIds.length;
      const current = document.getElementById(activeId);
      const target = document.getElementById(panelIds[targetIndex]);

      if (previewState && previewState.direction !== direction) clearPreview(false);
      if (!previewState) {
        previewState = { current, target, direction };
        target.hidden = false;
        target.setAttribute("aria-hidden", "true");
        target.scrollTop = 0;
      }

      const width = current.parentElement.clientWidth;
      const peekLimit = Math.min(180, width * 0.35);
      const shift = Math.sign(displacement) * Math.min(Math.abs(displacement), peekLimit);
      const targetShift = direction > 0 ? width + shift : -width + shift;

      current.style.transform = `translate3d(${shift}px, 0, 0)`;
      current.style.zIndex = "2";
      current.style.willChange = "transform";
      target.style.transform = `translate3d(${targetShift}px, 0, 0)`;
      target.style.opacity = "1";
      target.style.zIndex = "1";
      target.style.willChange = "transform";
    };

    const swipeThreshold = () => Math.min(130, Math.max(80, window.innerWidth * 0.2));
    const trackpadThreshold = () => Math.min(180, Math.max(110, window.innerWidth * 0.18));

    const showPanel = async (id, animated = true, updateHistory = true, direction = 1) => {
      if (!panelIds.includes(id) || id === activeId) return;
      clearPreview(false);
      const runId = ++transitionId;
      const previous = activeId ? document.getElementById(activeId) : null;
      const next = document.getElementById(id);
      activeId = id;

      if (id === "about") decodeAbout();

      next.hidden = false;
      next.removeAttribute("aria-hidden");
      next.scrollTop = 0;
      syncPanelHeight(next);
      setNavState(id);

      if (updateHistory) history.replaceState(null, "", `#${id}`);

      if (!animated || reduceMotion || !("animate" in next)) {
        sections.forEach((section) => { section.hidden = section !== next; });
        return;
      }

      const offset = direction < 0 ? -72 : 72;
      const options = { duration: 520, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" };
      const motions = [next.animate([
        { transform: `translate3d(${offset}px, 0, 0)`, opacity: 0.15 },
        { transform: "translate3d(0, 0, 0)", opacity: 1 }
      ], options)];

      if (previous) {
        previous.hidden = false;
        previous.setAttribute("aria-hidden", "true");
        motions.push(previous.animate([
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
          { transform: `translate3d(${-offset}px, 0, 0)`, opacity: 0.15 }
        ], options));
      }

      await Promise.allSettled(motions.map((motion) => motion.finished));
      if (runId !== transitionId) return;
      sections.forEach((section) => {
        section.getAnimations().forEach((animation) => animation.cancel());
        section.hidden = section !== next;
        section.toggleAttribute("aria-hidden", section !== next);
      });
    };

    sections.forEach((section) => {
      section.hidden = true;
      section.setAttribute("aria-hidden", "true");
    });

    if ("ResizeObserver" in window) {
      const panelResizeObserver = new ResizeObserver(() => {
        syncPanelHeight(activeId ? document.getElementById(activeId) : null);
      });
      sections.forEach((section) => panelResizeObserver.observe(section));
    }
    mobileLayout.addEventListener("change", () => {
      syncPanelHeight(activeId ? document.getElementById(activeId) : null);
    });

    navLinks.forEach((link) => {
      const id = idFromLink(link);
      if (!id) return;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        const currentIndex = panelIds.indexOf(activeId);
        const targetIndex = panelIds.indexOf(id);
        showPanel(id, true, true, targetIndex < currentIndex ? -1 : 1);
        const openMenu = document.querySelector("#navbarCollapse.show");
        const menuToggle = document.querySelector('.navbar-toggler[aria-expanded="true"]');
        if (openMenu && menuToggle) menuToggle.click();
      });
    });

    const swipeSurface = panelShell || document.querySelector("main.content");
    let touchStart = null;
    const interactiveSelector = "a, button, input, textarea, select, [contenteditable='true'], [data-no-section-swipe]";

    if (swipeSurface) {
      swipeSurface.addEventListener("touchstart", (event) => {
        if (event.touches.length !== 1 || event.target.closest(interactiveSelector)) {
          touchStart = null;
          return;
        }
        const touch = event.touches[0];
        touchStart = { x: touch.clientX, y: touch.clientY, time: performance.now() };
      }, { passive: true });

      swipeSurface.addEventListener("touchmove", (event) => {
        if (!touchStart || event.touches.length !== 1) return;
        const touch = event.touches[0];
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        if (Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
        event.preventDefault();
        previewPanel(deltaX);
      }, { passive: false });

      swipeSurface.addEventListener("touchend", (event) => {
        if (!touchStart || event.changedTouches.length !== 1) {
          touchStart = null;
          clearPreview(true);
          return;
        }

        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStart.x;
        const deltaY = touch.clientY - touchStart.y;
        const elapsed = performance.now() - touchStart.time;
        touchStart = null;

        if (elapsed > 1200 || Math.abs(deltaX) < swipeThreshold() || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
          clearPreview(true);
          return;
        }

        if (!previewState) previewPanel(deltaX);
        commitPreview(true);
      }, { passive: true });

      swipeSurface.addEventListener("touchcancel", () => {
        touchStart = null;
        clearPreview(true);
      }, { passive: true });

      let wheelDeltaX = 0;
      let wheelCommitted = false;
      let wheelEndTimer = 0;

      swipeSurface.addEventListener("wheel", (event) => {
        const scale = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1;
        const deltaX = event.deltaX * scale;
        const deltaY = event.deltaY * scale;

        if (Math.abs(deltaX) < 2 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
        event.preventDefault();

        clearTimeout(wheelEndTimer);
        wheelEndTimer = window.setTimeout(() => {
          if (!wheelCommitted) clearPreview(true);
          wheelDeltaX = 0;
          wheelCommitted = false;
        }, 70);

        if (wheelCommitted) return;
        wheelDeltaX += deltaX;
        previewPanel(-wheelDeltaX);
        if (Math.abs(wheelDeltaX) >= trackpadThreshold()) {
          wheelCommitted = true;
          commitPreview(true);
        }
      }, { passive: false });
    }

    window.addEventListener("hashchange", () => {
      const id = window.location.hash.slice(1);
      if (panelIds.includes(id)) {
        const currentIndex = panelIds.indexOf(activeId);
        const targetIndex = panelIds.indexOf(id);
        showPanel(id, true, false, targetIndex < currentIndex ? -1 : 1);
      }
    });

    const initialId = panelIds.includes(window.location.hash.slice(1)) ? window.location.hash.slice(1) : "about";
    showPanel(initialId, false, false);
  }

  function init() {
    const title = document.querySelector("h1.title");
    const subtitle = document.querySelector(".subtitle");
    if (title) scrambleText(title, title.textContent.trim(), 1500);
    if (subtitle) scrambleText(subtitle, subtitle.textContent.trim(), 1900);
    buildProfileDiffusion();
    initSectionPanels();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
</script>
