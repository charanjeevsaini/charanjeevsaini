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

  var mesh = null, rotY = 0.6, rotX = -0.42, spinning = !reduced;
  var dragging = false, lastX = 0, lastY = 0;

  function readSpec() {
    var facing = val("facing").value;
    return {
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
    }), 56);

    // Shank can never exceed the head, or it is not a rivet
    var warn = root.querySelector("#cfgWarn");
    var bad = s.shankDia >= s.headDia;
    warn.hidden = !bad;

    writeSpec(s);
    draw();
  }

  function rows(s) {
    return [
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
    g.addColorStop(0, "rgba(217,125,63,0.13)");
    g.addColorStop(1, "rgba(217,125,63,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, r.width, r.height);

    mesh.render(ctx, {
      cx: cx, cy: cy,
      scale: Math.min(r.width, r.height) * 0.66 / mesh.extent,
      rotX: rotX, rotY: rotY, reveal: 1, alpha: 1
    });
  }

  function loop() {
    if (spinning && !dragging) { rotY += 0.005; draw(); }
    window.requestAnimationFrame(loop);
  }

  /* ---- input wiring ------------------------------------------------------ */
  root.querySelectorAll("input, select").forEach(function (el) {
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

  window.addEventListener("resize", draw, { passive: true });
  rebuild();
  loop();
})();
