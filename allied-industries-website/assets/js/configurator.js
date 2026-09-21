/* ============================================================================
   Create your rivet — live 3D configurator
   ----------------------------------------------------------------------------
   Drives rivet3d.js from the form controls and re-renders on every change.
   The canvas is decorative; the spec list beside it is the accessible record
   of the same state, and it is what gets sent when a quote is requested.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("configurator");
  if (!root || !window.Rivet3D) return;

  var canvas = root.querySelector("#cfgCanvas");
  var ctx = canvas.getContext("2d");
  var specList = root.querySelector("#cfgSpec");
  var quoteBtn = root.querySelector("#cfgQuote");
  var srNote = root.querySelector("#cfgSrNote");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var FACINGS = {
    none:  { label: "None (plain head)", mat: "silver" },
    AgCdO: { label: "AgCdO", mat: "silver" },
    AgNi:  { label: "AgNi",  mat: "silver" },
    AgSnO: { label: "AgSnO", mat: "silver" },
    Ag999: { label: "Ag999 (fine silver)", mat: "silver" }
  };
  var BODIES = {
    copper: "ETP Copper", brass: "Brass", steel: "Mild steel",
    alum: "Aluminium", nickel: "Nickel"
  };
  var HEADS = { flat: "Flat head", dome: "Dome / button head", countersunk: "Countersunk" };

  function val(name) { return root.querySelector('[name="' + name + '"]'); }
  function num(name) { return parseFloat(val(name).value); }


  /* Step 1: the construction sets sensible defaults and decides which of the
     dimension fields actually apply to that part. */
  var TYPES = {
    "semi-tubular":     { label: "Semi Tubular Rivet",     d: { headDia: 5.0, headThk: 0.9, shankDia: 2.2, shankLen: 4.5, headStyle: "flat",        construction: "tubular", bodyMat: "copper", facing: "none" }, hide: ["facing", "facingThk"] },
    "trimmed":          { label: "Trimmed Rivet",          d: { headDia: 5.4, headThk: 1.0, shankDia: 2.0, shankLen: 4.0, headStyle: "flat",        construction: "solid",   bodyMat: "copper", facing: "none" }, hide: ["facing", "facingThk"] },
    "straight-head":    { label: "Straight Head Rivet",    d: { headDia: 4.8, headThk: 0.8, shankDia: 2.2, shankLen: 4.0, headStyle: "flat",        construction: "solid",   bodyMat: "copper", facing: "none" }, hide: ["facing", "facingThk"] },
    "double-head-shank":{ label: "Double Head & Shank Rivet", d: { headDia: 5.2, headThk: 1.2, shankDia: 2.4, shankLen: 6.0, headStyle: "flat",     construction: "solid",   bodyMat: "brass",  facing: "none" }, hide: ["facing", "facingThk"] },
    "formed":           { label: "Formed Rivet",           d: { headDia: 5.0, headThk: 1.0, shankDia: 2.0, shankLen: 4.5, headStyle: "dome",        construction: "solid",   bodyMat: "copper", facing: "none" }, hide: ["facing", "facingThk"] },
    "copper":           { label: "Copper Rivet",           d: { headDia: 5.0, headThk: 1.1, shankDia: 2.2, shankLen: 4.0, headStyle: "dome",        construction: "solid",   bodyMat: "copper", facing: "none" }, hide: ["facing", "facingThk"] },
    "trimetal-contact": { label: "Trimetal Contact Rivet", d: { headDia: 5.2, headThk: 1.15, shankDia: 2.1, shankLen: 3.2, headStyle: "flat",       construction: "solid",   bodyMat: "copper", facing: "AgNi",  facingThk: 0.6 }, hide: [] },
    "weldable-button":  { label: "Weldable Button Contact Rivet", d: { headDia: 4.6, headThk: 0.9, shankDia: 1.6, shankLen: 1.0, headStyle: "dome", construction: "solid",   bodyMat: "copper", facing: "AgNi",  facingThk: 0.5 }, hide: [] },
    "bimetal-contact":  { label: "Bimetal Contact Rivet",  d: { headDia: 5.0, headThk: 1.1, shankDia: 2.0, shankLen: 3.4, headStyle: "flat",        construction: "solid",   bodyMat: "copper", facing: "AgCdO", facingThk: 0.55 }, hide: [] },
    "disc-contact":     { label: "Disc Contact Rivet",     d: { headDia: 6.0, headThk: 1.0, shankDia: 1.2, shankLen: 0.9, headStyle: "flat",        construction: "solid",   bodyMat: "copper", facing: "AgNi",  facingThk: 0.5 }, hide: [] }
  };
  var currentType = "semi-tubular";

  var mesh = null, rotY = 0.6, rotX = -0.42, spinning = !reduced;
  var dragging = false, lastX = 0, lastY = 0;

  function readSpec() {
    var facing = val("facing").value;
    return {
      type: currentType,
      headDia: num("headDia"), headThk: num("headThk"),
      shankDia: num("shankDia"), shankLen: num("shankLen"),
      headStyle: val("headStyle").value,
      tubular: val("construction").value === "tubular",
      bodyMat: val("bodyMat").value,
      facing: facing,
      facingThk: facing === "none" ? 0 : num("facingThk")
    };
  }

  function rebuild() {
    var s = readSpec();
    mesh = new window.Rivet3D.Mesh(window.Rivet3D.buildProfile({
      headDia: s.headDia, headThk: s.headThk,
      shankDia: s.shankDia, shankLen: s.shankLen,
      headStyle: s.headStyle, tubular: s.tubular,
      bodyMat: s.bodyMat, facingThk: s.facingThk,
      facingMat: FACINGS[s.facing].mat
    }), 88);

    // Shank can never exceed the head, or it is not a rivet
    var warn = root.querySelector("#cfgWarn");
    var bad = s.shankDia >= s.headDia;
    warn.hidden = !bad;

    writeSpec(s);
    draw();
  }

  function rows(s) {
    return [
      ["Construction type", (TYPES[s.type] || {}).label || "—"],
      ["Head diameter", s.headDia.toFixed(2) + " mm"],
      ["Head thickness", s.headThk.toFixed(2) + " mm"],
      ["Shank diameter", s.shankDia.toFixed(2) + " mm"],
      ["Shank length", s.shankLen.toFixed(2) + " mm"],
      ["Head style", HEADS[s.headStyle]],
      ["Construction", s.tubular ? "Semi-tubular" : "Solid"],
      ["Base material", BODIES[s.bodyMat]],
      ["Contact facing", FACINGS[s.facing].label],
      ["Facing thickness", s.facing === "none" ? "—" : s.facingThk.toFixed(2) + " mm"]
    ];
  }

  function writeSpec(s) {
    specList.innerHTML = "";
    rows(s).forEach(function (r) {
      var dt = document.createElement("dt"); dt.textContent = r[0];
      var dd = document.createElement("dd"); dd.textContent = r[1];
      specList.appendChild(dt); specList.appendChild(dd);
    });
    // The canvas is aria-hidden, so describe the current part in text
    srNote.textContent = "Preview showing a " + HEADS[s.headStyle].toLowerCase() +
      (s.tubular ? " semi-tubular" : " solid") + " rivet, " +
      s.headDia + " mm head by " + s.shankLen + " mm shank, in " +
      BODIES[s.bodyMat] + (s.facing === "none" ? "" : " with a " + FACINGS[s.facing].label + " contact facing") + ".";
  }

  function draw() {
    var r = canvas.getBoundingClientRect();
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
      scale: Math.min(r.width, r.height) * 0.66 / mesh.extent,
      rotX: rotX, rotY: rotY, reveal: 1, alpha: 1
    });
  }

  /* `spinning` is the visitor's pause control. `running` is whether the
     canvas is worth drawing at all — scrolled past, or the tab in the
     background. Without it this loop rendered a software 3D scene every
     frame for the whole life of the page, on screen or not. */
  var running = false;
  function loop() {
    if (!running) return;
    if (spinning && !dragging) { rotY += 0.005; draw(); }
    window.requestAnimationFrame(loop);
  }
  var onScreen = true, pageVisible = !document.hidden;
  function sync() {
    var want = onScreen && pageVisible;
    if (want === running) return;
    running = want;
    if (running) window.requestAnimationFrame(loop);
  }

  /* ---- input wiring ------------------------------------------------------ */
  root.querySelectorAll(".cfg-fields input, .cfg-fields select").forEach(function (el) {
    el.addEventListener("input", function () {
      var out = root.querySelector('[data-out="' + el.name + '"]');
      if (out) out.textContent = el.value + " mm";
      if (el.name === "facing") {
        root.querySelector("#facingThkField").hidden = el.value === "none";
      }
      rebuild();
    });
  });

  /* ---- rotation: drag, and an equivalent keyboard path ------------------- */
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.01;
    rotX = Math.max(-1.3, Math.min(1.3, rotX + (e.clientY - lastY) * 0.008));
    lastX = e.clientX; lastY = e.clientY;
    draw();
  });
  ["pointerup", "pointercancel"].forEach(function (ev) {
    canvas.addEventListener(ev, function () { dragging = false; });
  });

  // Arrow keys do everything dragging does (WCAG 2.5.7)
  canvas.addEventListener("keydown", function (e) {
    var step = 0.12, used = true;
    if (e.key === "ArrowLeft") rotY -= step;
    else if (e.key === "ArrowRight") rotY += step;
    else if (e.key === "ArrowUp") rotX = Math.max(-1.3, rotX - step);
    else if (e.key === "ArrowDown") rotX = Math.min(1.3, rotX + step);
    else used = false;
    if (used) { e.preventDefault(); draw(); }
  });

  var spinBtn = root.querySelector("#cfgSpin");
  if (spinBtn) {
    spinBtn.addEventListener("click", function () {
      spinning = !spinning;
      spinBtn.setAttribute("aria-pressed", spinning ? "true" : "false");
      spinBtn.querySelector("span").textContent = spinning ? "Pause rotation" : "Resume rotation";
    });
    if (reduced) {
      spinBtn.setAttribute("aria-pressed", "false");
      spinBtn.querySelector("span").textContent = "Resume rotation";
    }
  }

  /* ---- send the spec as a quote request ---------------------------------- */
  quoteBtn.addEventListener("click", function () {
    var s = readSpec();
    var body = ["Please quote the following rivet specification:", ""]
      .concat(rows(s).map(function (r) { return r[0] + ": " + r[1]; }))
      .concat(["", "Quantity required: ", "Target delivery date: ", "", "(Generated with the configurator on alliedindustries.in)"]);
    window.location.href = "mailto:info@alliedindustries.in?subject=" +
      encodeURIComponent("Quote request — custom rivet specification") +
      "&body=" + encodeURIComponent(body.join("\n"));
  });


  /* Applying a construction sets its defaults and drops the fields that do
     not apply to it, so the form only ever shows relevant inputs. */
  function applyType(slug) {
    var t = TYPES[slug];
    if (!t) return;
    currentType = slug;
    Object.keys(t.d).forEach(function (k) {
      var el = val(k);
      if (!el) return;
      el.value = t.d[k];
      var out = root.querySelector('[data-out="' + k + '"]');
      if (out) out.textContent = t.d[k] + " mm";
    });
    root.querySelectorAll(".cfg-field[data-field]").forEach(function (f) {
      f.hidden = t.hide.indexOf(f.getAttribute("data-field")) !== -1;
    });
    var ftf = root.querySelector("#facingThkField");
    if (ftf) ftf.hidden = t.hide.indexOf("facingThk") !== -1 || val("facing").value === "none";
    root.querySelectorAll(".type-chip").forEach(function (c) {
      c.setAttribute("aria-checked", c.getAttribute("data-type") === slug ? "true" : "false");
    });
    var ts = root.querySelector("#typeSelect");
    if (ts && ts.value !== slug) ts.value = slug;
    rebuild();
  }

  var typeSelect = root.querySelector("#typeSelect");
  if (typeSelect) {
    typeSelect.addEventListener("change", function () { applyType(typeSelect.value); });
  }

  root.querySelectorAll(".type-chip").forEach(function (chip, i, all) {
    chip.addEventListener("click", function () { applyType(chip.getAttribute("data-type")); });
    // Radio-group semantics: arrows move and select, as a radiogroup should
    chip.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1
            : e.key === "ArrowLeft"  || e.key === "ArrowUp"   ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var next = all[(i + d + all.length) % all.length];
      next.focus();
      applyType(next.getAttribute("data-type"));
    });
  });

  /* The custom-spec form carries whatever is already configured, so the
     visitor is not re-typing what they just set. */
  var customBtn = root.querySelector("#cfgCustom");
  var customForm = root.querySelector("#customSpec");
  if (customBtn && customForm) {
    customBtn.addEventListener("click", function () {
      var open = customForm.hidden;
      customForm.hidden = !open;
      customBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        var s = readSpec();
        var seed = {
          csHeadDia: s.headDia + " mm", csHeadThk: s.headThk + " mm",
          csShankDia: s.shankDia + " mm", csShankLen: s.shankLen + " mm",
          csMaterial: BODIES[s.bodyMat],
          csFacing: s.facing === "none" ? "" : FACINGS[s.facing].label + (s.facingThk ? ", " + s.facingThk + " mm" : "")
        };
        Object.keys(seed).forEach(function (k) {
          var el = customForm.querySelector("#" + k);
          if (el && !el.value) el.value = seed[k];
        });
        customForm.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
        customForm.querySelector("#csName").focus({ preventScroll: true });
      }
    });
    var closeBtn = root.querySelector("#cfgCustomClose");
    if (closeBtn) closeBtn.addEventListener("click", function () {
      customForm.hidden = true;
      customBtn.setAttribute("aria-expanded", "false");
      customBtn.focus();
    });
  }

  window.addEventListener("resize", draw, { passive: true });
  if (root.querySelector('.type-chip')) applyType(currentType); else rebuild();

  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { onScreen = en.isIntersecting; });
      sync();
    }, { threshold: 0.05 }).observe(canvas);
  }
  /* Two independent facts, one decision. An IntersectionObserver callback
     arrives asynchronously, so a plain start()/stop() pair could let a late
     "still on screen" undo a "tab was hidden". */
  document.addEventListener("visibilitychange", function () {
    pageVisible = !document.hidden;
    sync();
  });
  sync();
})();
