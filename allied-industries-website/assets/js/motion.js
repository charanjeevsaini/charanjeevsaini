/* ============================================================================
   motion.js — the small amount of script the finishing-pass motion needs
   ----------------------------------------------------------------------------
   Image loading. Any image not already on screen and decoded is held
   invisible, decoded off the main paint, then revealed with the m-img-in
   animation (motion.css). Its frame shimmers meanwhile if the image fills
   most of it and is large enough to be worth it. Covers images swapped in
   later (the gallery's data-src slides, the mega menu thumbnails).
   ========================================================================== */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function reveal(img) {
    var frame = img.__mFrame;
    function done() {
      img.classList.add("is-loaded");
      if (frame) frame.removeAttribute("data-m-wait");
    }
    if (img.decode) img.decode().then(done, done); else done();
  }

  function watch(img) {
    if (img.__mWatched) return;
    img.__mWatched = true;
    if (reduced) return;
    var hasSrc = img.getAttribute("src");
    if (hasSrc && img.complete && img.naturalWidth) return;     // already painted
    img.setAttribute("data-m-img", "");
    // Shimmer the frame only for sizeable images that fill it
    var frame = img.parentElement, r = img.getBoundingClientRect();
    if (frame && r.width >= 80) {
      var fr = frame.getBoundingClientRect();
      if (fr.width * fr.height > 0 && (r.width * r.height) / (fr.width * fr.height) > 0.6) {
        frame.setAttribute("data-m-wait", "");
        img.__mFrame = frame;
      }
    }
    img.addEventListener("load", function () { reveal(img); }, { once: true });
    img.addEventListener("error", function () { reveal(img); }, { once: true });
    if (hasSrc && img.complete && img.naturalWidth) reveal(img);   // raced us
  }

  Array.prototype.forEach.call(document.images, watch);
  // Images added or given a src later
  if ("MutationObserver" in window) {
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === "attributes" && m.target.tagName === "IMG") {
          var img = m.target;
          if (img.__mWatched && img.hasAttribute("data-m-img") && !img.classList.contains("is-loaded")) return;
          if (!img.__mWatched) watch(img);
        }
        Array.prototype.forEach.call(m.addedNodes || [], function (n) {
          if (n.tagName === "IMG") watch(n);
          else if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll("img"), watch);
        });
      });
    }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
  }
})();
