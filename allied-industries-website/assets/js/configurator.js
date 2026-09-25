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
import { TYPES, MATS, NONE, constructionOf, DEFAULT_TWEAKS, fmt, createLab, webglAvailable } from "./rivet-lab.js";

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
  // Facing slots set to None: their thickness does not apply
  const unused = (t, ms) => new Set((t.slots || []).filter(k => ms[k] === NONE));
  const swatch = (v) => v === NONE ? "transparent" : MATS[v].hex;
  // Remembers the alloy a facing had, so Solid -> Bimetal restores it
  const lastAlloy = {};
  // The type's one-line summary, minus facing figures for faces set to None
  const summaryOf = (t, p, ms) => {
    const noFacing = (t.slots || []).length && (t.slots || []).every(k => ms[k] === NONE);
    return t.summary(p).split(" · ").filter(seg => !(noFacing && /^Facings?\b/.test(seg))).join(" · ");
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---- 3D stage ----------------------------------------------------------- */
  let lab = null;
  let syncForm = null;           // set up with the quote form below
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
    const skip = unused(t, ms);
    return [["Part", t.name], ["Construction", constructionOf(t, ms)]]
      .concat(t.params.filter(q => !skip.has(q.k)).map(q => [q.label, q.k === "count" ? String(p[q.k]) + " pcs" : fmt(p[q.k]) + " mm"]))
      .concat(t.mats.map(q => [q[1], ms[q[0]]]));
  }
  function renderSpec(t, p, ms) {
    const used = [...new Set(Object.values(ms))].filter(v => v !== NONE);
    const matText = t.mats.filter(q => ms[q[0]] !== NONE).map(q => q[1] + ": " + ms[q[0]]).join(" · ");
    spec.innerHTML = `
      <div class="lab-spec-head">
        <span class="eyebrow">Type ${String(current + 1).padStart(2, "0")} / ${TYPES.length}</span>
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
      </div>
      <div class="lab-spec-facts">
        <dl>
          <dt>Construction</dt><dd>${constructionOf(t, ms)}</dd>
          <dt>Material</dt><dd>${matText}</dd>
          <dt>Dimensions</dt><dd>${summaryOf(t, p, ms)} mm</dd>
          <dt>Used in</dt><dd>${t.use}</dd>
        </dl>
        <div class="lab-legend">${used.map(k => `<span><i style="background:${MATS[k].hex}"></i>${k}</span>`).join("")}</div>
      </div>`;
    $("labSrNote").textContent = `${t.name}, ${constructionOf(t, ms).toLowerCase()}: ${summaryOf(t, p, ms)} mm, ${matText}.`;
  }

  function build(keepView) {
    const t = TYPES[current], p = dimsOf(t), ms = matsOf(t);
    if (lab) lab.setPart(t, p, ms, keepView);
    renderSpec(t, p, ms);
    if (syncForm) syncForm();
  }

  function renderPanel() {
    const t = TYPES[current], p = dimsOf(t), ms = matsOf(t), skip = unused(t, ms);
    const slots = t.slots || [], cons = constructionOf(t, ms);
    const consOpts = ["Solid", "Bimetal", "Trimetal"].slice(0, slots.length + 1);
    dimsBox.innerHTML =
      `<h3 class="lab-h lab-h-first"><span>Dimensions · ${t.name}</span><button type="button" class="lab-link" data-reset>Reset</button></h3>` +
      t.params.filter(q => !skip.has(q.k)).map(q => {
        const id = "dim-" + q.k, unit = q.k === "count" ? "pcs" : "mm";
        return `<div class="lab-dim">
          <label for="${id}">${q.label}</label>
          <span class="lab-num-in"><input type="number" data-k="${q.k}" min="${q.min}" max="${q.max}" step="${q.step}" value="${fmt(p[q.k])}" aria-label="${q.label} (${unit})"><em>${unit}</em></span>
          <input type="range" id="${id}" data-k="${q.k}" min="${q.min}" max="${q.max}" step="${q.step}" value="${p[q.k]}">
        </div>`;
      }).join("") +
      `<h3 class="lab-h">Materials</h3>` +
      (slots.length ? `<div class="lab-field"><span class="lab-row"><span>Construction</span></span>
        <span class="lab-seg${consOpts.length === 2 ? " lab-seg-2" : ""}" role="group" aria-label="Construction">${consOpts.map(o =>
          `<button type="button" data-cons="${o}" aria-pressed="${o === cons}">${o}</button>`).join("")}</span>
        <span class="lab-cons-note">${cons === "Solid" ? "One metal throughout — no contact facing." : cons === "Bimetal" ? "One contact facing bonded to the base metal." : "Contact facings on both faces, base metal between."}</span></div>` : "") +
      t.mats.map(([k, label, opts]) => `<label class="lab-field"><span class="lab-row"><span>${label}</span></span>
        <span class="lab-mrow"><i class="${ms[k] === NONE ? "is-none" : ""}" style="background:${swatch(ms[k])}"></i><select data-m="${k}">${opts.map(o => `<option${o === ms[k] ? " selected" : ""}>${o}</option>`).join("")}</select></span></label>`).join("");
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
    save(); renderPanel(); build(true);
  });
  dimsBox.addEventListener("click", e => {
    const cb = e.target.closest("[data-cons]");
    if (cb) {
      setConstruction(cb.dataset.cons);
      const again = dimsBox.querySelector(`[data-cons="${cb.dataset.cons}"]`); if (again) again.focus();
      return;
    }
    if (!e.target.closest("[data-reset]")) return;
    const t = TYPES[current]; delete DIMS[t.id]; delete MATSEL[t.id];
    save(); renderPanel(); build(true);
  });

  /* Solid clears every facing; Bimetal keeps the first; Trimetal fills
     both. A slot being switched on gets back the alloy it last had. */
  function setConstruction(name) {
    const t = TYPES[current], ms = matsOf(t), want = { Solid: 0, Bimetal: 1, Trimetal: 2 }[name];
    const sel = (MATSEL[t.id] = MATSEL[t.id] || {});
    const dflt = Object.fromEntries(t.mats.map(q => [q[0], q[3]]));
    (t.slots || []).forEach((k, i) => {
      if (ms[k] !== NONE) lastAlloy[t.id + k] = ms[k];
      const fallback = lastAlloy[t.id + k] || (dflt[k] !== NONE ? dflt[k] : null) || lastAlloy[t.id + t.slots[0]] || "AgNi 10";
      sel[k] = i < want ? (ms[k] !== NONE ? ms[k] : fallback) : NONE;
    });
    save(); renderPanel(); build(true);
  }

  function show(i) {
    current = (i + TYPES.length) % TYPES.length;
    typeBtns.forEach((b, j) => {
      b.setAttribute("aria-checked", j === current ? "true" : "false");
      b.tabIndex = j === current ? 0 : -1;
    });
    renderPanel(); build(false); save();
    // Crossfade the spec copy (motion.css); restart it for rapid switching
    spec.classList.remove("is-swapping"); void spec.offsetWidth; spec.classList.add("is-swapping");
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

  /* ---- the quote form --------------------------------------------------------
     Every configurator attribute, two-way: editing a field here rebuilds the
     3D part and the Tweaks panel; changing Tweaks refills the form. Plus the
     order details, free-text requirements, a drawing, and the sender.

     Sending. A mailto: link cannot carry a file, so:
       - no drawing   -> mailto with the whole spec written out
       - drawing, on a device that can share files (phones, tablets, Safari,
         Windows) -> the system share sheet with the drawing and spec
       - drawing, elsewhere -> an .eml draft (To, Subject, spec, drawing
         attached, marked unsent) that opens in Outlook / Mail / Thunderbird
     A plain-email fallback is always offered in the status line.
     ------------------------------------------------------------------------- */
  const TO = "info@alliedindustries.in";
  const form = $("customSpec");
  const f = (id) => form.querySelector("#" + id);
  const OTHER = "other";
  let formType = null, file = null;

  f("sfType").innerHTML = TYPES.map(t => `<option value="${t.id}">${t.name}</option>`).join("") +
    `<option value="${OTHER}">Other / not listed</option>`;

  function fieldHTML(id, label, input) {
    return `<div class="field"><label for="${id}">${label}</label>${input}</div>`;
  }
  function renderFormPart() {
    const other = formType === OTHER;
    f("sfType").value = other ? OTHER : TYPES[current].id;
    const consF = f("sfConsField");
    if (other) {
      consF.hidden = false;
      f("sfCons").innerHTML = ["Solid", "Bimetal", "Trimetal", "Not sure"].map(o => `<option>${o}</option>`).join("");
      f("sfDims").innerHTML = [["oHeadD", "Head diameter"], ["oHeadH", "Head thickness"], ["oShankD", "Shank diameter"], ["oShankL", "Shank length"], ["oFacing", "Facing thickness"], ["oShape", "Head shape"]]
        .map(([k, l]) => fieldHTML("sf-" + k, l, `<input type="text" id="sf-${k}" data-free="${l}" placeholder="${k === "oShape" ? "e.g. oblong, trimmed" : "mm"}">`)).join("");
      f("sfMats").innerHTML = [["oBase", "Base metal"], ["oFacingMat", "Contact facing"]]
        .map(([k, l]) => fieldHTML("sf-" + k, l, `<input type="text" id="sf-${k}" data-free="${l}" placeholder="${k === "oBase" ? "e.g. ETP copper" : "e.g. AgNi 10, or none"}">`)).join("");
      return;
    }
    const t = TYPES[current], p = dimsOf(t), ms = matsOf(t), skip = unused(t, ms), slots = t.slots || [];
    consF.hidden = !slots.length;
    f("sfCons").innerHTML = ["Solid", "Bimetal", "Trimetal"].slice(0, slots.length + 1)
      .map(o => `<option${o === constructionOf(t, ms) ? " selected" : ""}>${o}</option>`).join("");
    f("sfDims").innerHTML = t.params.filter(q => !skip.has(q.k)).map(q => fieldHTML("sf-" + q.k, q.label + (q.k === "count" ? " (pcs)" : ""),
      `<input type="number" id="sf-${q.k}" data-k="${q.k}" min="${q.min}" max="${q.max}" step="${q.step}" value="${fmt(p[q.k])}" inputmode="decimal">`)).join("");
    f("sfMats").innerHTML = t.mats.map(([k, label, opts]) => fieldHTML("sf-m-" + k, label,
      `<select id="sf-m-${k}" data-m="${k}">${opts.map(o => `<option${o === ms[k] ? " selected" : ""}>${o}</option>`).join("")}</select>`)).join("");
  }
  syncForm = () => {
    if (form.hidden || formType === OTHER) return;
    const active = document.activeElement;
    if (active && form.contains(active) && (active.dataset.k || active.dataset.m)) return;   // don't fight typing
    renderFormPart();
  };

  form.addEventListener("change", e => {
    const el = e.target;
    if (el.id === "sfType") {
      if (el.value === OTHER) { formType = OTHER; renderFormPart(); return; }
      formType = null;
      const i = TYPES.findIndex(t => t.id === el.value);
      if (i >= 0) show(i);
      renderFormPart();
      return;
    }
    if (el.id === "sfCons" && formType !== OTHER) { setConstruction(el.value); renderFormPart(); return; }
    if (el.dataset.m) {
      const t = TYPES[current];
      (MATSEL[t.id] = MATSEL[t.id] || {})[el.dataset.m] = el.value;
      save(); renderPanel(); build(true); renderFormPart();
    }
    if (el.dataset.k) renderFormPart();          // settle hidden/visible facing fields
  });
  form.addEventListener("input", e => {
    const el = e.target, k = el.dataset.k;
    if (!k) return;
    const t = TYPES[current], q = t.params.find(x => x.k === k);
    let v = parseFloat(el.value); if (!isFinite(v)) return;
    v = clamp(v, q.min, q.max);
    (DIMS[t.id] = DIMS[t.id] || {})[k] = v;
    save(); renderPanel(); build(true);
  });

  function openForm(focusNotes) {
    formType = null;
    form.hidden = false;
    ["cfgQuote", "cfgCustom"].forEach(id => $(id).setAttribute("aria-expanded", "true"));
    renderFormPart();
    form.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    (focusNotes ? f("sfNotes") : f("sfName")).focus({ preventScroll: true });
  }
  $("cfgQuote").addEventListener("click", () => openForm(false));
  $("cfgCustom").addEventListener("click", () => openForm(true));
  $("cfgCustomClose").addEventListener("click", () => {
    form.hidden = true;
    ["cfgQuote", "cfgCustom"].forEach(id => $(id).setAttribute("aria-expanded", "false"));
    $("cfgQuote").focus();
  });

  /* ---- drawing ---- */
  const MAX = 20 * 1024 * 1024;
  const drop = f("sfDrop"), fileInput = f("sfFile"), info = f("sfFileInfo");
  const kb = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(n / 1024)) + " KB";
  function setFile(x) {
    setError("sfFile", "");
    if (x && x.size > MAX) { setError("sfFile", "That file is " + kb(x.size) + " — please attach one under 20 MB."); x = null; }
    file = x || null;
    info.hidden = !file;
    drop.classList.toggle("has-file", !!file);
    if (file) info.querySelector(".sf-file-name").textContent = file.name + " · " + kb(file.size);
    else fileInput.value = "";
    f("sfHow").innerHTML = file
      ? "Opens your email with the specification <em>and</em> the drawing attached, addressed to <strong>" + TO + "</strong>."
      : "Opens your email app addressed to <strong>" + TO + "</strong> with the full specification written out.";
  }
  fileInput.addEventListener("change", () => setFile(fileInput.files[0]));
  f("sfFileRemove").addEventListener("click", () => setFile(null));
  ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", e => { const x = e.dataTransfer && e.dataTransfer.files[0]; if (x) setFile(x); });

  /* ---- validation ---- */
  function setError(id, msg) {
    const field = f(id).closest(".field") || f(id).closest(".sf-group");
    const err = form.querySelector("#" + id + "-err");
    if (err) err.querySelector(".error-text").textContent = msg;
    if (field) field.classList.toggle("is-invalid", !!msg);
    if (f(id).tagName !== "INPUT" || f(id).type === "file") return;
    if (msg) f(id).setAttribute("aria-invalid", "true"); else f(id).removeAttribute("aria-invalid");
  }
  function validate() {
    const errs = [];
    const name = f("sfName").value.trim(), email = f("sfEmail").value.trim();
    setError("sfName", name ? "" : "Please enter your name."); if (!name) errs.push(["sfName", "Name"]);
    const okMail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    setError("sfEmail", okMail ? "" : (email ? "That email address doesn't look complete." : "Please enter your email so we can reply."));
    if (!okMail) errs.push(["sfEmail", "Email"]);
    const box = f("sfErrors");
    box.querySelector("ul").innerHTML = errs.map(([id, l]) => `<li><a href="#${id}">${l}</a></li>`).join("");
    box.classList.toggle("is-visible", errs.length > 0);
    if (errs.length) f(errs[0][0]).focus();
    return !errs.length;
  }

  /* ---- the email ---- */
  function compose() {
    const lines = ["Please quote the following rivet specification."];
    const sec = (title) => lines.push("", title.toUpperCase(), "-".repeat(title.length));
    if (formType === OTHER) {
      sec("Part");
      lines.push("Construction type: Other / not listed", "Construction: " + f("sfCons").value);
      form.querySelectorAll("[data-free]").forEach(el => { if (el.value.trim()) lines.push(el.dataset.free + ": " + el.value.trim()); });
    } else {
      const t = TYPES[current], p = dimsOf(t), ms = matsOf(t), skip = unused(t, ms);
      sec("Part");
      lines.push("Construction type: " + t.name, "Construction: " + constructionOf(t, ms));
      sec("Dimensions");
      t.params.filter(q => !skip.has(q.k)).forEach(q => lines.push(q.label + ": " + (q.k === "count" ? p[q.k] + " pcs" : fmt(p[q.k]) + " mm")));
      lines.push("Summary: " + summaryOf(t, p, ms) + " mm");
      lines.push("Tolerances: " + f("sfTol").value, "Head profile: " + f("sfProfile").value);
      sec("Materials & finish");
      t.mats.forEach(q => { if (ms[q[0]] !== NONE) lines.push(q[1] + ": " + ms[q[0]]); });
    }
    if (formType === OTHER) lines.push("Tolerances: " + f("sfTol").value, "Head profile: " + f("sfProfile").value);
    lines.push("Plating: " + f("sfPlating").value, "Surface finish: " + f("sfFinish").value);
    sec("Order");
    lines.push("Quantity: " + (f("sfQty").value ? f("sfQty").value + " " + f("sfQtyUnit").value : "—"),
      "Target delivery date: " + (f("sfDate").value || "—"),
      "Application: " + (f("sfApp").value.trim() || "—"));
    if (f("sfNotes").value.trim()) { sec("Custom requirements"); lines.push(f("sfNotes").value.trim()); }
    if (file) { sec("Drawing"); lines.push("Attached: " + file.name); }
    sec("Contact");
    lines.push("Name: " + f("sfName").value.trim(), "Company: " + (f("sfCompany").value.trim() || "—"),
      "Email: " + f("sfEmail").value.trim(), "Phone: " + (f("sfPhone").value.trim() || "—"));
    lines.push("", "(Sent from the configurator on alliedindustries.in)");
    const part = formType === OTHER ? "custom part" : TYPES[current].name;
    const who = f("sfCompany").value.trim() || f("sfName").value.trim();
    return { subject: "Quote request — " + part + (who ? " — " + who : ""), body: lines.join("\n") };
  }
  const mailto = (m) => "mailto:" + TO + "?subject=" + encodeURIComponent(m.subject) + "&body=" + encodeURIComponent(m.body);

  function b64(buf) {
    const bytes = new Uint8Array(buf); let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/.{76}/g, "$&\r\n");
  }
  const utf8b64 = (str) => btoa(unescape(encodeURIComponent(str))).replace(/.{76}/g, "$&\r\n");
  async function emlDraft(m) {
    const boundary = "----allied" + Date.now().toString(36);
    const safeName = file.name.replace(/["\r\n]/g, "");
    const head = [
      "To: " + TO,
      "From: " + f("sfEmail").value.trim(),
      "Subject: =?UTF-8?B?" + btoa(unescape(encodeURIComponent(m.subject))) + "?=",
      "X-Unsent: 1",
      "MIME-Version: 1.0",
      'Content-Type: multipart/mixed; boundary="' + boundary + '"', "", "",
      "--" + boundary, "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: base64", "", utf8b64(m.body), "",
      "--" + boundary, "Content-Type: " + (file.type || "application/octet-stream") + '; name="' + safeName + '"',
      "Content-Transfer-Encoding: base64", 'Content-Disposition: attachment; filename="' + safeName + '"', "",
      b64(await file.arrayBuffer()), "", "--" + boundary + "--", ""
    ].join("\r\n");
    return new Blob([head], { type: "message/rfc822" });
  }
  function status(html) {
    const st = f("sfStatus");
    st.querySelector("span").innerHTML = html;
    st.classList.remove("is-visible", "is-success"); void st.offsetWidth;
    st.classList.add("is-visible", "is-success");
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();
    f("sfErrors").classList.remove("is-visible");
    if (!validate()) return;
    const m = compose();
    const plain = `<a href="${mailto(m).replace(/"/g, "&quot;")}">open a plain email</a>`;
    if (!file) {
      window.location.href = mailto(m);
      status("Your email app should now be open with the specification. If it didn't open, " + plain + " or write to <strong>" + TO + "</strong>.");
      return;
    }
    const touch = window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: m.subject, text: "To: " + TO + "\n\n" + m.body });
        status("Choose your email app in the share sheet and send it to <strong>" + TO + "</strong> — the drawing and spec are already in it.");
        return;
      } catch (err) { if (err && err.name === "AbortError") return; }
    }
    try {
      const blob = await emlDraft(m);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "Allied quote request.eml";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      status("Your email draft has downloaded — open <strong>Allied quote request.eml</strong> and press Send. It is addressed to " + TO + " with the specification and your drawing attached. Webmail only? " + plain + " and attach the drawing there.");
    } catch (err) {
      window.location.href = mailto(m);
      status("We couldn't attach the drawing automatically — your email app is open with the spec; please attach <strong>" + file.name.replace(/</g, "&lt;") + "</strong> before sending.");
    }
  });

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
