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
    let activeId = null;
    let transitionId = 0;

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

    const showPanel = async (id, animated = true, updateHistory = true) => {
      if (!panelIds.includes(id) || id === activeId) return;
      const runId = ++transitionId;
      const previous = activeId ? document.getElementById(activeId) : null;
      const next = document.getElementById(id);
      activeId = id;

      if (id === "about") decodeAbout();

      next.hidden = false;
      next.removeAttribute("aria-hidden");
      next.scrollTop = 0;
      setNavState(id);

      if (updateHistory) history.replaceState(null, "", `#${id}`);

      if (!animated || reduceMotion || !("animate" in next)) {
        sections.forEach((section) => { section.hidden = section !== next; });
        return;
      }

      const options = { duration: 520, easing: "cubic-bezier(0.65, 0, 0.35, 1)", fill: "both" };
      const motions = [next.animate([
        { transform: "translate3d(72px, 0, 0)", opacity: 0.15 },
        { transform: "translate3d(0, 0, 0)", opacity: 1 }
      ], options)];

      if (previous) {
        previous.hidden = false;
        previous.setAttribute("aria-hidden", "true");
        motions.push(previous.animate([
          { transform: "translate3d(0, 0, 0)", opacity: 1 },
          { transform: "translate3d(-72px, 0, 0)", opacity: 0.15 }
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

    navLinks.forEach((link) => {
      const id = idFromLink(link);
      if (!id) return;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showPanel(id);
      });
    });

    window.addEventListener("hashchange", () => {
      const id = window.location.hash.slice(1);
      if (panelIds.includes(id)) showPanel(id, true, false);
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
