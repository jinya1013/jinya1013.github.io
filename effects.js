<script>
(() => {
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
    const status = document.createElement("span");
    status.className = "diffusion-status";
    status.setAttribute("aria-hidden", "true");
    status.textContent = "t=1000  noise=1.00";
    wrapper.append(field, status);

    if (reduceMotion) { wrapper.classList.add("is-complete"); return; }
    const duration = 2400;
    const start = performance.now() + 180;
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
        status.textContent = `t=${String(Math.round((1 - progress) * 1000)).padStart(4, "0")}  noise=${(1 - eased).toFixed(2)}`;
        image.style.opacity = String(0.18 + eased * 0.82);
        image.style.filter = `blur(${(1 - eased) * 18}px) saturate(${0.25 + eased * 0.8}) contrast(1.08)`;
        lastShuffle = now;
      }
      if (progress < 1) requestAnimationFrame(denoise);
      else { image.removeAttribute("style"); wrapper.classList.add("is-complete"); }
    };
    requestAnimationFrame(denoise);
  }

  function init() {
    const title = document.querySelector("h1.title");
    const subtitle = document.querySelector(".subtitle");
    if (title) scrambleText(title, title.textContent.trim(), 1500);
    if (subtitle) scrambleText(subtitle, subtitle.textContent.trim(), 1900);
    buildProfileDiffusion();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
</script>
