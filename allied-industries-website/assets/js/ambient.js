/* ============================================================================
   Ambient field — a copper light that follows the cursor, over a slowly
   parallaxing wash.
   ----------------------------------------------------------------------------
   Sits behind the page content on a fixed canvas. Two layers:
     1. drifting blobs that parallax against scroll and pointer
     2. a trail that the pointer leaves behind, fading as it goes
   Additive blending, so overlaps bloom rather than muddy.
   ========================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var canvas = document.createElement("canvas");
  canvas.className = "ambient-field";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild);
  var ctx = canvas.getContext("2d");

  var W = 0, H = 0, dpr = 1;
  var px = -9999, py = -9999, tx = -9999, ty = -9999;
  var scrollY = 0, targetScroll = 0;
  var trail = [];
  var running = false, lastSpawn = 0;
  var speed = 0, lastPx = 0, lastPy = 0;

  // Large, slow shapes. Each parallaxes at its own rate so the field has depth.
  var blobs = [
    { x: 0.18, y: 0.22, r: 0.46, a: 0.075, sp: 0.014, ph: 0.0 },
    { x: 0.82, y: 0.38, r: 0.40, a: 0.060, sp: 0.022, ph: 2.1 },
    { x: 0.46, y: 0.78, r: 0.52, a: 0.055, sp: 0.010, ph: 4.2 }
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function blob(x, y, r, alpha, warm) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    if (warm) {
      g.addColorStop(0,    "rgba(201, 144, 107," + alpha.toFixed(3) + ")");
      g.addColorStop(0.42, "rgba(166, 127, 103," + (alpha * 0.42).toFixed(3) + ")");
    } else {
      g.addColorStop(0,    "rgba(184, 143, 112," + alpha.toFixed(3) + ")");
      g.addColorStop(0.45, "rgba(166, 127, 103," + (alpha * 0.35).toFixed(3) + ")");
    }
    g.addColorStop(1, "rgba(166, 127, 103, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";   // overlaps bloom

    // The field tracks the cursor closely. An earlier, slower ease was meant
    // to read as weight, but at 0.14 the lag was long enough to look like the
    // page was struggling to keep up.
    px += (tx - px) * 0.38;
    py += (ty - py) * 0.38;
    scrollY += (targetScroll - scrollY) * 0.16;

    var min = Math.min(W, H);
    var nx = fine && px > -9000 ? (px / W - 0.5) : 0;
    var ny = fine && py > -9000 ? (py / H - 0.5) : 0;

    for (var i = 0; i < blobs.length; i++) {
      var bl = blobs[i];
      var t = reduced ? 0 : now * 0.00007 + bl.ph;
      var driftX = Math.cos(t) * min * 0.05;
      var driftY = Math.sin(t * 0.8) * min * 0.04;
      blob(
        bl.x * W + driftX - nx * min * bl.sp * 2.2,
        bl.y * H + driftY - ny * min * bl.sp * 2.2 - scrollY * bl.sp * 0.55,
        bl.r * min, bl.a, false
      );
    }

    if (!reduced && fine) {
      /* Speed and the wake both read off the true cursor rather than the
         eased position: anchoring them to the lagged point put the brightest
         part of the effect a visible distance behind the pointer. */
      var moved = Math.hypot(tx - lastPx, ty - lastPy);
      lastPx = tx; lastPy = ty;
      speed += (Math.min(1, moved / 22) - speed) * 0.26;

      if (now - lastSpawn > 20 && moved > 0.8) {
        trail.push({ x: tx, y: ty, born: now });
        lastSpawn = now;
      }
      for (var k = trail.length - 1; k >= 0; k--) {
        var p = trail[k];
        var age = (now - p.born) / 520;          // a shorter, tighter wake
        if (age >= 1) { trail.splice(k, 1); continue; }
        var fade = (1 - age) * (1 - age);
        blob(p.x, p.y, min * (0.040 + age * 0.075), 0.075 * fade, true);
      }

      // Strength follows movement, so a parked pointer leaves no hot spot
      // sitting over the copy. Moving fast, it reads as a wake.
      if (speed > 0.01) blob(tx, ty, min * (0.07 + speed * 0.05), 0.11 * speed, true);
    }

    ctx.globalCompositeOperation = "source-over";
    if (running) window.requestAnimationFrame(draw);
  }

  function start() { if (!running) { running = true; window.requestAnimationFrame(draw); } }
  function stop() { running = false; }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener("scroll", function () { targetScroll = window.scrollY || 0; }, { passive: true });

  if (fine && !reduced) {
    window.addEventListener("pointermove", function (e) {
      if (tx < -9000) { px = e.clientX; py = e.clientY; }   // no swoop on first move
      tx = e.clientX; ty = e.clientY;
    }, { passive: true });
    window.addEventListener("pointerleave", function () { tx = -9999; ty = -9999; });
  }

  resize();
  if (reduced) {
    draw(0);                    // one static pass: the wash, no trail
  } else {
    start();
    // Don't burn frames in a background tab
    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
  }
})();
