/* ==========================================================================
   VC.PERERA — COSMIC DESCENT UNDERLAY
   --------------------------------------------------------------------------
   A procedural, scroll-aware space environment.

   Concept: the page is a descent. At ALT 100% you float in deep space —
   layered starfields, a milky-way band, and unique-scale phenomena drift
   past as you fall: nebulae, spiral galaxies, a gravitationally-lensed
   black hole, comets, asteroid fields, ringed gas giants, star clusters,
   and Hubble-deep-field smudges. As ALT approaches 0%, an atmosphere
   ignites at the horizon and you land on an alien world — a different
   landscape on every page.

   Layers (all pointer-events:none, behind content):
     z:-2  fixed backdrop  — gradient sky, parallax starfields, milky way,
                             meteors, altitude-based atmosphere glow
     z:-1  document layer  — phenomena patches distributed down the scroll
                             + planetary landscape anchored at ALT 0%
   Zero dependencies. Respects prefers-reduced-motion.
   ========================================================================== */

(function () {
  "use strict";

  var REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- rng -- */
  function mulberry(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hsla(h, s, l, a) {
    return "hsla(" + (((h % 360) + 360) % 360) + "," + s + "%," + l + "%," + a + ")";
  }

  /* ------------------------------------------------------- page identity -- */
  var P = location.pathname.toLowerCase();
  var PAGE = P.indexOf("featured") > -1 ? "featured"
           : P.indexOf("projects") > -1 ? "projects"
           : P.indexOf("accolades") > -1 ? "certs" : "home";

  /* Each page: its own seed, nebula palette, phenomena lineup, horizon
     atmosphere and landscape at ALT 0%. Same universe, different world.   */
  var CFG = {
    home: {
      seed: 11,
      pal: [200, 262],                       // teal → violet nebulae
      horizon: [197, 72, 58], horizon2: [168, 78, 52],
      lineup: ["nebula", "galaxy", "cluster", "blackhole", "comet",
               "asteroids", "planet", "meteor", "cluster"],
      landscape: "spires"
    },
    featured: {
      seed: 23,
      pal: [330, 380],                       // magenta → warm pink
      horizon: [20, 82, 56], horizon2: [40, 88, 58],
      lineup: ["comet", "nebula", "galaxy", "asteroids", "cluster", "meteor"],
      landscape: "mesa"
    },
    projects: {
      seed: 37,
      pal: [255, 305],                       // violet → magenta
      horizon: [262, 68, 60], horizon2: [300, 66, 56],
      lineup: ["blackhole", "nebula", "cluster", "planet", "galaxy", "meteor"],
      landscape: "ice"
    },
    certs: {
      seed: 53,
      pal: [160, 210],                       // aurora green → cyan
      horizon: [158, 62, 50], horizon2: [190, 72, 52],
      lineup: ["galaxy", "comet", "nebula", "asteroids", "cluster", "meteor"],
      landscape: "dunes"
    }
  }[PAGE];

  /* =====================================================================
     SHARED PAINT HELPERS
     ===================================================================== */
  function puff(g, x, y, r, h, s, l, a) {
    if (r <= 0) return;
    var gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, hsla(h, s, l, a));
    gr.addColorStop(1, hsla(h, s, l, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  /* A bright star with diffraction spikes (JWST style). */
  function spikeStar(g, x, y, r, h, a) {
    var gr = g.createRadialGradient(x, y, 0, x, y, r * 3);
    gr.addColorStop(0, "hsla(0,0%,100%," + a + ")");
    gr.addColorStop(0.25, hsla(h, 70, 82, a * 0.5));
    gr.addColorStop(1, hsla(h, 70, 70, 0));
    g.fillStyle = gr;
    g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6);
    var L = r * 7;
    for (var i = 0; i < 2; i++) {
      g.save();
      g.translate(x, y);
      g.rotate(i * Math.PI / 2);
      var sg = g.createLinearGradient(-L, 0, L, 0);
      sg.addColorStop(0, "hsla(0,0%,100%,0)");
      sg.addColorStop(0.5, "hsla(0,0%,100%," + a * 0.85 + ")");
      sg.addColorStop(1, "hsla(0,0%,100%,0)");
      g.fillStyle = sg;
      g.fillRect(-L, -r * 0.22, L * 2, r * 0.44);
      g.restore();
    }
    for (i = 0; i < 2; i++) {
      g.save();
      g.translate(x, y);
      g.rotate(Math.PI / 4 + i * Math.PI / 2);
      var dg = g.createLinearGradient(-L * 0.55, 0, L * 0.55, 0);
      dg.addColorStop(0, "hsla(0,0%,100%,0)");
      dg.addColorStop(0.5, "hsla(0,0%,100%," + a * 0.4 + ")");
      dg.addColorStop(1, "hsla(0,0%,100%,0)");
      g.fillStyle = dg;
      g.fillRect(-L * 0.55, -r * 0.14, L * 1.1, r * 0.28);
      g.restore();
    }
  }

  function dustStars(g, R, w, h, n) {
    for (var i = 0; i < n; i++) {
      g.fillStyle = hsla(190 + R() * 90, 55, 86, 0.05 + R() * 0.16);
      var s = 0.5 + R();
      g.fillRect(R() * w, R() * h, s, s);
    }
  }

  /* =====================================================================
     PHENOMENA PAINTERS  (square canvases, additive glow)
     ===================================================================== */

  function paintNebula(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    var cx = w / 2, cy = w / 2, pal = CFG.pal;
    var hA = pal[0] + (pal[1] - pal[0]) * R(), hB = pal[0] + (pal[1] - pal[0]) * R();
    g.globalCompositeOperation = "lighter";
    for (var i = 0; i < 36; i++) {
      var a = R() * TAU, rr = Math.pow(R(), 0.62) * w * 0.33;
      puff(g, cx + Math.cos(a) * rr * (0.7 + R() * 0.6),
              cy + Math.sin(a) * rr * (0.55 + R() * 0.55),
           w * (0.10 + R() * 0.17), hA + (hB - hA) * R(),
           60 + R() * 22, 44 + R() * 14, 0.010 + R() * 0.016);
    }
    /* bright filament spine */
    var fa = R() * TAU, fx = cx + (R() - 0.5) * w * 0.2, fy = cy + (R() - 0.5) * w * 0.2;
    for (i = 0; i < 26; i++) {
      var t = i / 26, wob = Math.sin(t * 9 + seed) * w * 0.05;
      puff(g, fx + Math.cos(fa) * (t - 0.5) * w * 0.52 + Math.cos(fa + 1.57) * wob,
              fy + Math.sin(fa) * (t - 0.5) * w * 0.52 + Math.sin(fa + 1.57) * wob,
           w * (0.028 + R() * 0.045), hB, 72, 66, 0.032);
    }
    /* dark dust lane */
    g.globalCompositeOperation = "source-over";
    var da = fa + 0.5 + R();
    for (i = 0; i < 16; i++) {
      var t2 = i / 16;
      var dx = cx + Math.cos(da) * (t2 - 0.5) * w * 0.55 + (R() - 0.5) * w * 0.06;
      var dy = cy + Math.sin(da) * (t2 - 0.5) * w * 0.35 + (R() - 0.5) * w * 0.06;
      var r2 = w * (0.035 + R() * 0.05);
      var gr = g.createRadialGradient(dx, dy, 0, dx, dy, r2);
      gr.addColorStop(0, "rgba(3,4,9," + (0.15 + R() * 0.13) + ")");
      gr.addColorStop(1, "rgba(3,4,9,0)");
      g.fillStyle = gr; g.fillRect(dx - r2, dy - r2, r2 * 2, r2 * 2);
    }
    /* newborn stars inside the cloud */
    g.globalCompositeOperation = "lighter";
    for (i = 0; i < 5; i++)
      spikeStar(g, cx + (R() - 0.5) * w * 0.5, cy + (R() - 0.5) * w * 0.5,
                w * (0.009 + R() * 0.011), hB, 0.45 + R() * 0.3);
    dustStars(g, R, w, w, 30);
  }

  function paintGalaxy(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    var cx = w / 2, cy = w / 2, pal = CFG.pal;
    var hueA = pal[0] + (pal[1] - pal[0]) * R(), hueB = 30 + R() * 26; /* golden core */
    g.globalCompositeOperation = "lighter";
    g.save();
    g.translate(cx, cy);
    g.rotate(R() * Math.PI);
    g.scale(1, 0.36 + R() * 0.20);
    var arms = 2, turns = 2.3 + R() * 0.5, steps = 170, maxR = w * 0.31;
    /* faint halo */
    puff(g, 0, 0, maxR * 1.25, hueA, 40, 55, 0.05);
    for (var s2 = 0; s2 < arms; s2++) {
      var offA = s2 * Math.PI;
      for (var k = 0; k < steps; k++) {
        var t = k / steps;
        var ang = offA + t * turns * TAU;
        var rad = Math.pow(t, 0.82) * maxR;
        var jx = (R() - 0.5) * rad * 0.14, jy = (R() - 0.5) * rad * 0.14;
        puff(g, Math.cos(ang) * rad + jx, Math.sin(ang) * rad + jy,
             w * (0.018 + 0.05 * (1 - t)),
             hueB + (hueA - hueB) * t, 55 + R() * 22, 58 + R() * 16,
             0.017 * (1 - t) + 0.004);
        if (R() > 0.86)
          puff(g, Math.cos(ang) * rad + jx, Math.sin(ang) * rad + jy,
               w * 0.006, 210, 30, 92, 0.20);
      }
    }
    /* dust lane hugging the arms */
    g.globalCompositeOperation = "source-over";
    for (k = 0; k < 70; k++) {
      var t3 = k / 70, ang3 = t3 * turns * TAU + 0.35;
      var rad3 = Math.pow(t3, 0.82) * maxR;
      var r3 = w * (0.008 + 0.02 * (1 - t3));
      var gx = Math.cos(ang3) * rad3, gy = Math.sin(ang3) * rad3;
      var gr3 = g.createRadialGradient(gx, gy, 0, gx, gy, r3);
      gr3.addColorStop(0, "rgba(3,4,9," + 0.14 * (1 - t3) + ")");
      gr3.addColorStop(1, "rgba(3,4,9,0)");
      g.fillStyle = gr3; g.fillRect(gx - r3, gy - r3, r3 * 2, r3 * 2);
    }
    /* blazing core */
    g.globalCompositeOperation = "lighter";
    puff(g, 0, 0, w * 0.11, hueB, 65, 70, 0.30);
    puff(g, 0, 0, w * 0.045, hueB, 35, 92, 0.55);
    g.restore();
    dustStars(g, R, w, w, 26);
  }

  /* Gravitationally-lensed black hole, Gargantua-grade.
     Physical ordering matters: background stars are painted FIRST so the
     event-horizon shadow can occlude them (no light escapes), the near
     side of the disk then sweeps in front of the shadow, and the photon
     ring — light orbiting the hole itself — is the one continuous, razor
     -thin circle drawn on top of everything, exactly as in the render. */
  function paintBlackHole(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    var cx = w / 2, cy = w / 2, r = w * 0.105;
    var tilt = -0.14 + (R() - 0.5) * 0.10;
    /* backdrop stars first — occluded by the shadow, never inside it */
    g.globalCompositeOperation = "lighter";
    dustStars(g, R, w, w, 26);
    puff(g, cx, cy, w * 0.42, 222, 42, 55, 0.045);
    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);

    function diskStrokes(alphaMul) {
      for (var i = 0; i < 60; i++) {
        var t = i / 60;
        var rad = r * 1.22 + t * (w * 0.315 - r * 1.22);
        g.strokeStyle = hsla(36 - 18 * t, 90, 84 - 46 * t, ((1 - t) * 0.09 + 0.006) * alphaMul);
        g.lineWidth = w * 0.005 * (1 - t) + w * 0.0012;
        g.beginPath();
        g.ellipse(0, 0, rad, rad * 0.16, 0, 0, TAU);
        g.stroke();
      }
      /* white-hot midplane of the disk */
      g.strokeStyle = "hsla(38,95%,90%," + (0.22 * alphaMul) + ")";
      g.lineWidth = w * 0.004;
      g.beginPath();
      g.ellipse(0, 0, r * 1.55, r * 1.55 * 0.16, 0, 0, TAU);
      g.stroke();
    }
    diskStrokes(1);

    /* lensed arcs — disk light bent over and under the shadow */
    for (var i = 0; i < 26; i++) {
      var t3 = i / 26, rad2 = r * 1.12 + t3 * r * 0.85;
      g.strokeStyle = hsla(33 + t3 * 12, 92, 82 - 42 * t3, (1 - t3) * 0.085);
      g.lineWidth = r * 0.045 * (1 - t3) + 0.5;
      g.beginPath(); g.arc(0, 0, rad2, 0, TAU); g.stroke();
    }
    /* doppler beaming — the approaching side burns brighter */
    var db = g.createRadialGradient(-r * 2.0, 0, 0, -r * 2.0, 0, r * 2.4);
    db.addColorStop(0, "hsla(42,100%,88%,0.28)");
    db.addColorStop(1, "hsla(42,100%,70%,0)");
    g.fillStyle = db;
    g.fillRect(-r * 4.6, -r * 2.4, r * 5.0, r * 4.8);

    /* event-horizon shadow — fully opaque; nothing shines inside */
    g.globalCompositeOperation = "source-over";
    var sh = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.02);
    sh.addColorStop(0, "#000205");
    sh.addColorStop(0.965, "#000205");
    sh.addColorStop(1, "rgba(0,2,5,0)");
    g.fillStyle = sh;
    g.beginPath(); g.arc(0, 0, r * 1.02, 0, TAU); g.fill();

    /* the near side of the disk sweeps in front of the shadow */
    g.globalCompositeOperation = "lighter";
    g.save();
    g.beginPath();
    g.rect(-w, r * 0.05, w * 2, w);
    g.clip();
    diskStrokes(0.85);
    g.restore();

    /* the photon ring — one continuous, razor-thin circle of orbiting
       light, drawn last so it is unbroken over disk and shadow alike */
    g.strokeStyle = "hsla(43,90%,95%,0.9)";
    g.lineWidth = Math.max(1.2, r * 0.018);
    g.beginPath(); g.arc(0, 0, r * 1.05, 0, TAU); g.stroke();
    g.strokeStyle = "hsla(38,90%,85%,0.22)";
    g.lineWidth = Math.max(2.5, r * 0.05);
    g.beginPath(); g.arc(0, 0, r * 1.06, 0, TAU); g.stroke();

    g.restore();
  }

  function paintComet(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    var hx = w * (0.62 + R() * 0.18), hy = w * (0.28 + R() * 0.2);
    var ang = Math.PI * (0.7 + R() * 0.25);           /* tail points up-left-ish */
    var len = w * (0.5 + R() * 0.2);
    g.globalCompositeOperation = "lighter";
    /* ion tail — straight, blue, narrow, sharply defined */
    for (var c = 0; c < 46; c++) {
      var t = c / 46;
      puff(g, hx - Math.cos(ang) * len * t + (R() - 0.5) * w * 0.006,
              hy - Math.sin(ang) * len * t + (R() - 0.5) * w * 0.006,
           w * (0.005 + 0.010 * (1 - t)), 205, 85, 74, 0.065 * (1 - t));
    }
    /* crisp ion-tail core line */
    var tx2 = hx - Math.cos(ang) * len, ty2 = hy - Math.sin(ang) * len;
    var lgc = g.createLinearGradient(hx, hy, tx2, ty2);
    lgc.addColorStop(0, "hsla(200,90%,92%,0.5)");
    lgc.addColorStop(1, "hsla(210,80%,70%,0)");
    g.strokeStyle = lgc;
    g.lineWidth = Math.max(1, w * 0.0035);
    g.beginPath(); g.moveTo(hx, hy); g.lineTo(tx2, ty2); g.stroke();
    /* dust tail — curved, warm, broader but restrained */
    for (c = 0; c < 40; c++) {
      var t2 = c / 40, curve = t2 * t2 * w * 0.14;
      puff(g, hx - Math.cos(ang) * len * 0.85 * t2 + Math.cos(ang + 1.57) * curve,
              hy - Math.sin(ang) * len * 0.85 * t2 + Math.sin(ang + 1.57) * curve,
           w * (0.009 + 0.022 * (1 - t2)), 46, 62, 74, 0.026 * (1 - t2));
    }
    /* compact coma + hard bright nucleus */
    puff(g, hx, hy, w * 0.035, 195, 60, 84, 0.32);
    puff(g, hx, hy, w * 0.012, 195, 25, 97, 0.85);
    dustStars(g, R, w, w, 28);
  }

  /* A static, sharply-drawn meteor — a frozen streak of entry fire. */
  function paintMeteor(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    g.globalCompositeOperation = "lighter";
    dustStars(g, R, w, w, 18);
    var n = 1 + ((R() * 2) | 0);
    for (var m = 0; m < n; m++) {
      var x0 = w * (0.3 + R() * 0.45), y0 = w * (0.25 + R() * 0.3);
      var ang = Math.PI * (0.62 + R() * 0.24);
      var len = w * (0.38 + R() * 0.22) * (m ? 0.55 : 1);
      var x1 = x0 - Math.cos(ang) * len, y1 = y0 - Math.sin(ang) * len;
      var lg2 = g.createLinearGradient(x0, y0, x1, y1);
      lg2.addColorStop(0, "hsla(45,90%,88%," + (m ? 0.55 : 0.85) + ")");
      lg2.addColorStop(0.14, "hsla(28,85%,68%,0.4)");
      lg2.addColorStop(1, "hsla(220,60%,60%,0)");
      g.strokeStyle = lg2;
      g.lineCap = "round";
      g.lineWidth = Math.max(1.2, w * 0.006) * (m ? 0.6 : 1);
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      /* hot white core near the head */
      g.strokeStyle = "hsla(0,0%,100%,0.55)";
      g.lineWidth = Math.max(0.6, w * 0.002);
      g.beginPath();
      g.moveTo(x0, y0);
      g.lineTo(x0 - (x0 - x1) * 0.35, y0 - (y0 - y1) * 0.35);
      g.stroke();
      puff(g, x0, y0, w * 0.02, 40, 80, 78, 0.45);
      puff(g, x0, y0, w * 0.006, 40, 30, 97, 0.9);
    }
  }

  /* A dense asteroid belt spanning the full page width — rocks crowd the
     midplane and thin out with distance, one shared sun angle. */
  function paintBelt(cv, seed) {
    var w = cv.width, h = cv.height, g = cv.getContext("2d"), R = mulberry(seed);
    var ang = -(0.05 + R() * 0.05), cy = h * 0.5, sunA = -Math.PI / 3;
    g.save();
    g.translate(0, cy);
    g.rotate(ang);
    /* faint dust plane */
    g.globalCompositeOperation = "lighter";
    for (var i = 0; i < 60; i++) {
      puff(g, R() * w * 1.1 - w * 0.05, (R() - 0.5) * h * 0.45 * Math.pow(R(), 0.6),
           h * (0.05 + R() * 0.10), 222, 22, 60, 0.007 + R() * 0.010);
    }
    g.globalCompositeOperation = "source-over";
    /* far rocks — dense specks hugging the midplane */
    var nFar = Math.round(w / 12);
    for (i = 0; i < nFar; i++) {
      var fx = R() * w, fy = (R() + R() - 1) * h * 0.20;
      var fr = 0.6 + Math.pow(R(), 2.2) * 2.6;
      g.fillStyle = hsla(222, 10, 28 + R() * 26, 0.45 + R() * 0.4);
      g.beginPath(); g.arc(fx, fy, fr, 0, TAU); g.fill();
    }
    /* mid + near rocks — shaded polygons with craters and rim light */
    var nRock = Math.round(w / 90) + 4;
    for (i = 0; i < nRock; i++) {
      var near = R() > 0.72;
      var x = R() * w, y = (R() + R() - 1) * h * (near ? 0.34 : 0.22);
      var r = near ? h * (0.035 + R() * 0.055) : h * (0.010 + R() * 0.022);
      var verts = 9 + ((R() * 4) | 0);
      g.save();
      g.translate(x, y);
      g.rotate(R() * TAU);
      g.beginPath();
      for (var v = 0; v <= verts; v++) {
        var va = v / verts * TAU, vr = r * (0.72 + R() * 0.5);
        v === 0 ? g.moveTo(Math.cos(va) * vr, Math.sin(va) * vr)
                : g.lineTo(Math.cos(va) * vr, Math.sin(va) * vr);
      }
      g.closePath();
      var lg3 = g.createLinearGradient(Math.cos(sunA) * r, Math.sin(sunA) * r,
                                       -Math.cos(sunA) * r, -Math.sin(sunA) * r);
      lg3.addColorStop(0, "hsl(222,12%," + (near ? 52 : 40) + "%)");
      lg3.addColorStop(0.55, "hsl(224,14%,18%)");
      lg3.addColorStop(1, "hsl(226,16%,7%)");
      g.fillStyle = lg3;
      g.fill();
      if (near) {
        for (var cN = 0; cN < 3; cN++) {
          var ca = R() * TAU, cr2 = r * (0.14 + R() * 0.2);
          g.fillStyle = "rgba(5,7,12," + (0.25 + R() * 0.25) + ")";
          g.beginPath();
          g.ellipse(Math.cos(ca) * r * 0.45, Math.sin(ca) * r * 0.45,
                    cr2, cr2 * (0.6 + R() * 0.4), R() * TAU, 0, TAU);
          g.fill();
        }
        g.strokeStyle = "hsla(210,30%,80%,0.28)";
        g.lineWidth = Math.max(0.6, r * 0.05);
        g.beginPath(); g.arc(0, 0, r * 0.92, sunA - 1.1, sunA + 1.1); g.stroke();
      }
      g.restore();
    }
    g.restore();
  }

  function paintAsteroids(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    var sunA = R() * TAU;
    g.globalCompositeOperation = "lighter";
    dustStars(g, R, w, w, 34);
    g.globalCompositeOperation = "source-over";
    var n = 6 + Math.round(R() * 4);
    for (var i = 0; i < n; i++) {
      var x = w * (0.12 + R() * 0.76), y = w * (0.12 + R() * 0.76);
      var r = w * (0.020 + Math.pow(R(), 1.6) * 0.055);
      var verts = 9 + Math.round(R() * 4);
      g.save();
      g.translate(x, y);
      g.rotate(R() * TAU);
      g.beginPath();
      for (var v = 0; v <= verts; v++) {
        var va = v / verts * TAU;
        var vr = r * (0.72 + R() * 0.5);
        v === 0 ? g.moveTo(Math.cos(va) * vr, Math.sin(va) * vr)
                : g.lineTo(Math.cos(va) * vr, Math.sin(va) * vr);
      }
      g.closePath();
      var lg = g.createLinearGradient(Math.cos(sunA) * r, Math.sin(sunA) * r,
                                      -Math.cos(sunA) * r, -Math.sin(sunA) * r);
      lg.addColorStop(0, "hsl(222,12%," + (46 + R() * 12) + "%)");
      lg.addColorStop(0.55, "hsl(224,14%,20%)");
      lg.addColorStop(1, "hsl(226,16%,8%)");
      g.fillStyle = lg;
      g.fill();
      /* craters */
      for (var cN = 0; cN < 3; cN++) {
        var ca = R() * TAU, cr2 = r * (0.14 + R() * 0.2);
        var cx2 = Math.cos(ca) * r * 0.45, cy2 = Math.sin(ca) * r * 0.45;
        g.fillStyle = "rgba(5,7,12," + (0.25 + R() * 0.25) + ")";
        g.beginPath(); g.ellipse(cx2, cy2, cr2, cr2 * (0.6 + R() * 0.4), R() * TAU, 0, TAU); g.fill();
      }
      /* sun-kissed rim */
      g.strokeStyle = "hsla(210,30%,80%," + (0.18 + R() * 0.15) + ")";
      g.lineWidth = Math.max(0.6, r * 0.05);
      g.beginPath();
      g.arc(0, 0, r * 0.92, sunA - 1.1, sunA + 1.1);
      g.stroke();
      g.restore();
    }
  }

  function paintPlanet(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    var cx = w / 2, cy = w / 2, pr = w * 0.155;
    var tilt = -0.32 + R() * 0.18, baseH = CFG.pal[0] + (CFG.pal[1] - CFG.pal[0]) * R();
    g.save();
    g.translate(cx, cy);
    g.rotate(tilt);

    function rings(front) {
      g.save();
      g.beginPath();
      g.rect(-w, front ? 0 : -w, w * 2, w);
      g.clip();
      for (var i = 0; i < 30; i++) {
        var t = i / 30;
        if (t > 0.42 && t < 0.52) continue;          /* Cassini gap */
        var rad = pr * (1.38 + t * 1.05);
        g.strokeStyle = hsla(baseH + 20, 30, 68, (0.05 + 0.10 * Math.sin(t * Math.PI)) * (front ? 1 : 0.55));
        g.lineWidth = pr * 0.035;
        g.beginPath();
        g.ellipse(0, 0, rad, rad * 0.24, 0, 0, TAU);
        g.stroke();
      }
      g.restore();
    }
    rings(false);

    /* the globe */
    var sp = g.createRadialGradient(-pr * 0.4, -pr * 0.4, pr * 0.1, 0, 0, pr);
    sp.addColorStop(0, hsla(baseH, 45, 62, 1));
    sp.addColorStop(0.7, hsla(baseH + 14, 50, 34, 1));
    sp.addColorStop(1, hsla(baseH + 24, 55, 12, 1));
    g.fillStyle = sp;
    g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.fill();

    /* latitudinal bands */
    g.save();
    g.beginPath(); g.arc(0, 0, pr, 0, TAU); g.clip();
    for (var b = 0; b < 12; b++) {
      var by = -pr + (b + 0.5) / 12 * pr * 2;
      g.fillStyle = hsla(baseH + (R() - 0.5) * 30, 40, 40 + R() * 26, 0.05 + R() * 0.10);
      var bh = pr * (0.05 + R() * 0.10);
      g.beginPath();
      g.ellipse(0, by + Math.sin(b * 2.7) * pr * 0.03, pr * 1.02, bh, 0, 0, TAU);
      g.fill();
    }
    /* ring shadow across the globe */
    g.fillStyle = "rgba(3,4,9,0.35)";
    g.beginPath();
    g.ellipse(0, -pr * 0.28, pr * 1.1, pr * 0.09, 0.06, 0, TAU);
    g.fill();
    /* terminator */
    var tg = g.createLinearGradient(-pr, 0, pr, 0);
    tg.addColorStop(0, "rgba(3,4,9,0)");
    tg.addColorStop(0.62, "rgba(3,4,9,0)");
    tg.addColorStop(1, "rgba(3,4,9,0.8)");
    g.fillStyle = tg;
    g.fillRect(-pr, -pr, pr * 2, pr * 2);
    g.restore();

    /* thin atmosphere limb */
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = hsla(baseH - 10, 70, 75, 0.25);
    g.lineWidth = pr * 0.03;
    g.beginPath(); g.arc(0, 0, pr * 1.01, Math.PI * 0.55, Math.PI * 1.55); g.stroke();
    g.globalCompositeOperation = "source-over";

    rings(true);
    g.restore();

    /* moons */
    g.globalCompositeOperation = "lighter";
    for (var m = 0; m < 2; m++) {
      var ma = R() * TAU, md = pr * (2.9 + R() * 1.3), mr = pr * (0.06 + R() * 0.07);
      var mx = cx + Math.cos(ma) * md, my = cy + Math.sin(ma) * md * 0.5;
      var mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);
      mg.addColorStop(0, "hsla(220,15%,80%,0.9)");
      mg.addColorStop(1, "hsla(222,18%,30%,0)");
      g.fillStyle = mg;
      g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
    }
    dustStars(g, mulberry(seed + 5), w, w, 26);
  }

  function paintCluster(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    var cx = w / 2, cy = w / 2;
    g.globalCompositeOperation = "lighter";
    puff(g, cx, cy, w * 0.3, 215, 45, 60, 0.05);
    puff(g, cx, cy, w * 0.16, 215, 50, 70, 0.06);
    var n = 70 + Math.round(R() * 30);
    for (var i = 0; i < n; i++) {
      /* gaussian-ish scatter */
      var gx = cx + (R() + R() + R() - 1.5) / 1.5 * w * 0.26;
      var gy = cy + (R() + R() + R() - 1.5) / 1.5 * w * 0.26;
      var hue2 = R() < 0.25 ? 30 + R() * 20 : 200 + R() * 40;
      var sr = 0.4 + Math.pow(R(), 2.4) * 2.2;
      g.fillStyle = hsla(hue2, 60, 86, 0.25 + R() * 0.5);
      g.beginPath(); g.arc(gx, gy, sr, 0, TAU); g.fill();
      if (R() > 0.94) puff(g, gx, gy, sr * 6, hue2, 70, 76, 0.14);
    }
    for (i = 0; i < 5; i++)
      spikeStar(g, cx + (R() - 0.5) * w * 0.4, cy + (R() - 0.5) * w * 0.4,
                w * (0.008 + R() * 0.010), R() < 0.4 ? 38 : 210, 0.5 + R() * 0.3);
  }

  /* Hubble deep field — a pocket of tiny remote galaxies. */
  function paintDeepField(cv, seed) {
    var w = cv.width, g = cv.getContext("2d"), R = mulberry(seed);
    g.globalCompositeOperation = "lighter";
    var n = 9 + Math.round(R() * 6);
    for (var i = 0; i < n; i++) {
      var x = w * (0.1 + R() * 0.8), y = w * (0.1 + R() * 0.8);
      var r = w * (0.010 + R() * 0.030);
      var hue2 = CFG.pal[0] + (CFG.pal[1] - CFG.pal[0]) * R();
      g.save();
      g.translate(x, y);
      g.rotate(R() * TAU);
      g.scale(1, 0.3 + R() * 0.5);
      puff(g, 0, 0, r, hue2, 50, 66, 0.16 + R() * 0.18);
      puff(g, 0, 0, r * 0.35, 40, 45, 84, 0.22);
      g.restore();
    }
    dustStars(g, R, w, w, 20);
  }

  var PAINTERS = {
    nebula:    { fn: paintNebula,    sz: [340, 560] },
    galaxy:    { fn: paintGalaxy,    sz: [320, 540] },
    blackhole: { fn: paintBlackHole, sz: [420, 620] },
    comet:     { fn: paintComet,     sz: [260, 420] },
    asteroids: { fn: paintAsteroids, sz: [280, 460] },
    planet:    { fn: paintPlanet,    sz: [380, 600] },
    cluster:   { fn: paintCluster,   sz: [220, 380] },
    deepfield: { fn: paintDeepField, sz: [140, 240] },
    meteor:    { fn: paintMeteor,    sz: [220, 360] }
  };

  /* =====================================================================
     LANDSCAPES — the world waiting at ALT 0%
     ===================================================================== */

  /* midpoint-displacement ridgeline, normalized 0..1 */
  function ridgeline(R, segs, rough) {
    var arr = new Float32Array(segs + 1);
    arr[0] = R(); arr[segs] = R();
    (function mid(lo, hi, d) {
      if (hi - lo < 2) return;
      var m = (lo + hi) >> 1;
      arr[m] = (arr[lo] + arr[hi]) / 2 + (R() - 0.5) * d;
      mid(lo, m, d * rough); mid(m, hi, d * rough);
    })(0, segs, 1);
    var mn = Infinity, mx = -Infinity, i;
    for (i = 0; i <= segs; i++) { if (arr[i] < mn) mn = arr[i]; if (arr[i] > mx) mx = arr[i]; }
    for (i = 0; i <= segs; i++) arr[i] = (arr[i] - mn) / ((mx - mn) || 1);
    return arr;
  }

  function fillRidge(g, vw, lh, arr, baseY, amp, fill) {
    var segs = arr.length - 1;
    g.beginPath();
    g.moveTo(-2, lh + 2);
    for (var i = 0; i <= segs; i++)
      g.lineTo(i / segs * (vw + 4) - 2, baseY - arr[i] * amp);
    g.lineTo(vw + 2, lh + 2);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }

  function ridgeTopStroke(g, vw, lh, arr, baseY, amp, stroke, lw) {
    var segs = arr.length - 1;
    g.beginPath();
    for (var i = 0; i <= segs; i++) {
      var x = i / segs * (vw + 4) - 2, y = baseY - arr[i] * amp;
      i === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
    }
    g.strokeStyle = stroke;
    g.lineWidth = lw;
    g.stroke();
  }

  /* fillRidge + sedimentary strata lines clipped inside the silhouette */
  function fillRidgeStrata(g, vw, lh, arr, baseY, amp, fill, strata) {
    var segs = arr.length - 1;
    g.beginPath();
    g.moveTo(-2, lh + 2);
    for (var i = 0; i <= segs; i++)
      g.lineTo(i / segs * (vw + 4) - 2, baseY - arr[i] * amp);
    g.lineTo(vw + 2, lh + 2);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    g.save();
    g.clip();
    for (var s2 = 0; s2 < 5; s2++) {
      g.fillStyle = strata;
      g.fillRect(0, baseY - amp * (0.14 + s2 * 0.17), vw, Math.max(1, lh * 0.004));
    }
    g.restore();
  }

  function horizonGlow(g, vw, lh, hzY, h1, h2, strength) {
    var gr = g.createLinearGradient(0, hzY - lh * 0.55, 0, hzY + lh * 0.1);
    gr.addColorStop(0, hsla(h1[0], h1[1], h1[2], 0));
    gr.addColorStop(0.75, hsla(h1[0], h1[1], h1[2], 0.10 * strength));
    gr.addColorStop(1, hsla(h2[0], h2[1], h2[2], 0.22 * strength));
    g.fillStyle = gr;
    g.fillRect(0, 0, vw, hzY + lh * 0.1);
  }

  /* big planet hanging in the landscape sky (like the reference art) */
  function skyPlanet(g, x, y, r, hue2, ringed, R) {
    g.save();
    g.globalCompositeOperation = "lighter";
    puff(g, x, y, r * 2.2, hue2, 60, 60, 0.10);      /* atmospheric halo */
    g.globalCompositeOperation = "source-over";
    var sp = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    sp.addColorStop(0, hsla(hue2, 42, 66, 1));
    sp.addColorStop(0.65, hsla(hue2 + 12, 48, 38, 1));
    sp.addColorStop(1, hsla(hue2 + 22, 52, 10, 1));
    g.fillStyle = sp;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    for (var b = 0; b < 9; b++) {
      g.fillStyle = hsla(hue2 + (R() - 0.5) * 26, 38, 42 + R() * 26, 0.06 + R() * 0.09);
      g.beginPath();
      g.ellipse(x, y - r + (b + 0.5) / 9 * r * 2, r * 1.02, r * (0.05 + R() * 0.08), 0, 0, TAU);
      g.fill();
    }
    var tg = g.createLinearGradient(x - r, y, x + r, y);
    tg.addColorStop(0, "rgba(3,4,9,0)");
    tg.addColorStop(0.6, "rgba(3,4,9,0)");
    tg.addColorStop(1, "rgba(3,4,9,0.75)");
    g.fillStyle = tg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
    if (ringed) {
      g.save();
      g.translate(x, y);
      g.rotate(-0.22);
      for (var i = 0; i < 16; i++) {
        var t = i / 16;
        if (t > 0.4 && t < 0.5) continue;
        var rad = r * (1.35 + t * 0.85);
        g.strokeStyle = hsla(hue2 + 16, 30, 70, 0.06 + 0.10 * Math.sin(t * Math.PI));
        g.lineWidth = r * 0.03;
        g.beginPath(); g.ellipse(0, 0, rad, rad * 0.22, 0, 0, TAU); g.stroke();
      }
      g.restore();
    }
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = hsla(hue2 - 8, 70, 78, 0.22);
    g.lineWidth = Math.max(1, r * 0.02);
    g.beginPath(); g.arc(x, y, r * 1.005, Math.PI * 0.5, Math.PI * 1.5); g.stroke();
    g.globalCompositeOperation = "source-over";
    g.restore();
  }

  /* An earth-like living world — oceans, continents, cloud systems, the
     thin blue line of atmosphere, twin moons. Always drawn whole. */
  function skyWorld(g, x, y, r, R) {
    g.save();
    g.globalCompositeOperation = "lighter";
    puff(g, x, y, r * 1.6, 204, 75, 62, 0.12);
    g.globalCompositeOperation = "source-over";
    var sp = g.createRadialGradient(x - r * 0.38, y - r * 0.38, r * 0.1, x, y, r);
    sp.addColorStop(0, "hsl(203,62%,60%)");
    sp.addColorStop(0.55, "hsl(212,64%,42%)");
    sp.addColorStop(1, "hsl(224,70%,13%)");
    g.fillStyle = sp;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.save();
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    /* continents — clustered irregular landmasses */
    for (var c = 0; c < 7; c++) {
      var lx = x + (R() - 0.5) * r * 1.5, ly = y + (R() - 0.5) * r * 1.5;
      var lr = r * (0.10 + R() * 0.16);
      g.fillStyle = hsla(R() < 0.6 ? 145 : 36, 30 + R() * 14, 30 + R() * 14, 0.75);
      for (var b = 0; b < 7; b++) {
        g.beginPath();
        g.arc(lx + (R() - 0.5) * lr * 1.6, ly + (R() - 0.5) * lr * 1.2,
              lr * (0.3 + R() * 0.4), 0, TAU);
        g.fill();
      }
    }
    /* weather — cloud streaks and one cyclone swirl */
    for (c = 0; c < 16; c++) {
      var cx3 = x + (R() - 0.5) * r * 1.7, cy3 = y + (R() - 0.5) * r * 1.7;
      g.save();
      g.translate(cx3, cy3);
      g.rotate((R() - 0.5) * 0.9);
      g.scale(1, 0.32 + R() * 0.3);
      puff(g, 0, 0, r * (0.08 + R() * 0.15), 0, 0, 100, 0.10 + R() * 0.16);
      g.restore();
    }
    var sw = r * 0.22, sx3 = x - r * 0.3, sy3 = y + r * 0.35;
    for (c = 0; c < 14; c++) {
      var sa = c / 14 * TAU * 1.6;
      puff(g, sx3 + Math.cos(sa) * sw * (c / 14),
              sy3 + Math.sin(sa) * sw * (c / 14) * 0.7,
           r * 0.035 * (1 - c / 20), 0, 0, 100, 0.20);
    }
    /* night side */
    var tg = g.createLinearGradient(x - r, y, x + r, y);
    tg.addColorStop(0, "rgba(2,4,10,0)");
    tg.addColorStop(0.58, "rgba(2,4,10,0)");
    tg.addColorStop(1, "rgba(2,4,10,0.85)");
    g.fillStyle = tg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
    g.restore();
    /* the thin blue line — atmosphere seen edge-on */
    g.globalCompositeOperation = "lighter";
    g.strokeStyle = "hsla(200,85%,80%,0.5)";
    g.lineWidth = Math.max(1.2, r * 0.025);
    g.beginPath(); g.arc(x, y, r * 1.01, 0, TAU); g.stroke();
    g.strokeStyle = "hsla(198,90%,70%,0.14)";
    g.lineWidth = r * 0.09;
    g.beginPath(); g.arc(x, y, r * 1.04, 0, TAU); g.stroke();
    g.globalCompositeOperation = "source-over";
    /* twin moons, both fully in frame */
    crescentMoon(g, x - r * 1.9, y - r * 0.55, r * 0.16, 0.4);
    crescentMoon(g, x + r * 1.45, y + r * 0.8, r * 0.10, -0.45);
    g.restore();
  }

  function crescentMoon(g, x, y, r, phase) {
    g.save();
    var mg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    mg.addColorStop(0, "hsla(210,18%,84%,0.95)");
    mg.addColorStop(1, "hsla(214,20%,52%,0.9)");
    g.fillStyle = mg;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    g.fillStyle = "rgba(4,5,10,0.92)";
    g.beginPath(); g.arc(x + r * phase, y - r * 0.15 * phase, r * 0.92, 0, TAU); g.fill();
    g.restore();
  }

  var LANDSCAPES = {

    /* HOME — obsidian spires over a mirror-still sea; an earth-like world
       (whole disc, never clipped) hangs with its twin moons. The ringed
       giant lives up in the ORGANIZATIONS section — no encore here. */
    spires: function (g, vw, lh, R) {
      var hz = lh * 0.62, waterY = lh * 0.80;
      horizonGlow(g, vw, lh, hz + lh * 0.05, CFG.horizon, CFG.horizon2, 1);
      /* On narrow (mobile) layouts, tuck the world into the top-right corner and
         shrink it so it clears the left-aligned "Got a mission?" heading. */
      var narrow = vw < 760;
      var prr = narrow ? Math.min(vw * 0.13, lh * 0.16) : Math.min(vw * 0.105, lh * 0.30);
      var px = narrow ? vw * 0.83 : vw * 0.74;
      var py = narrow ? prr * 1.12 : Math.max(prr * 1.6, lh * 0.30);
      skyWorld(g, px, py, prr, R);
      /* crescent removed — it sat behind the COMMS "Got a mission?" title */

      var h0 = CFG.horizon[0];
      fillRidge(g, vw, lh, ridgeline(R, 128, 0.58), hz, lh * 0.16, hsla(h0 + 10, 34, 16, 0.85));
      fillRidge(g, vw, lh, ridgeline(R, 128, 0.62), hz + lh * 0.06, lh * 0.20, hsla(h0 + 14, 30, 10, 0.95));
      /* jagged obsidian spires on the front ridge */
      var front = ridgeline(R, 160, 0.72);
      fillRidge(g, vw, lh, front, waterY, lh * 0.30, "hsl(226,28%,4%)");
      for (var s2 = 0; s2 < 7; s2++) {
        var sx = vw * (0.05 + R() * 0.9), sw2 = vw * (0.006 + R() * 0.012);
        var shh = lh * (0.16 + R() * 0.26);
        g.fillStyle = "hsl(226,28%,4%)";
        g.beginPath();
        g.moveTo(sx - sw2, waterY);
        g.lineTo(sx - sw2 * 0.2 + (R() - 0.5) * sw2, waterY - shh);
        g.lineTo(sx + sw2, waterY);
        g.closePath(); g.fill();
      }
      /* the sea */
      var wg = g.createLinearGradient(0, waterY, 0, lh);
      wg.addColorStop(0, hsla(h0, 45, 14, 1));
      wg.addColorStop(0.25, hsla(h0 + 8, 40, 7, 1));
      wg.addColorStop(1, "hsl(228,30%,3%)");
      g.fillStyle = wg;
      g.fillRect(0, waterY, vw, lh - waterY);
      /* planet reflection */
      g.save();
      g.globalCompositeOperation = "lighter";
      var refl = g.createRadialGradient(px, waterY + prr * 0.9, 0, px, waterY + prr * 0.9, prr * 1.6);
      refl.addColorStop(0, hsla(CFG.horizon[0] + 6, 55, 55, 0.12));
      refl.addColorStop(1, hsla(CFG.horizon[0] + 6, 55, 55, 0));
      g.fillStyle = refl;
      g.fillRect(px - prr * 2, waterY, prr * 4, lh - waterY);
      /* moon-glints on the water */
      for (var i = 0; i < 46; i++) {
        var gy2 = waterY + Math.pow(R(), 1.6) * (lh - waterY) * 0.9;
        var gw2 = vw * (0.004 + R() * 0.03) * (1 + (gy2 - waterY) / (lh - waterY));
        g.fillStyle = hsla(h0 + R() * 20, 60, 70, 0.03 + R() * 0.07);
        g.fillRect(px - prr * 1.4 + (R() - 0.5) * prr * 2.4, gy2, gw2, Math.max(1, lh * 0.0025));
      }
      g.restore();
    },

    /* FEATURED — rust-amber mesa canyon; a banded amber giant hangs whole
       in the west, one crescent high in the east */
    mesa: function (g, vw, lh, R) {
      var hz = lh * 0.66;
      horizonGlow(g, vw, lh, hz + lh * 0.04, CFG.horizon, CFG.horizon2, 1.15);
      var gr2 = Math.min(vw * 0.085, lh * 0.26);
      skyPlanet(g, vw * 0.20, Math.max(gr2 * 1.5, lh * 0.26), gr2, 24, false, R);
      crescentMoon(g, vw * 0.86, lh * 0.13, Math.max(7, vw * 0.014), -0.5);
      /* stacked mesas: quantize ridge into plateaus */
      function mesaRidge(segs, plateaus) {
        var arr = ridgeline(R, segs, 0.55);
        var lvls = [];
        for (var l = 0; l < plateaus; l++) lvls.push(0.25 + l / plateaus * 0.75);
        for (var i = 0; i <= segs; i++) {
          var best = lvls[0];
          for (var l2 = 1; l2 < plateaus; l2++)
            if (Math.abs(lvls[l2] - arr[i]) < Math.abs(best - arr[i])) best = lvls[l2];
          arr[i] = arr[i] * 0.18 + best * 0.82;
        }
        return arr;
      }
      var h0 = CFG.horizon[0];
      var mA = mesaRidge(96, 4), mB = mesaRidge(112, 3), mC = mesaRidge(128, 3);
      fillRidge(g, vw, lh, mA, hz, lh * 0.20, hsla(h0, 48, 19, 0.85));
      fillRidgeStrata(g, vw, lh, mB, hz + lh * 0.09, lh * 0.24,
                      hsla(h0 - 4, 46, 11, 0.95), hsla(h0, 55, 6, 0.6));
      ridgeTopStroke(g, vw, lh, mB, hz + lh * 0.09, lh * 0.24,
                     hsla(h0 + 16, 75, 58, 0.22), 1);
      fillRidgeStrata(g, vw, lh, mC, lh * 0.995, lh * 0.30,
                      "hsl(14,38%,4%)", "hsla(18,50%,9%,0.7)");
      ridgeTopStroke(g, vw, lh, mC, lh * 0.995, lh * 0.30,
                     hsla(h0 + 20, 80, 55, 0.16), 1);
      /* drifting dust haze */
      g.globalCompositeOperation = "lighter";
      for (var d = 0; d < 5; d++) {
        var dy = hz + lh * 0.05 + R() * lh * 0.22;
        var dg2 = g.createLinearGradient(0, dy - lh * 0.02, 0, dy + lh * 0.02);
        dg2.addColorStop(0, hsla(h0 + 10, 60, 55, 0));
        dg2.addColorStop(0.5, hsla(h0 + 10, 60, 55, 0.04 + R() * 0.03));
        dg2.addColorStop(1, hsla(h0 + 10, 60, 55, 0));
        g.fillStyle = dg2;
        g.fillRect(0, dy - lh * 0.02, vw, lh * 0.04);
      }
      g.globalCompositeOperation = "source-over";
    },

    /* PROJECTS — glacial ridge world beneath an aurora storm */
    ice: function (g, vw, lh, R) {
      var hz = lh * 0.64;
      horizonGlow(g, vw, lh, hz + lh * 0.04, CFG.horizon, CFG.horizon2, 0.9);
      /* rising galaxy band on the horizon */
      g.save();
      g.globalCompositeOperation = "lighter";
      g.translate(vw * 0.3, hz - lh * 0.18);
      g.rotate(-0.18);
      var Rg = mulberry(91);
      for (var i = 0; i < 40; i++) {
        var t = i / 40;
        puff(g, (t - 0.5) * vw * 0.7, (Rg() - 0.5) * lh * 0.05,
             lh * (0.03 + Rg() * 0.05), 262 + Rg() * 40, 50, 60, 0.028);
      }
      g.restore();
      /* a scarred ice moon — whole disc, upper right, above the ridges */
      var mr2 = Math.min(vw * 0.07, lh * 0.22);
      var mx3 = vw * 0.82, my3 = Math.max(mr2 * 1.4, lh * 0.22);
      var mgr = g.createRadialGradient(mx3 - mr2 * 0.35, my3 - mr2 * 0.35,
                                       mr2 * 0.1, mx3, my3, mr2);
      mgr.addColorStop(0, "hsl(215,25%,78%)");
      mgr.addColorStop(0.7, "hsl(222,28%,48%)");
      mgr.addColorStop(1, "hsl(232,32%,16%)");
      g.fillStyle = mgr;
      g.beginPath(); g.arc(mx3, my3, mr2, 0, TAU); g.fill();
      g.save();
      g.beginPath(); g.arc(mx3, my3, mr2, 0, TAU); g.clip();
      for (var cr = 0; cr < 9; cr++) {
        var ca2 = R() * TAU, cd2 = Math.pow(R(), 0.6) * mr2 * 0.85;
        var crx = mx3 + Math.cos(ca2) * cd2, cry = my3 + Math.sin(ca2) * cd2;
        var crr = mr2 * (0.05 + R() * 0.12);
        g.fillStyle = "rgba(10,14,26," + (0.25 + R() * 0.2) + ")";
        g.beginPath(); g.ellipse(crx, cry, crr, crr * 0.75, R() * TAU, 0, TAU); g.fill();
        g.strokeStyle = "hsla(215,30%,80%,0.25)";
        g.lineWidth = Math.max(0.5, crr * 0.15);
        g.beginPath(); g.arc(crx, cry, crr, -2.4, -0.6); g.stroke();
      }
      var mtg = g.createLinearGradient(mx3 - mr2, my3, mx3 + mr2, my3);
      mtg.addColorStop(0, "rgba(2,4,10,0)");
      mtg.addColorStop(0.6, "rgba(2,4,10,0)");
      mtg.addColorStop(1, "rgba(2,4,10,0.8)");
      g.fillStyle = mtg;
      g.fillRect(mx3 - mr2, my3 - mr2, mr2 * 2, mr2 * 2);
      g.restore();
      /* aurora curtains */
      g.save();
      g.globalCompositeOperation = "lighter";
      for (var a = 0; a < 4; a++) {
        var ax = vw * (0.1 + R() * 0.8), topY = lh * (0.02 + R() * 0.10);
        var ag = g.createLinearGradient(0, topY, 0, hz);
        var ah = 150 + R() * 130;
        ag.addColorStop(0, hsla(ah, 80, 62, 0));
        ag.addColorStop(0.4, hsla(ah, 80, 60, 0.10));
        ag.addColorStop(1, hsla(ah + 30, 80, 58, 0));
        g.fillStyle = ag;
        g.beginPath();
        var aw = vw * (0.04 + R() * 0.05), drift = (R() - 0.5) * vw * 0.3;
        g.moveTo(ax - aw, hz);
        g.bezierCurveTo(ax - aw + drift * 0.4, lh * 0.4, ax - aw * 0.5 + drift, topY + lh * 0.1, ax + drift, topY);
        g.lineTo(ax + aw * 0.7 + drift, topY);
        g.bezierCurveTo(ax + aw * 0.6 + drift * 0.6, lh * 0.35, ax + aw, lh * 0.5, ax + aw, hz);
        g.closePath();
        g.fill();
      }
      g.restore();
      var h0 = CFG.horizon[0];
      fillRidge(g, vw, lh, ridgeline(R, 128, 0.75), hz, lh * 0.22, hsla(h0, 36, 18, 0.85));
      var mid2 = ridgeline(R, 144, 0.8);
      fillRidge(g, vw, lh, mid2, hz + lh * 0.09, lh * 0.26, hsla(h0 + 6, 32, 10, 0.95));
      ridgeTopStroke(g, vw, lh, mid2, hz + lh * 0.09, lh * 0.26, hsla(h0 - 20, 60, 78, 0.22), 1.1);
      var front = ridgeline(R, 176, 0.85);
      fillRidge(g, vw, lh, front, lh * 0.995, lh * 0.30, "hsl(250,30%,4%)");
      ridgeTopStroke(g, vw, lh, front, lh * 0.995, lh * 0.30, hsla(h0 - 30, 70, 84, 0.28), 1.3);
    },

    /* CERTIFICATIONS — bioluminescent dunes, standing monoliths, and a
       colossal planetrise: a world so close its limb swallows the horizon */
    /* ACCOLADES — a becalmed alien basin: a ringed world low over rolling
       jade dunes, a small crescent moon, and slow aurora off the horizon. */
    dunes: function (g, vw, lh, R) {
      var hz = lh * 0.60, h0 = CFG.horizon[0];
      var narrow = vw < 760;
      horizonGlow(g, vw, lh, hz + lh * 0.05, CFG.horizon, CFG.horizon2, 1.05);

      /* the ringed gas giant sitting low over the hills — drawn before the
         ridges so its base is occluded by the dunes and it reads as rising. */
      var pr = Math.min(vw * (narrow ? 0.19 : 0.13), lh * 0.34);
      var px = narrow ? vw * 0.74 : vw * 0.70, py = hz - pr * 0.12;
      skyPlanet(g, px, py, pr, h0 + 2, true, R);

      /* a small crescent moon, high on the opposite side */
      crescentMoon(g, vw * 0.20, lh * 0.15, Math.max(7, vw * 0.015), -0.5);

      /* slow aurora curtains breathing up off the horizon */
      g.save();
      g.globalCompositeOperation = "lighter";
      for (var a = 0; a < 3; a++) {
        var ax = vw * (0.12 + R() * 0.72), topY = lh * (0.04 + R() * 0.10);
        var ah = h0 + (R() - 0.5) * 26;
        var ag = g.createLinearGradient(0, topY, 0, hz);
        ag.addColorStop(0, hsla(ah, 78, 60, 0));
        ag.addColorStop(0.45, hsla(ah, 78, 58, 0.08));
        ag.addColorStop(1, hsla(ah + 18, 78, 56, 0));
        g.fillStyle = ag;
        var aw = vw * (0.05 + R() * 0.05), drift = (R() - 0.5) * vw * 0.24;
        g.beginPath();
        g.moveTo(ax - aw, hz);
        g.bezierCurveTo(ax - aw + drift * 0.4, lh * 0.4, ax - aw * 0.5 + drift, topY + lh * 0.1, ax + drift, topY);
        g.lineTo(ax + aw * 0.7 + drift, topY);
        g.bezierCurveTo(ax + aw * 0.6 + drift * 0.6, lh * 0.35, ax + aw, lh * 0.5, ax + aw, hz);
        g.closePath(); g.fill();
      }
      g.restore();

      /* layered rolling dunes — atmospheric far→near with a crest rim-light */
      var backs = [
        { base: hz,           amp: lh * 0.085, col: hsla(h0,      34, 21, 0.85), rough: 0.30, rim: 0.13 },
        { base: hz + lh*0.10, amp: lh * 0.125, col: hsla(h0 + 5,  34, 14, 0.93), rough: 0.34, rim: 0.15 },
        { base: hz + lh*0.24, amp: lh * 0.16,  col: hsla(h0 + 10, 32, 9,  0.97), rough: 0.38, rim: 0.17 },
        { base: lh * 0.995,   amp: lh * 0.20,  col: "hsl(168,34%,4%)",           rough: 0.42, rim: 0.22 }
      ];
      for (var d = 0; d < backs.length; d++) {
        var arr = ridgeline(R, 120, backs[d].rough);
        fillRidge(g, vw, lh, arr, backs[d].base, backs[d].amp, backs[d].col);
        ridgeTopStroke(g, vw, lh, arr, backs[d].base, backs[d].amp,
                       hsla(h0 - 6, 60, 66, backs[d].rim), 1);
      }

      /* fine wind-blown grain on the near dunes for surface texture */
      g.save();
      g.globalCompositeOperation = "lighter";
      for (var s = 0; s < 60; s++) {
        var gx = R() * vw, gy = hz + lh * 0.30 + R() * lh * 0.36;
        g.fillStyle = hsla(h0 - 4, 55, 62, 0.02 + R() * 0.045);
        g.fillRect(gx, gy, vw * (0.01 + R() * 0.03), Math.max(1, lh * 0.002));
      }
      g.restore();
    }
  };

  /* =====================================================================
     LAYER 1 — FIXED BACKDROP  (starfields / milky way / meteors / atmo)
     ===================================================================== */
  var far = document.createElement("canvas");
  far.id = "space-far";
  far.setAttribute("aria-hidden", "true");
  far.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100vh;" +
                      "z-index:-2;pointer-events:none;";
  var farG = far.getContext("2d");
  var FDPR = Math.min(window.devicePixelRatio || 1, 1.5);

  var stars = [], brights = [], mw = null, vignette = null;
  var VW = 0, VH = 0, wrapH = 0, mwRate = 0.02;

  function buildBackdrop() {
    VW = innerWidth; VH = innerHeight;
    far.width = Math.round(VW * FDPR);
    far.height = Math.round(VH * FDPR);
    wrapH = VH + 260;
    var mobile = VW < 700;
    var R = mulberry(CFG.seed * 7 + 3);
    var area = VW * VH / 1e6;
    stars = [];
    var layers = [
      { n: Math.round(area * (mobile ? 110 : 150)), rate: 0.018, rMin: 0.4, rMax: 0.9, aMin: 0.12, aMax: 0.4 },
      { n: Math.round(area * (mobile ? 55 : 75)),   rate: 0.05,  rMin: 0.6, rMax: 1.4, aMin: 0.2,  aMax: 0.6 },
      { n: Math.round(area * (mobile ? 20 : 28)),   rate: 0.10,  rMin: 0.9, rMax: 1.9, aMin: 0.3,  aMax: 0.85 }
    ];
    for (var L = 0; L < layers.length; L++) {
      var lay = layers[L];
      for (var i = 0; i < lay.n; i++) {
        var roll = R();
        stars.push({
          x: R() * VW,
          y: R() * wrapH,
          r: lay.rMin + R() * (lay.rMax - lay.rMin),
          a: lay.aMin + R() * (lay.aMax - lay.aMin),
          rate: lay.rate,
          hue: roll < 0.72 ? 210 + R() * 40 : roll < 0.86 ? 30 + R() * 20 : 335 + R() * 25,
          sat: roll < 0.72 ? 25 + R() * 30 : 45 + R() * 30,
          tw: R() < 0.16 ? 0.9 + R() * 1.6 : 0,
          ph: R() * TAU
        });
      }
    }
    brights = [];
    var nb = mobile ? 5 : 8;
    for (i = 0; i < nb; i++) {
      brights.push({
        /* hero stars live near the viewport edges, never behind the
           centered content column where they'd lose their grandeur */
        x: R() < 0.5 ? R() * VW * 0.20 : VW * (0.80 + R() * 0.20),
        y: R() * wrapH,
        r: 1.6 + R() * 1.8, rate: 0.06 + R() * 0.05,
        hue: R() < 0.5 ? 212 : 36,
        tw: 0.5 + R() * 1.1, ph: R() * TAU
      });
    }

    /* milky way band, pre-rendered */
    mw = document.createElement("canvas");
    mw.width = VW; mw.height = VH + 300;
    var mg = mw.getContext("2d");
    mg.globalCompositeOperation = "lighter";
    var ang = -0.45, cx = VW * 0.55, cy = (VH + 300) * 0.42;
    var span = Math.sqrt(VW * VW + VH * VH) * 0.75;
    for (i = 0; i < 90; i++) {
      var t = (R() - 0.5) * 2;
      var off = (R() - 0.5) * VH * 0.22 * (1 - Math.abs(t) * 0.4);
      puff(mg, cx + Math.cos(ang) * span * t - Math.sin(ang) * off,
              cy + Math.sin(ang) * span * t + Math.cos(ang) * off,
           40 + R() * 110, 222 + R() * 36, 35, 68, 0.012 + R() * 0.014);
    }
    /* galactic dust rift */
    mg.globalCompositeOperation = "source-over";
    for (i = 0; i < 40; i++) {
      var t2 = (R() - 0.5) * 1.8;
      var rr = 20 + R() * 60;
      var dx = cx + Math.cos(ang) * span * t2 - Math.sin(ang) * (R() - 0.5) * VH * 0.05;
      var dy = cy + Math.sin(ang) * span * t2 + Math.cos(ang) * (R() - 0.5) * VH * 0.05;
      var dgr = mg.createRadialGradient(dx, dy, 0, dx, dy, rr);
      dgr.addColorStop(0, "rgba(3,4,8,0.20)");
      dgr.addColorStop(1, "rgba(3,4,8,0)");
      mg.fillStyle = dgr;
      mg.fillRect(dx - rr, dy - rr, rr * 2, rr * 2);
    }
    mg.globalCompositeOperation = "lighter";
    for (i = 0; i < 340; i++) {
      var t3 = (R() - 0.5) * 2;
      var off3 = (R() - 0.5) * VH * 0.24;
      mg.fillStyle = hsla(210 + R() * 50, 40, 85, 0.04 + R() * 0.12);
      var ss = 0.4 + R() * 0.9;
      mg.fillRect(cx + Math.cos(ang) * span * t3 - Math.sin(ang) * off3,
                  cy + Math.sin(ang) * span * t3 + Math.cos(ang) * off3, ss, ss);
    }

    /* vignette, pre-rendered */
    vignette = document.createElement("canvas");
    vignette.width = VW; vignette.height = VH;
    var vg = vignette.getContext("2d");
    var vgr = vg.createRadialGradient(VW / 2, VH * 0.44, Math.min(VW, VH) * 0.35,
                                      VW / 2, VH * 0.5, Math.max(VW, VH) * 0.75);
    vgr.addColorStop(0, "rgba(2,3,7,0)");
    vgr.addColorStop(1, "rgba(2,3,7,0.42)");
    vg.fillStyle = vgr;
    vg.fillRect(0, 0, VW, VH);
  }

  function drawFar(t, scroll, maxScroll) {
    var g = farG;
    g.setTransform(FDPR, 0, 0, FDPR, 0, 0);
    g.clearRect(0, 0, VW, VH);

    var prog = maxScroll > 0 ? clamp(scroll / maxScroll, 0, 1) : 0;
    var glow = smooth((prog - 0.58) / 0.42);

    /* base sky */
    var base = g.createLinearGradient(0, 0, 0, VH);
    base.addColorStop(0, "#04050a");
    base.addColorStop(0.55, "#050710");
    base.addColorStop(1, "#070a14");
    g.fillStyle = base;
    g.fillRect(0, 0, VW, VH);

    /* milky way, slow parallax */
    if (mw) {
      var myo = -clamp(scroll * mwRate, 0, 300);
      g.globalAlpha = 0.6 * (1 - glow * 0.55);
      g.drawImage(mw, 0, myo);
      g.globalAlpha = 1;
    }

    /* starfields */
    var horizonFade = glow * 0.75;
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var y = ((s.y - scroll * s.rate) % wrapH + wrapH) % wrapH - 130;
      if (y < -4 || y > VH + 4) continue;
      var a = s.a;
      if (s.tw) a *= 0.7 + 0.3 * Math.sin(t * s.tw + s.ph);
      if (horizonFade > 0) {
        var d = clamp((y / VH - 0.45) / 0.55, 0, 1);
        a *= 1 - horizonFade * d;
      }
      g.fillStyle = hsla(s.hue, s.sat, 86, a);
      g.fillRect(s.x, y, s.r, s.r);
    }
    /* hero stars with diffraction spikes */
    g.globalCompositeOperation = "lighter";
    for (i = 0; i < brights.length; i++) {
      var b = brights[i];
      var by = ((b.y - scroll * b.rate) % wrapH + wrapH) % wrapH - 130;
      if (by < -30 || by > VH + 30) continue;
      var ba = 0.55 + 0.35 * Math.sin(t * b.tw + b.ph);
      if (horizonFade > 0) ba *= 1 - horizonFade * clamp((by / VH - 0.45) / 0.55, 0, 1);
      spikeStar(g, b.x, by, b.r, b.hue, ba * 0.55);
    }
    g.globalCompositeOperation = "source-over";

    /* atmosphere ignition near ALT 0% — every page, its own sky color */
    if (glow > 0.003) {
      var h1 = CFG.horizon, h2 = CFG.horizon2;
      var ag = g.createLinearGradient(0, VH * 0.35, 0, VH);
      ag.addColorStop(0, hsla(h1[0], h1[1], h1[2], 0));
      ag.addColorStop(0.65, hsla(h1[0], h1[1], h1[2], 0.12 * glow));
      ag.addColorStop(1, hsla(h2[0], h2[1], h2[2], 0.36 * glow));
      g.fillStyle = ag;
      g.fillRect(0, 0, VW, VH);
    }

    if (vignette) g.drawImage(vignette, 0, 0);
  }

  /* =====================================================================
     LAYER 2 — DOCUMENT LAYER  (phenomena patches + landscape)
     ===================================================================== */
  var host = document.createElement("div");
  host.id = "space-bg";
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;top:0;left:0;width:100%;" +
                       // overflow-x:clip stops planet canvases that sit past the
                       // right edge from widening the (mobile) layout viewport,
                       // which otherwise made the page load slightly zoomed out.
                       "z-index:-1;pointer-events:none;overflow-x:clip;overflow-y:visible;";
  var patches = [], landH = 0, builtDocH = 0;

  function buildDocLayer() {
    host.innerHTML = "";
    host.style.height = "0px";
    patches = [];

    var vw = innerWidth, vh = innerHeight;
    var mobile = vw < 700;
    var docH = Math.max(document.documentElement.scrollHeight, vh);
    builtDocH = docH;
    host.style.height = docH + "px";

    /* ---- landscape at ALT 0% ---- */
    landH = Math.round(clamp(vh * (mobile ? 0.52 : 0.72), 260, 680));
    var LDPR = Math.min(window.devicePixelRatio || 1, 1.75);
    var lc = document.createElement("canvas");
    lc.width = Math.round(vw * LDPR);
    lc.height = Math.round(landH * LDPR);
    lc.style.cssText = "position:absolute;left:0;bottom:0;width:100%;height:" +
                       landH + "px;";
    var lg = lc.getContext("2d");
    lg.scale(LDPR, LDPR);
    LANDSCAPES[CFG.landscape](lg, vw, landH, mulberry(CFG.seed * 31 + 7));
    host.appendChild(lc);

    /* ---- phenomena anchored to the MARGINS BETWEEN sections ----------
       Each set-piece is centred on the empty band between two real page
       sections (read live from the DOM), with its parallax pre-compensated
       so it sits in that gap while the gap is on screen. Because placement
       is driven by the section elements, a given phenomenon lands at the
       same section boundary on desktop AND mobile, and stays clear of card
       / text content instead of hiding behind it. */
    var startY = vh * 1.05;
    var span = docH - startY - landH - vh * 0.35;
    if (span < vh * 0.4) { mountHost(); return; }
    var R = mulberry(CFG.seed);

    var anchorSel = ["#top", ".mq-wrap", "#systems", "#journey", "#comms", ".footer"];
    var blocks = [], qi, qe, qr;
    for (qi = 0; qi < anchorSel.length; qi++) {
      qe = document.querySelector(anchorSel[qi]);
      if (!qe) continue;
      qr = qe.getBoundingClientRect();
      blocks.push({ sel: anchorSel[qi], top: qr.top + scrollY, bottom: qr.bottom + scrollY });
    }
    var gaps = [], gi, gt, gb;
    for (gi = 0; gi < blocks.length - 1; gi++) {
      gt = blocks[gi].bottom; gb = blocks[gi + 1].top;
      if (gb - gt < 30) continue;                      // skip negligible seams
      gaps.push({ y: (gt + gb) / 2, h: gb - gt, after: blocks[gi + 1].sel });
    }
    if (gaps.length < 2) {                              // defensive fallback
      var nE = clamp(Math.round(span / (vh * (mobile ? 1.25 : 0.95))), 3, mobile ? 6 : 10), ei;
      gaps = [];
      for (ei = 0; ei < nE; ei++)
        gaps.push({ y: startY + span * (ei + 0.5) / nE, h: vh * 0.4, after: "" });
    }

    /* map the lineup onto the gaps, then pin the black hole to the gap just
       before the Tech-Stack section (a strong focal spot) */
    var lineup = [], li;
    for (li = 0; li < gaps.length; li++) lineup.push(CFG.lineup[li % CFG.lineup.length]);
    var bhAt = -1, sysGap = -1;
    for (li = 0; li < gaps.length; li++) {
      if (lineup[li] === "blackhole") bhAt = li;
      if (gaps[li].after === "#systems") sysGap = li;
    }
    if (sysGap > -1 && CFG.lineup.indexOf("blackhole") > -1) {
      if (bhAt > -1 && bhAt !== sysGap) { lineup[bhAt] = lineup[sysGap]; }
      lineup[sysGap] = "blackhole";
    }

    var pi;
    for (pi = 0; pi < gaps.length; pi++) {
      var name = lineup[pi], def = PAINTERS[name];
      var szMul = mobile ? 0.58 : 1;
      var s = Math.round((def.sz[0] + R() * (def.sz[1] - def.sz[0])) * szMul *
                         clamp(vw / 1400, 0.7, 1.15));
      s = Math.min(s, Math.round(vh * (mobile ? 0.62 : 0.92)));
      var cv = document.createElement("canvas");
      cv.width = cv.height = s;

      /* X — flank the centred content column, alternating sides, sitting
         mostly over the gutter so the body reads clearly. */
      var side = pi % 2 === 0;
      var x = mobile
        ? (side ? -s * 0.18 : vw - s * 0.82)
        : (side ? -s * 0.28 - R() * vw * 0.04 : vw - s * 0.72 + R() * vw * 0.04);

      var k = (R() * 0.10 - 0.05);
      var g = gaps[pi];
      /* parallax-compensated top: screenY(top) = cssTop - scroll*(1-k), so
         to viewport-centre the body when the gap centre crosses the
         viewport centre (scroll = g.y - vh/2): */
      var cssTop = (vh / 2 - s / 2) + (g.y - vh / 2) * (1 - k);
      cssTop = clamp(cssTop, startY - s * 0.5, docH - landH - s * 0.4);

      var op = name === "blackhole" ? 1
             : name === "planet" ? 0.96
             : name === "asteroids" ? 0.92
             : name === "meteor" ? 0.85
             : 0.55 + R() * 0.32;
      cv.style.cssText = "position:absolute;left:" + Math.round(x) + "px;top:" +
        Math.round(cssTop) + "px;width:" + s + "px;height:" + s + "px;opacity:" +
        op.toFixed(2) + ";will-change:transform;";
      def.fn(cv, CFG.seed * 100 + pi * 17 + 5);
      host.appendChild(cv);
      patches.push({ el: cv, k: k });
    }

    /* a faint asteroid belt across a mid gap, for depth */
    var bH = Math.round(clamp(vh * 0.4, 200, 400));
    var bg = gaps[Math.min(gaps.length - 1, (gaps.length / 2) | 0)];
    var bk = (R() * 0.05 - 0.025);
    var bC = document.createElement("canvas");
    bC.width = vw; bC.height = bH;
    var bTop = (vh / 2 - bH / 2) + (bg.y - vh / 2) * (1 - bk);
    bTop = clamp(bTop, startY, docH - landH - bH);
    bC.style.cssText = "position:absolute;left:0;top:" + Math.round(bTop) + "px;width:" + vw +
      "px;height:" + bH + "px;opacity:0.85;will-change:transform;";
    paintBelt(bC, CFG.seed * 9 + 4);
    host.appendChild(bC);
    patches.push({ el: bC, k: bk });

    mountHost();
  }

  function mountHost() {
    if (!host.parentNode) document.body.insertBefore(host, document.body.firstChild);
    if (!far.parentNode) document.body.insertBefore(far, document.body.firstChild);
  }

  /* =====================================================================
     ANIMATION / LIFECYCLE
     ===================================================================== */
  var cur = 0, rafId = 0, lastTs = 0, running = false;

  function maxScroll() {
    return Math.max(1, document.documentElement.scrollHeight - innerHeight);
  }

  function applyPatches(scroll) {
    for (var i = 0; i < patches.length; i++)
      patches[i].el.style.transform =
        "translate3d(0," + (scroll * patches[i].k).toFixed(1) + "px,0)";
  }

  function frame(ts) {
    rafId = requestAnimationFrame(frame);
    lastTs = ts;
    var target = scrollY;
    cur += (target - cur) * 0.09;
    if (Math.abs(target - cur) < 0.05) cur = target;
    drawFar(ts / 1000, cur, maxScroll());
    applyPatches(cur);
  }

  function start() {
    if (running || REDUCED) return;
    running = true;
    lastTs = performance.now();
    rafId = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  function staticDraw() {
    cur = scrollY;
    drawFar(0, cur, maxScroll());
    applyPatches(0);
  }

  var rebuildT = 0;
  function queueRebuild(force) {
    clearTimeout(rebuildT);
    rebuildT = setTimeout(function () {
      var prev = host.style.height;
      host.style.height = "0px";
      var docH = Math.max(document.documentElement.scrollHeight, innerHeight);
      host.style.height = prev;
      if (!force && Math.abs(docH - builtDocH) < 40 && innerWidth === VW) return;
      buildBackdrop();
      buildDocLayer();
      if (REDUCED) staticDraw();
    }, 320);
  }

  function init() {
    document.body.style.background = "transparent";
    buildBackdrop();
    buildDocLayer();
    cur = scrollY;

    if (REDUCED) {
      staticDraw();
      addEventListener("scroll", function () { staticDraw(); }, { passive: true });
    } else {
      start();
      document.addEventListener("visibilitychange", function () {
        document.hidden ? stop() : start();
      });
    }

    addEventListener("resize", function () { queueRebuild(true); });
    addEventListener("load", function () { queueRebuild(); });
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { queueRebuild(); });
      ro.observe(document.body);
    } else {
      setInterval(function () { queueRebuild(); }, 1600);
    }
    window.__spaceBG = { rebuild: function () { queueRebuild(true); } };
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();
})();
