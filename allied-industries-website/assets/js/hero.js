/* ============================================================================
   Hero — a gateway flow that becomes a rivet.
   ----------------------------------------------------------------------------
   The canvas spans the WHOLE hero band, not just the art column, so the flow
   runs behind the headline as well as the part and the two read as one layer.
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

  var W = 0, H = 0, TX = 0, TY = 0, TS = 0;   // size + convergence target
  var paths = [], ripples = [], mass = reduced ? 1 : 0;
  var spin = 0.6, tiltTarget = -0.40, tilt = -0.40, spinBias = 0, running = false;
  var shown = reduced ? 1 : 0;
  var BUILD_MS = 1500;           // whole part, start to finish
  var buildT0 = 0;

  var mesh = new window.Rivet3D.Mesh(
    window.Rivet3D.buildProfile({
      headDia: 5.2, headThk: 1.15, shankDia: 2.1, shankLen: 3.4,
      headStyle: "flat", facingThk: 0.62, bodyMat: "copper", facingMat: "silver"
    }),
    coarse ? 44 : 88
  );

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

    var n = reduced ? 0 : (coarse ? 24 : 44);
    paths = [];
    for (var i = 0; i < n; i++) {
      paths.push({
        left: i % 2 === 0,
        y: (i / n) * H * 1.5 - H * 0.25,
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

  function pts(p) {
    var x0 = p.left ? -W * 0.05 : W * 1.05;
    return [
      { x: x0, y: p.y },
      { x: p.left ? TX * 0.40 : W - (W - TX) * 0.40, y: p.y },
      { x: p.left ? TX * 0.82 : W - (W - TX) * 0.82, y: TY },
      { x: TX, y: TY }
    ];
  }

  function drawFlow(dt) {
    ctx.clearRect(0, 0, W, H);

    var glow = ctx.createRadialGradient(TX, TY, 0, TX, TY, Math.min(W, H) * 0.55);
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
        p.y += (Math.random() - 0.5) * 14;
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
      tilt += (tiltTarget - tilt) * 0.06 * dt;
      spin += 0.0042 * dt;
      mesh.render(ctx, {
        cx: TX, cy: TY,
        scale: TS * (0.90 + 0.10 * shown),
        rotX: tilt, rotY: spin + spinBias,
        reveal: shown, alpha: 1
      });
    }
    window.requestAnimationFrame(frame);
  }

  function renderStatic() {
    ctx.clearRect(0, 0, W, H);
    var glow = ctx.createRadialGradient(TX, TY, 0, TX, TY, Math.min(W, H) * 0.55);
    glow.addColorStop(0, "rgba(201,144,107,0.20)");
    glow.addColorStop(1, "rgba(201,144,107,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    mesh.render(ctx, { cx: TX, cy: TY, scale: TS, rotX: -0.40, rotY: 0.62, reveal: 1, alpha: 1 });
  }

  function start() { if (!running && !reduced) { running = true; last = performance.now(); window.requestAnimationFrame(frame); } }
  function stop()  { running = false; }

  if (!coarse && !reduced) {
    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      spinBias = ((e.clientX - r.left) / r.width - 0.5) * 0.85;
      tiltTarget = -0.40 + ((e.clientY - r.top) / r.height - 0.5) * 0.45;
    });
    stage.addEventListener("pointerleave", function () { spinBias = 0; tiltTarget = -0.40; });
  }
  stage.addEventListener("pointerdown", function (e) {
    if (reduced) return;
    var r = band.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, radius: 0, life: 1 });
  });

  new ResizeObserver(function () { resize(); if (reduced) renderStatic(); }).observe(band);
  resize();

  if (reduced) renderStatic();
  else if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { es[0].isIntersecting ? start() : stop(); }, { threshold: 0 }).observe(band);
  } else start();
})();
