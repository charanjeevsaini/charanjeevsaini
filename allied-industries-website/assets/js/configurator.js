/* ============================================================================
   Products configurator — the ten constructions in 3D, with every tweak
   ----------------------------------------------------------------------------
   UI for rivet-lab.js. Mirrors the reference model's controls — a type list,
   Section view, Pause rotation, and a Tweaks panel holding every dimension
   and the materials (finish and lighting stay at the studio settings) —
   and adds what the website needs on top: the spec as text, a quote email
   built from it, and the custom-spec form seeded from it.

   Dimensions and materials persist per visitor in localStorage (best effort; the page works
   without it). The spec list is the accessible record of the part; the
   canvas is a picture of the same state.
   ========================================================================== */
import { TYPES, MATS, FACING, BASE, DEFAULT_TWEAKS, fmt, createLab, webglAvailable } from "./rivet-lab.js";

const root = document.getElementById("lab");
if (root) init();

function init() {
  const $ = (id) => document.getElementById(id);
  const list = $("labList"), stageEl = $("labStage"), dimsBox = $("labDims"), spec = $("labSpec");
  const twPanel = $("labTweaks"), twBtn = $("labTw"), secBtn = $("labSection"), spinBtn = $("labSpin");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STORE = "allied-configurator";

  /* ---- state ------------------------------------------------------------- */
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { saved = {}; }
  // Finish, shadow and lighting are fixed at the reference model's studio
  // settings; visitors choose the part, not the photography.
  const TW = Object.assign({}, DEFAULT_TWEAKS);
  const DIMS = saved.dims || {}, MATSEL = saved.mats || {};
  let current = Math.max(0, TYPES.findIndex(t => t.id === saved.type));
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify({ dims: DIMS, mats: MATSEL, type: TYPES[current].id })); } catch (e) {}
  };
  const dimsOf = (t) => Object.assign(Object.fromEntries(t.params.map(q => [q.k, q.def])), DIMS[t.id] || {});
  const matsOf = (t) => Object.assign(Object.fromEntries(t.mats.map(q => [q[0], q[3]])), MATSEL[t.id] || {});
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---- 3D stage ----------------------------------------------------------- */
  let lab = null;
  if (webglAvailable()) {
    try { lab = createLab(stageEl, TW); } catch (e) { lab = null; }
  }
  if (!lab) {
    $("labFallback").hidden = false;
    root.classList.add("lab-no-gl");
  } else {
    lab.setAutoRotate(!reduced);
    lab.controls.addEventListener("start", () => setSpin(false));
  }

  /* ---- type list ---------------------------------------------------------- */
  TYPES.forEach((t, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "lab-type";
    b.setAttribute("role", "radio");
    b.dataset.i = i;
    b.innerHTML = `<span class="lab-num">${String(i + 1).padStart(2, "0")}</span><span class="lab-nm">${t.name}</span><span class="lab-sub">${t.sub}</span>`;
    list.appendChild(b);
  });
  const typeBtns = Array.from(list.querySelectorAll(".lab-type"));
  list.addEventListener("click", e => { const b = e.target.closest(".lab-type"); if (b) show(+b.dataset.i); });
  // Radio-group semantics: arrows move and select within the list only
  list.addEventListener("keydown", e => {
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    show(current + d);
    typeBtns[current].focus();
  });

  /* ---- spec, summary, quote ---------------------------------------------- */
  function rows(t, p, ms) {
    return [["Construction", t.name]]
      .concat(t.params.map(q => [q.label, q.k === "count" ? String(p[q.k]) + " pcs" : fmt(p[q.k]) + " mm"]))
      .concat(t.mats.map(q => [q[1], ms[q[0]]]));
  }
  function renderSpec(t, p, ms) {
    const used = [...new Set(Object.values(ms))];
    spec.innerHTML = `
      <div class="lab-spec-head">
        <span class="eyebrow">Type ${String(current + 1).padStart(2, "0")} / ${TYPES.length}</span>
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
      </div>
      <div class="lab-spec-facts">
        <dl>
          <dt>Build</dt><dd>${t.build}</dd>
          <dt>Material</dt><dd>${t.mats.map(q => q[1] + ": " + ms[q[0]]).join(" · ")}</dd>
          <dt>Dimensions</dt><dd>${t.summary(p)} mm</dd>
          <dt>Used in</dt><dd>${t.use}</dd>
        </dl>
        <div class="lab-legend">${used.map(k => `<span><i style="background:${MATS[k].hex}"></i>${k}</span>`).join("")}</div>
      </div>`;
    $("labSrNote").textContent = `${t.name}: ${t.summary(p)} mm, ${t.mats.map(q => q[1] + " " + ms[q[0]]).join(", ")}.`;
  }

  function build(keepView) {
    const t = TYPES[current], p = dimsOf(t), ms = matsOf(t);
    if (lab) lab.setPart(t, p, ms, keepView);
    renderSpec(t, p, ms);
  }

  function renderPanel() {
    const t = TYPES[current], p = dimsOf(t), ms = matsOf(t);
    dimsBox.innerHTML =
      `<h3 class="lab-h lab-h-first"><span>Dimensions · ${t.name}</span><button type="button" class="lab-link" data-reset>Reset</button></h3>` +
      t.params.map(q => {
        const id = "dim-" + q.k, unit = q.k === "count" ? "pcs" : "mm";
        return `<div class="lab-dim">
          <label for="${id}">${q.label}</label>
          <span class="lab-num-in"><input type="number" data-k="${q.k}" min="${q.min}" max="${q.max}" step="${q.step}" value="${fmt(p[q.k])}" aria-label="${q.label} (${unit})"><em>${unit}</em></span>
          <input type="range" id="${id}" data-k="${q.k}" min="${q.min}" max="${q.max}" step="${q.step}" value="${p[q.k]}">
        </div>`;
      }).join("") +
      `<h3 class="lab-h">Materials</h3>` +
      t.mats.map(([k, label, opts]) => `<label class="lab-field"><span class="lab-row"><span>${label}</span></span>
        <span class="lab-mrow"><i style="background:${MATS[ms[k]].hex}"></i><select data-m="${k}">${opts.map(o => `<option${o === ms[k] ? " selected" : ""}>${o}</option>`).join("")}</select></span></label>`).join("");
  }

  dimsBox.addEventListener("input", e => {
    const k = e.target.dataset.k; if (!k) return;
    const t = TYPES[current], q = t.params.find(x => x.k === k);
    let v = parseFloat(e.target.value); if (!isFinite(v)) return;
    v = clamp(v, q.min, q.max);
    (DIMS[t.id] = DIMS[t.id] || {})[k] = v;
    dimsBox.querySelectorAll(`[data-k="${k}"]`).forEach(el => { if (el !== e.target) el.value = el.type === "number" ? fmt(v) : v; });
    save(); build(true);
  });
  dimsBox.addEventListener("change", e => {
    const k = e.target.dataset.m; if (!k) return;
    const t = TYPES[current];
    (MATSEL[t.id] = MATSEL[t.id] || {})[k] = e.target.value;
    e.target.previousElementSibling.style.background = MATS[e.target.value].hex;
    save(); build(true);
  });
  dimsBox.addEventListener("click", e => {
    if (!e.target.closest("[data-reset]")) return;
    const t = TYPES[current]; delete DIMS[t.id]; delete MATSEL[t.id];
    save(); renderPanel(); build(true);
  });

  function show(i) {
    current = (i + TYPES.length) % TYPES.length;
    typeBtns.forEach((b, j) => {
      b.setAttribute("aria-checked", j === current ? "true" : "false");
      b.tabIndex = j === current ? 0 : -1;
    });
    renderPanel(); build(false); save();
  }

  /* ---- toolbar ------------------------------------------------------------ */
  secBtn.addEventListener("click", () => {
    const on = secBtn.getAttribute("aria-pressed") !== "true";
    secBtn.setAttribute("aria-pressed", on);
    if (lab) lab.setSection(on);
  });
  function setSpin(on) {
    if (lab) lab.setAutoRotate(on);
    spinBtn.setAttribute("aria-pressed", on);
    spinBtn.querySelector("span").textContent = on ? "Pause rotation" : "Resume rotation";
    spinBtn.querySelector("svg").innerHTML = on
      ? '<rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/>'
      : '<path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.2-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/>';
  }
  spinBtn.addEventListener("click", () => setSpin(spinBtn.getAttribute("aria-pressed") !== "true"));
  setSpin(!!lab && !reduced);
  twBtn.addEventListener("click", () => {
    const o = twPanel.dataset.open !== "true";
    twPanel.dataset.open = o;
    twBtn.setAttribute("aria-pressed", o);
    twBtn.setAttribute("aria-expanded", o);
    root.dataset.tweaks = o;
  });

  // Keyboard orbit on the focused stage
  stageEl.addEventListener("keydown", e => {
    if (!lab || e.target !== stageEl) return;
    const s = 0.12, map = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (map[e.key]) { e.preventDefault(); setSpin(false); lab.orbitBy(map[e.key][0], map[e.key][1]); }
    else if (e.key === "+" || e.key === "=") { e.preventDefault(); lab.zoomBy(0.9); }
    else if (e.key === "-") { e.preventDefault(); lab.zoomBy(1.1); }
  });

  /* ---- quote email and the custom-spec form -------------------------------- */
  $("cfgQuote").addEventListener("click", () => {
    const t = TYPES[current], p = dimsOf(t), ms = matsOf(t);
    const body = ["Please quote the following rivet specification:", ""]
      .concat(rows(t, p, ms).map(r => r[0] + ": " + r[1]))
      .concat(["", "Quantity required: ", "Target delivery date: ", "", "(Generated with the configurator on alliedindustries.in)"]);
    window.location.href = "mailto:info@alliedindustries.in?subject=" +
      encodeURIComponent("Quote request — " + t.name) + "&body=" + encodeURIComponent(body.join("\n"));
  });

  const customBtn = $("cfgCustom"), customForm = $("customSpec");
  if (customBtn && customForm) {
    customBtn.addEventListener("click", () => {
      const open = customForm.hidden;
      customForm.hidden = !open;
      customBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (!open) return;
      const t = TYPES[current], p = dimsOf(t), ms = matsOf(t);
      const pick = (...ks) => { for (const k of ks) if (p[k] != null) return fmt(p[k]) + " mm"; return ""; };
      const facingKey = t.mats.find(q => q[2] === FACING);
      const baseKey = t.mats.find(q => q[2] === BASE);
      const facingT = pick("facing", "facingHead", "facing1");
      const seed = {
        csHeadDia: pick("headD", "head1D", "dia", "headL"), csHeadThk: pick("headH", "head1H", "thick"),
        csShankDia: pick("shankD", "neckD"), csShankLen: pick("shankL", "neckL"),
        csMaterial: baseKey ? ms[baseKey[0]] : "",
        csFacing: facingKey ? ms[facingKey[0]] + (facingT ? ", " + facingT : "") : ""
      };
      Object.keys(seed).forEach(k => { const f = customForm.querySelector("#" + k); if (f && !f.value) f.value = seed[k]; });
      const notes = customForm.querySelector("#csNotes");
      if (notes && !notes.value) notes.value = "Starting point: " + t.name + " — " + t.summary(p) + " mm.\n";
      customForm.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      customForm.querySelector("#csName").focus({ preventScroll: true });
    });
    const closeBtn = $("cfgCustomClose");
    if (closeBtn) closeBtn.addEventListener("click", () => {
      customForm.hidden = true;
      customBtn.setAttribute("aria-expanded", "false");
      customBtn.focus();
    });
  }

  /* ---- the range cards open their part here ------------------------------- */
  document.querySelectorAll(".range-card[data-type]").forEach(a => {
    a.addEventListener("click", e => {
      const i = TYPES.findIndex(t => t.id === a.dataset.type);
      if (i < 0) return;
      e.preventDefault();
      show(i);
      document.getElementById("configurator").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      history.replaceState(null, "", "#configurator");
    });
  });

  // Deep link: products.html#configurator-bimetal opens that type
  const m = /^#configurator-(\w+)$/.exec(location.hash);
  if (m) { const i = TYPES.findIndex(t => t.id === m[1]); if (i >= 0) current = i; }

  show(current);
  // Links from the Products menu change only the hash when already on this page
  window.addEventListener("hashchange", () => {
    const h = /^#configurator-(\w+)$/.exec(location.hash);
    const i = h ? TYPES.findIndex(t => t.id === h[1]) : -1;
    if (i < 0) return;
    show(i);
    document.getElementById("configurator").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  });
  if (m) requestAnimationFrame(() => document.getElementById("configurator").scrollIntoView({ block: "start" }));
  if (lab) { lab.applyFinish(); lab.applyDisplay(); }
}
