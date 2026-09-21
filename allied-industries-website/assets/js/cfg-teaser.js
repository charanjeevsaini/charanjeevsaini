/* ============================================================================
   Configurator teaser — landing page
   ----------------------------------------------------------------------------
   An illustration, not a tool: one part turning slowly, with the detail and
   the link beside it. It deliberately carries no controls — a single exposed
   dimension implies the configurator only does that one thing. Shares the
   renderer with the real configurator, so the part shown here is the part
   the Products page draws.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("cfgTeaser");
  if (!root || !window.Rivet3D) return;

  var canvas = root.querySelector("#teaseCanvas");
  var ctx = canvas.getContext("2d");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* A bimetal contact rivet: it shows both a body material and a contact
     facing, so the illustration carries more of what the tool can do than a
     plain rivet would. */
  var mesh = new window.Rivet3D.Mesh(window.Rivet3D.buildProfile({
    headDia: 5.0, headThk: 1.1, shankDia: 2.0, shankLen: 3.4,
    headStyle: "flat", tubular: false, bodyMat: "copper",
    facingThk: 0.55, facingMat: "silver"
  }), 88);

  var rotY = 0.6, rotX = -0.42;
  var dragging = false, lastX = 0, lastY = 0, resumeAt = 0;

  function draw() {
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    if (canvas.width !== Math.round(r.width * dpr)) {
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);

    var cx = r.width / 2, cy = r.height / 2;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(r.width, r.height) * 0.55);
    g.addColorStop(0, "rgba(166,127,103,0.20)");
    g.addColorStop(1, "rgba(166,127,103,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);

    mesh.render(ctx, {
      cx: cx, cy: cy,
      scale: Math.min(r.width, r.height) * 0.62 / mesh.extent,
      rotX: rotX, rotY: rotY, reveal: 1, alpha: 1
    });
  }

  /* The loop stops rather than idling: re-scheduling a callback every frame
     for a canvas nobody can see keeps the compositor awake for nothing. */
  var running = false;
  function loop() {
    if (!running) return;
    if (!dragging && Date.now() > resumeAt) { rotY += 0.005; draw(); }
    window.requestAnimationFrame(loop);
  }
  var onScreen = true, pageVisible = !document.hidden;
  function sync() {
    var want = onScreen && pageVisible && !reduced;
    if (want === running) return;
    running = want;
    if (running) window.requestAnimationFrame(loop);
  }

  /* ---- drag to turn, same gesture as the hero ---------------------------- */
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.011;
    rotX = Math.max(-1.3, Math.min(1.3, rotX + (e.clientY - lastY) * 0.009));
    lastX = e.clientX; lastY = e.clientY;
    draw();
  });
  ["pointerup", "pointercancel"].forEach(function (ev) {
    canvas.addEventListener(ev, function () { dragging = false; resumeAt = Date.now() + 900; });
  });

  /* Only spin while it is on screen — an offscreen canvas costs frames for
     nothing, which is what a low-end phone feels first. */
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { onScreen = en.isIntersecting; });
      sync();
    }, { threshold: 0.1 }).observe(canvas);
  }
  /* Two independent facts, one decision. An IntersectionObserver callback
     arrives asynchronously, so a plain start()/stop() pair could let a late
     "still on screen" undo a "tab was hidden". */
  document.addEventListener("visibilitychange", function () {
    pageVisible = !document.hidden;
    sync();
  });
  sync();

  window.addEventListener("resize", draw);
  draw();
})();
