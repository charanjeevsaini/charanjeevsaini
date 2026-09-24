/* ============================================================================
   Home — the configurator section's live part
   ----------------------------------------------------------------------------
   Shows a real part from the Products configurator (the Bimetal Contact
   Rivet at its default dimensions, the ones printed around it), so the
   point of the tool is shown rather than described. Drag turns it; wheel and vertical
   swipes still scroll the page. Without WebGL the rendered image stays.
   ========================================================================== */
import { TYPES, DEFAULT_TWEAKS, createLab, webglAvailable } from "./rivet-lab.js";

const host = document.getElementById("promoStage");
if (host && webglAvailable()) {
  try {
    const t = TYPES.find(x => x.id === "bimetal");
    const dims = Object.fromEntries(t.params.map(q => [q.k, q.def]));
    const mats = Object.fromEntries(t.mats.map(q => [q[0], q[3]]));
    const lab = createLab(host, Object.assign({}, DEFAULT_TWEAKS), { frame: 1.5 });
    lab.controls.enableZoom = false;
    lab.controls.enablePan = false;
    lab.canvas.style.touchAction = "pan-y";
    lab.setPart(t, dims, mats, false);
    lab.applyFinish(); lab.applyDisplay();
    lab.setAutoRotate(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    host.classList.add("is-live");
  } catch (e) { /* the rendered image stays */ }
}
