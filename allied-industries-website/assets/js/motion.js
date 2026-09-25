/* ============================================================================
   motion.js — the small amount of script the finishing-pass motion needs
   ----------------------------------------------------------------------------
   Marks late-loading images so they can fade in (images already loaded are
   left alone, so nothing that is visible ever blinks). Tokens and effects
   live in assets/css/motion.css.
   ========================================================================== */
(function () {
  "use strict";
  var sel = ".two-col img, .cert-card img, .cfg-promo-fallback";
  Array.prototype.forEach.call(document.querySelectorAll(sel), function (img) {
    if (img.complete && img.naturalWidth) return;          // already here
    img.setAttribute("data-m-fade", "");
    function done() { img.classList.add("is-loaded"); }
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
})();
