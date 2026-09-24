/* ============================================================================
   Hero — a gateway flow that becomes a rivet.
   ----------------------------------------------------------------------------
   The canvas spans the whole hero band; the flow is a symmetric vortex that
   spirals in around the part, reaching equally far on either side.
   The convergence point is wherever #heroStage lands, so it stays correct at
   every breakpoint without hard-coded positions.
   ========================================================================== */
(function () {
  "use strict";

  var band  = document.querySelector(".hero");
  var flow  = document.querySelector(".hero-flow");
  var stage = document.getElementById("heroStage");
  if (!band || !flow || !stage || !window.Rivet3D) return;

  var canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
  flow.appendChild(canvas);
  var ctx = canvas.getContext("2d");

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse  = window.matchMedia("(pointer: coarse)").matches;

  var W = 0, H = 0, TX = 0, TY = 0, TS = 0, RX = 1, RY = 1;   // size + convergence target
  var paths = [], ripples = [], mass = reduced ? 1 : 0;
  var spin = 0.6, tiltTarget = -0.10, tilt = -0.10, spinBias = 0, running = false;
  var shown = reduced ? 1 : 0;
  var BUILD_MS = 1500;           // whole part, start to finish
  var buildT0 = 0;

  var mesh = new window.Rivet3D.Mesh(
    window.Rivet3D.buildProfile({
      headDia: 5.2, headThk: 1.15, shankDia: 2.85, shankLen: 2.2,
      headStyle: "flat", facingThk: 0.20, bodyMat: "copper", facingMat: "silver"
    }),
    coarse ? 44 : 88
  );

  /* The photoreal part. contact3d.js draws the copper rivet contact from the
     3D model into its own WebGL canvas inside the stage; this script keeps
     the flow, the drag and the spin, and hands it the angles. Until (or
     unless) WebGL is available the 2D mesh above stands in. */
  var gl = null;
  function attachGL() {
    if (gl || !window.Contact3D) return;
    try {
      gl = window.Contact3D.createView(stage, { fill: 0.84, shadow: 0.55 });
      gl.setModel(window.Contact3D.buildRivetContact());
      gl.canvas.style.opacity = "0";
      if (reduced && W) renderStatic();
    } catch (err) { gl = null; }
  }
  attachGL();
  window.addEventListener("contact3d:ready", attachGL);

  function drawPart(rotX, rotY, reveal, scale) {
    if (gl) {
      gl.canvas.style.opacity = reveal.toFixed(3);
      gl.render({ rotX: rotX, rotY: rotY, zoom: TS ? scale / TS : 1 });
      return;
    }
    mesh.render(ctx, { cx: TX, cy: TY, scale: scale, rotX: rotX, rotY: rotY, reveal: reveal, alpha: 1 });
  }

  function resize() {
    var br = band.getBoundingClientRect();
    var sr = stage.getBoundingClientRect();
    if (!br.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = br.width; H = br.height;
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Convergence point = centre of the art column, in canvas space
    TX = sr.left - br.left + sr.width / 2;
    TY = sr.top  - br.top  + sr.height / 2;
    TS = Math.min(sr.width, sr.height) * 0.52 / mesh.extent;

    /* The flow is a symmetric vortex around the part: streams start on an
       ellipse centred on it and spiral in. Its reach is set by the nearer
       side of the band (the right edge on desktop), so both sides extend
       equally instead of the left side running the full width of the page. */
    RX = Math.max(W - TX, W * 0.24) * 1.12;
    RY = Math.max(H * 0.56, RX * 0.78);
    var n = reduced ? 0 : (coarse ? 26 : 48);
    paths = [];
    for (var i = 0; i < n; i++) {
      paths.push({
        a: (i / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.12,
        reach: 1.0 + Math.random() * 0.28,
        t: Math.random(),
        speed: 0.0020 + Math.random() * 0.0026,
        size: Math.random() < 0.25 ? 2.8 : 1.8
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

  var SWIRL = 0.55;                        // radians each stream turns on its way in
  function around(a, k) {
    return { x: TX + Math.cos(a) * RX * k, y: TY + Math.sin(a) * RY * k };
  }
  function pts(p) {
    return [
      around(p.a, p.reach),
      around(p.a + SWIRL * 0.35, p.reach * 0.62),
      around(p.a + SWIRL * 0.8, p.reach * 0.26),
      { x: TX, y: TY }
    ];
  }

  function drawFlow(dt) {
    ctx.clearRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(TX, TY, 0, TX, TY, Math.min(RX, RY) * 0.95);
    glow.addColorStop(0, "rgba(201,144,107," + (0.20 * mass).toFixed(3) + ")");
    glow.addColorStop(1, "rgba(201,144,107,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    for (var r = ripples.length - 1; r >= 0; r--) {
      ripples[r].radius += 13 * dt;
      ripples[r].life -= 0.016 * dt;
      if (ripples[r].life <= 0) ripples.splice(r, 1);
    }

    ctx.lineWidth = 1;
    for (var i = 0; i < paths.length; i++) {
      var p = paths[i], q = pts(p);

      ctx.setLineDash([1.5, 5]);
      ctx.beginPath();
      ctx.moveTo(q[0].x, q[0].y);
      ctx.bezierCurveTo(q[1].x, q[1].y, q[2].x, q[2].y, q[3].x, q[3].y);
      ctx.strokeStyle = "rgba(242,237,230,0.16)";
      ctx.stroke();
      ctx.setLineDash([]);

      p.t += p.speed * dt;
      if (p.t >= 1) {
        p.t = 0;
        p.a += (Math.random() - 0.5) * 0.05;
      }

      var pos = bez(p.t, q[0], q[1], q[2], q[3]);
      for (var k = 0; k < ripples.length; k++) {
        var e = ripples[k];
        var dx = pos.x - e.x, dy = pos.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < e.radius + 110 && d > e.radius - 110) {
          var f = (1 - Math.abs(d - e.radius) / 110) * e.life * 70;
          pos.x += (dx / d) * f; pos.y += (dy / d) * f;
        }
      }

      // Particles warm to copper as they approach the part
      var near = Math.max(0, (p.t - 0.55) / 0.45);
      var cr = 242 + (201 - 242) * near;
      var cg = 237 + (144 - 237) * near;
      var cb = 230 + (107 - 230) * near;
      ctx.fillStyle = "rgba(" + (cr|0) + "," + (cg|0) + "," + (cb|0) + "," + (0.50 + 0.45 * near).toFixed(2) + ")";
      ctx.fillRect(pos.x - p.size / 2, pos.y - p.size / 2, p.size, p.size);
    }
  }

  var last = 0;
  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - last) || 16, 48) / 16.67;
    last = now;
    drawFlow(dt);
    // Time-based, not arrival-based: a single eased curve, so nothing in
    // the particle system can make the build stutter.
    if (!buildT0) buildT0 = now;
    var bp = Math.min(1, (now - buildT0) / BUILD_MS);
    shown = 1 - Math.pow(1 - bp, 3);          // easeOutCubic
    mass = shown;                              // glow intensity follows it
    if (shown > 0.005) {
      if (!dragging) {
        tilt += (tiltTarget - tilt) * 0.06 * dt;
        if (now > resumeAt) spin += 0.0042 * dt;
      }
      drawPart(tilt, spin + (dragging ? 0 : spinBias), shown, TS * (0.90 + 0.10 * shown));
    }
    window.requestAnimationFrame(frame);
  }

  function renderStatic() {
    ctx.clearRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(TX, TY, 0, TX, TY, Math.min(RX, RY) * 0.95);
    glow.addColorStop(0, "rgba(201,144,107,0.20)");
    glow.addColorStop(1, "rgba(201,144,107,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    drawPart(-0.10, 0.62, 1, TS);
  }

  function start() { if (!running && !reduced) { running = true; last = performance.now(); window.requestAnimationFrame(frame); } }
  function stop()  { running = false; }

  /* ---- drag to rotate ---------------------------------------------------
     Horizontal drag spins the part; vertical drag tips it through a full
     180 degrees, clamped so it never flips past its poles. Auto-spin stops
     while you hold it and resumes a moment after release. */
  var dragging = false, dragMoved = 0, lastX = 0, lastY = 0, resumeAt = 0;
  var HALF_PI = Math.PI / 2;

  stage.addEventListener("pointerdown", function (e) {
    dragging = true; dragMoved = 0;
    lastX = e.clientX; lastY = e.clientY;
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    stage.classList.add("is-dragging");
  });

  stage.addEventListener("pointermove", function (e) {
    if (dragging) {
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      dragMoved += Math.abs(dx) + Math.abs(dy);
      spin += dx * 0.011;
      // Full 180 degrees of vertical travel, pole to pole
      tilt = Math.max(-HALF_PI, Math.min(HALF_PI, tilt + dy * 0.009));
      tiltTarget = tilt;
      return;
    }
    if (coarse || reduced) return;
    var r = stage.getBoundingClientRect();
    spinBias = ((e.clientX - r.left) / r.width - 0.5) * 0.5;
    tiltTarget = -0.10 + ((e.clientY - r.top) / r.height - 0.5) * 0.30;
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    resumeAt = performance.now() + 900;
    // A tap that barely moved is a tap, so send a ripple through the flow
    if (dragMoved < 6 && !reduced) {
      var r = band.getBoundingClientRect();
      ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, radius: 0, life: 1 });
    }
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  stage.addEventListener("pointerleave", function () {
    if (dragging) return;
    spinBias = 0; tiltTarget = -0.10;
  });

  new ResizeObserver(function () { resize(); if (reduced) renderStatic(); }).observe(band);
  resize();

  if (reduced) renderStatic();
  else if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(band);
  } else start();
})();
