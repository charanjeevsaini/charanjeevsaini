/* ============================================================================
   Hero — a gateway flow that becomes a rivet.
   ----------------------------------------------------------------------------
   Dashed bezier paths stream in from both edges and converge on the centre.
   Arriving particles accumulate "mass", and that mass drives the rivet's
   assembly from the shank up. Once formed it turns slowly and keeps feeding.
   Canvas 2D only — the rivet itself is drawn by rivet3d.js.
   ========================================================================== */
(function () {
  "use strict";

  var host = document.getElementById("heroStage");
  if (!host || !window.Rivet3D) return;

  var canvas = document.createElement("canvas");
  canvas.className = "hero-canvas";
  // Decorative: the headline beside it carries the meaning
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches;

  var W = 0, H = 0, dpr = 1;
  var paths = [], ripples = [], mass = reduced ? 1 : 0;
  var spin = 0.6, tiltTarget = -0.40, tilt = -0.40, spinBias = 0, running = false;

  /* The hero part: a bimetal contact rivet — copper body, silver facing */
  var mesh = new window.Rivet3D.Mesh(
    window.Rivet3D.buildProfile({
      headDia: 5.2, headThk: 1.15, shankDia: 2.1, shankLen: 3.4,
      headStyle: "flat", facingThk: 0.62, bodyMat: "copper", facingMat: "silver"
    }),
    coarse ? 34 : 52
  );

  function resize() {
    var r = host.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, coarse ? 2 : 2.5);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPaths();
  }

  function buildPaths() {
    var n = reduced ? 0 : (coarse ? 26 : 46);
    paths = [];
    for (var i = 0; i < n; i++) {
      paths.push({
        left: i % 2 === 0,
        y: (i / n) * H * 1.5 - H * 0.25,
        t: Math.random(),
        speed: 0.0022 + Math.random() * 0.0028,
        size: Math.random() < 0.25 ? 3.0 : 2.0
      });
    }
  }

  function bez(t, p0, p1, p2, p3) {
    var u = 1 - t, u2 = u * u, t2 = t * t;
    return {
      x: u2 * u * p0.x + 3 * u2 * t * p1.x + 3 * u * t2 * p2.x + t2 * t * p3.x,
      y: u2 * u * p0.y + 3 * u2 * t * p1.y + 3 * u * t2 * p2.y + t2 * t * p3.y
    };
  }

  function pathPoints(p, cx, cy) {
    var x0 = p.left ? -W * 0.08 : W * 1.08;
    return [
      { x: x0, y: p.y },
      { x: p.left ? cx * 0.45 : W - cx * 0.45, y: p.y },
      { x: p.left ? cx * 0.86 : W - cx * 0.86, y: cy },
      { x: cx, y: cy }
    ];
  }

  var last = 0;
  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - last) || 16, 48) / 16.67;
    last = now;

    var cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    /* --- copper light pooling where the part forms ------------------------ */
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.52);
    glow.addColorStop(0, "rgba(217,125,63," + (0.16 * mass).toFixed(3) + ")");
    glow.addColorStop(1, "rgba(217,125,63,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    /* --- ripples from taps ------------------------------------------------ */
    for (var r = ripples.length - 1; r >= 0; r--) {
      var rp = ripples[r];
      rp.radius += 13 * dt;
      rp.life -= 0.016 * dt;
      if (rp.life <= 0) ripples.splice(r, 1);
    }

    /* --- flow paths and their particles ----------------------------------- */
    ctx.lineWidth = 1;
    ctx.setLineDash([1.5, 5]);
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i];
      var pt = pathPoints(p, cx, cy);

      ctx.beginPath();
      ctx.moveTo(pt[0].x, pt[0].y);
      ctx.bezierCurveTo(pt[1].x, pt[1].y, pt[2].x, pt[2].y, pt[3].x, pt[3].y);
      ctx.strokeStyle = "rgba(195,203,209,0.26)";
      ctx.stroke();

      p.t += p.speed * dt;
      if (p.t >= 1) {
        p.t = 0;
        p.y += (Math.random() - 0.5) * 14;
        // Each arrival adds material until the part is whole
        if (mass < 1) mass = Math.min(1, mass + 0.02);
      }

      var pos = bez(p.t, pt[0], pt[1], pt[2], pt[3]);

      // Ripples shove particles off their line, then they settle back
      for (var k = 0; k < ripples.length; k++) {
        var e = ripples[k];
        var dx = pos.x - e.x, dy = pos.y - e.y;
        var d = Math.hypot(dx, dy) || 1;
        if (d < e.radius + 110 && d > e.radius - 110) {
          var force = (1 - Math.abs(d - e.radius) / 110) * e.life * 70;
          pos.x += (dx / d) * force;
          pos.y += (dy / d) * force;
        }
      }

      // Particles brighten to copper as they near the part
      var near = Math.max(0, (p.t - 0.55) / 0.45);
      var cr = 195 + (217 - 195) * near;
      var cg = 203 + (125 - 203) * near;
      var cb = 209 + (63 - 209) * near;
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(" + (cr | 0) + "," + (cg | 0) + "," + (cb | 0) + "," + (0.55 + 0.45 * near).toFixed(2) + ")";
      ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
      ctx.setLineDash([1.5, 5]);
    }
    ctx.setLineDash([]);

    /* --- the part --------------------------------------------------------- */
    if (mass > 0.01) {
      tilt += (tiltTarget - tilt) * 0.06 * dt;
      spin += 0.0042 * dt;
      var scale = Math.min(W, H) * 0.50 / mesh.extent;
      mesh.render(ctx, {
        cx: cx, cy: cy, scale: scale,
        rotX: tilt, rotY: spin + spinBias,
        reveal: mass,
        alpha: Math.min(1, mass * 1.5)
      });
    }

    window.requestAnimationFrame(frame);
  }

  /* Static, fully-formed part when motion is not wanted */
  function renderStatic() {
    ctx.clearRect(0, 0, W, H);
    var cx = W / 2, cy = H / 2;
    var glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W, H) * 0.52);
    glow.addColorStop(0, "rgba(217,125,63,0.16)");
    glow.addColorStop(1, "rgba(217,125,63,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    mesh.render(ctx, {
      cx: cx, cy: cy, scale: Math.min(W, H) * 0.50 / mesh.extent,
      rotX: -0.40, rotY: 0.62, reveal: 1, alpha: 1
    });
  }

  function start() {
    if (running || reduced) return;
    running = true; last = performance.now();
    window.requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  /* Pointer steers the part a little; taps send a ripple through the flow */
  if (!coarse && !reduced) {
    host.addEventListener("pointermove", function (e) {
      var r = host.getBoundingClientRect();
      var nx = (e.clientX - r.left) / r.width - 0.5;
      var ny = (e.clientY - r.top) / r.height - 0.5;
      spinBias = nx * 0.85;
      tiltTarget = -0.40 + ny * 0.45;
    });
    host.addEventListener("pointerleave", function () {
      spinBias = 0; tiltTarget = -0.40;
    });
  }
  host.addEventListener("pointerdown", function (e) {
    if (reduced) return;
    var r = host.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, radius: 0, life: 1 });
  });

  var ro = new ResizeObserver(function () {
    resize();
    if (reduced) renderStatic();
  });
  ro.observe(host);
  resize();

  if (reduced) {
    renderStatic();
  } else if ("IntersectionObserver" in window) {
    // Don't burn frames while the hero is scrolled away
    new IntersectionObserver(function (es) {
      es[0].isIntersecting ? start() : stop();
    }, { threshold: 0 }).observe(host);
  } else {
    start();
  }
})();
