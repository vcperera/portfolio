
(function () {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DIR = "assets/memoji/track/";
  const FRAMES = ["c", "l", "r", "u", "d", "ul", "ur", "dl", "dr", "fl", "smile"];
  const FADE_MS = 130, MIN_SWITCH_MS = 170;

  function mount(host) {
    if (!host || host.__vish) return;
    host.__vish = true;

    host.style.cssText +=
      ";position:relative;aspect-ratio:1/1;overflow:visible;" +
      "-webkit-mask-image:radial-gradient(72% 72% at 50% 46%,#000 58%,transparent 92%);" +
      "mask-image:radial-gradient(72% 72% at 50% 46%,#000 58%,transparent 92%);";

    const imgs = {};
    for (const k of FRAMES) {
      const im = document.createElement("img");
      im.src = DIR + "g_" + k + ".webp";
      im.alt = "";
      im.draggable = false;
      im.decoding = "async";
      im.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;" +
        "opacity:0;transition:opacity " + FADE_MS + "ms ease;will-change:opacity;" +
        "user-select:none;pointer-events:none;";
      host.appendChild(im);
      imgs[k] = im;
    }
    imgs.c.style.opacity = "1";
    host.setAttribute("role", "img");
    host.setAttribute("aria-label", "Vishal's Memoji avatar — his eyes follow your cursor.");

    if (REDUCED) return;

    let active = "c", lastSwitch = 0;
    let px = 0.5, py = 0.45, hasPointer = false, lastInput = performance.now();
    let smileUntil = 0, nextWander = 0, wanderKey = "c";
    let cx = 0, cy = 0;

    function show(key, now) {
      if (key === active || now - lastSwitch < MIN_SWITCH_MS) return;
      imgs[key].style.opacity = "1";
      imgs[active].style.opacity = "0";
      active = key;
      lastSwitch = now;
    }

    function zone() {
      const r = host.getBoundingClientRect();
      const ax = r.left + r.width / 2, ay = r.top + r.height / 2;
      const nx = (px * innerWidth - ax) / (innerWidth * 0.5);
      const ny = (py * innerHeight - ay) / (innerHeight * 0.5);
      const m = Math.hypot(nx, ny);
      if (m < 0.14) return "c";
      if (nx < -0.72 && Math.abs(ny) < 0.4) return "fl";
      const a = Math.atan2(ny, nx) * 180 / Math.PI;
      if (a >= -22 && a < 22) return "r";
      if (a >= 22 && a < 68) return "dr";
      if (a >= 68 && a < 112) return "d";
      if (a >= 112 && a < 158) return "dl";
      if (a >= 158 || a < -158) return "l";
      if (a >= -158 && a < -112) return "ul";
      if (a >= -112 && a < -68) return "u";
      return "ur";
    }

    function pointerMove(e) {
      const t = e.touches ? e.touches[0] : e;
      if (!t) return;
      px = t.clientX / innerWidth;
      py = t.clientY / innerHeight;
      hasPointer = true;
      lastInput = performance.now();
    }
    addEventListener("pointermove", pointerMove, { passive: true });
    addEventListener("touchmove", pointerMove, { passive: true });

    host.style.cursor = "pointer";
    host.addEventListener("pointerdown", () => {
      const now = performance.now();
      lastInput = now;
      smileUntil = now + 1400;
      imgs.smile.style.opacity = "1";
      imgs[active].style.opacity = "0";
      active = "smile";
      lastSwitch = now;
      if (navigator.vibrate) { try { navigator.vibrate(8); } catch (_) {} }
    });

    let onScreen = true, raf = 0, lastT = performance.now();
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((en) => {
        onScreen = en[0].isIntersecting;
        if (onScreen && !raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
      }, { threshold: 0.05 }).observe(host);
    }
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && onScreen && !raf) { lastT = performance.now(); raf = requestAnimationFrame(frame); }
    });

    function frame(now) {
      raf = 0;
      if (document.hidden || !onScreen) return;
      const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;

      const idleFor = now - lastInput;
      let key;

      if (now < smileUntil) {
        key = "smile";
      } else if (hasPointer && idleFor < 4000) {
        key = zone();
      } else {
        if (now > nextWander) {
          nextWander = now + 2600 + Math.random() * 2900;
          const pool = ["c", "c", "c", "l", "r", "u", "ul", "ur", "d"];
          wanderKey = Math.random() < 0.07 ? "smile" : pool[(Math.random() * pool.length) | 0];
          if (wanderKey === "smile") smileUntil = now + 1200;
        }
        key = wanderKey;
      }
      show(key, now);

      const gx = hasPointer ? (px - 0.5) * 2 : 0;
      const gy = hasPointer ? (py - 0.45) * 2 : 0;
      cx += (gx - cx) * Math.min(1, 3.5 * dt);
      cy += (gy - cy) * Math.min(1, 3.5 * dt);
      const breathe = Math.sin(now / 1900) * 3;
      host.style.transform = `translate(${(cx * 12).toFixed(1)}px,${(cy * 9 + breathe).toFixed(1)}px)`;

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
  }

  function boot() {
    const el = document.getElementById("vish-avatar");
    if (el) mount(el);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.VishAvatar = { mount };
})();
