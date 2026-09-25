/* ============================================================================
   Home — "What we manufacture" stacking cards
   ----------------------------------------------------------------------------
   A port of components/ui/stacking-card.tsx (motion's useScroll/useTransform)
   to plain scroll maths. Each card is position: sticky in CSS, so the stack
   works without script; this only adds the depth: as later cards slide over
   an earlier one it scales down and shades, and each photo settles from a
   slight zoom as its card arrives. Transforms only, one rAF per scroll.
   ========================================================================== */
(function () {
  "use strict";
  var stack = document.querySelector("[data-stack]");
  if (!stack) return;
  var cards = Array.prototype.slice.call(stack.querySelectorAll(".stack-card"));
  var imgs = cards.map(function (c) { return c.querySelector(".stack-media img"); });
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var wide = window.matchMedia("(min-width: 861px)");
  var queued = false;

  function stickTop(card) { return parseFloat(getComputedStyle(card).top) || 0; }

  function update() {
    queued = false;
    if (reduced.matches || !wide.matches) {
      cards.forEach(function (c, i) { c.style.transform = ""; c.style.setProperty("--shade", 0); if (imgs[i]) imgs[i].style.transform = ""; });
      return;
    }
    var vh = window.innerHeight;
    var rects = cards.map(function (c) { return c.getBoundingClientRect(); });
    var tops = cards.map(stickTop);
    cards.forEach(function (c, i) {
      // How far each later card has travelled over this one (0..1 each)
      var depth = 0;
      for (var j = i + 1; j < cards.length; j++) {
        var travel = rects[j].height;
        var t = 1 - (rects[j].top - tops[j]) / travel;
        depth += Math.max(0, Math.min(1, t));
      }
      c.style.transform = "scale(" + (1 - depth * 0.04).toFixed(4) + ")";
      c.style.setProperty("--shade", Math.min(0.45, depth * 0.12).toFixed(3));
      // Photo zoom: 1.25 -> 1 as the card rises from the bottom of the viewport to its stuck position
      var e = (vh - rects[i].top) / Math.max(1, vh - tops[i]);
      e = Math.max(0, Math.min(1, e));
      if (imgs[i]) imgs[i].style.transform = "scale(" + (1.25 - 0.25 * e).toFixed(4) + ")";
    });
  }
  function queue() { if (!queued) { queued = true; window.requestAnimationFrame(update); } }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  if (reduced.addEventListener) { reduced.addEventListener("change", queue); wide.addEventListener("change", queue); }
  update();
})();
