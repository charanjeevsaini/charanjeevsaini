/* ============================================================================
   Configurator teaser — landing page
   ----------------------------------------------------------------------------
   A taste of the full "create your rivet" tool: three presets, a live render
   and one head-diameter slider. Everything else is deliberately left to the
   real configurator on the Products page, which this links to. Shares the same
   renderer, so the part shown here is the part shown there.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("cfgTeaser");
  if (!root || !window.Rivet3D) return;

  var canvas = root.querySelector("#teaseCanvas");
  var ctx = canvas.getContext("2d");
  var slider = root.querySelector("#teaseDia");
  var readout = root.querySelector("#teaseDiaOut");
  var note = root.querySelector("#teaseNote");
  var link = root.querySelector("#teaseOpen");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Each preset mirrors the same-named construction in configurator.js, so the
     link hands the full tool a part the visitor already recognises. */
  var PRESETS = {
    "semi-tubular": {
      label: "Semi Tubular",
      spec: { headDia: 5.0, headThk: 0.9, shankDia: 2.2, shankLen: 4.5,
              headStyle: "flat", tubular: true, bodyMat: "copper", facingThk: 0 },
      note: "Hollow shank, cold-headed from ETP copper — the workhorse for wiring harness joints."
    },
    "formed": {
      label: "Formed",
      spec: { headDia: 5.0, headThk: 1.0, shankDia: 2.0, shankLen: 4.5,
              headStyle: "dome", tubular: false, bodyMat: "brass", facingThk: 0 },
      note: "Solid brass with a domed head, formed to your drawing for structural fastening."
    },
    "bimetal-contact": {
      label: "Bimetal Contact",
      spec: { headDia: 5.0, headThk: 1.1, shankDia: 2.0, shankLen: 3.4,
              headStyle: "flat", tubular: false, bodyMat: "copper",
              facingThk: 0.55, facingMat: "silver" },
      note: "Copper body under a silver-alloy contact facing, for switching duty."
    }
  };

  var current = "semi-tubular";
  var mesh = null, rotY = 0.6, rotX = -0.42, spinning = !reduced;
  var dragging = false, lastX = 0, lastY = 0, resumeAt = 0;

  function build() {
    var p = PRESETS[current];
    var spec = {};
    for (var k in p.spec) spec[k] = p.spec[k];
    spec.headDia = parseFloat(slider.value);
    /* Keep the part a rivet: the shank tracks the head rather than outgrowing it. */
    spec.shankDia = Math.min(p.spec.shankDia, spec.headDia * 0.55);

    mesh = new window.Rivet3D.Mesh(window.Rivet3D.buildProfile(spec), 88);
    readout.textContent = spec.headDia.toFixed(1) + " mm";
    note.textContent = p.note;
    link.href = "products.html#configurator";
    draw();
  }

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
    if (!mesh) return;

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

  function loop() {
    if (spinning && !dragging && Date.now() > resumeAt) { rotY += 0.005; draw(); }
    window.requestAnimationFrame(loop);
  }

  /* ---- preset buttons ---------------------------------------------------- */
  var chips = root.querySelectorAll("[data-preset]");
  Array.prototype.forEach.call(chips, function (chip) {
    chip.addEventListener("click", function () {
      current = chip.getAttribute("data-preset");
      Array.prototype.forEach.call(chips, function (c) {
        c.setAttribute("aria-pressed", String(c === chip));
      });
      slider.value = PRESETS[current].spec.headDia;
      build();
    });
  });

  slider.addEventListener("input", build);

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
      entries.forEach(function (en) { spinning = !reduced && en.isIntersecting; });
    }, { threshold: 0.1 }).observe(canvas);
  }

  window.addEventListener("resize", draw);
  build();
  loop();
})();
