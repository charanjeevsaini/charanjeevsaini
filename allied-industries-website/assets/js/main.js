(function () {
  "use strict";

  var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Header shrink shadow on scroll */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Mobile nav panel */
  var toggle = document.querySelector(".nav-toggle");
  var panel = document.querySelector(".mobile-panel");
  var closeBtn = document.querySelector(".mobile-panel-close");
  function openPanel() {
    if (!panel) return;
    panel.classList.add("is-open");
    document.body.classList.add("nav-open");
    toggle.setAttribute("aria-expanded", "true");
    var firstLink = panel.querySelector("a");
    if (firstLink) firstLink.focus();
  }
  function closePanel() {
    if (!panel) return;
    panel.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }
  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var isOpen = panel.classList.contains("is-open");
      isOpen ? closePanel() : openPanel();
    });
    if (closeBtn) closeBtn.addEventListener("click", closePanel);
    panel.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closePanel);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.classList.contains("is-open")) closePanel();
    });
  }

  /* Scroll reveal */
  var revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    } else {
      var counters = new WeakMap();
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var group = el.closest("[data-reveal-group]");
            if (group) {
              var i = counters.get(group) || 0;
              el.style.setProperty("--i", i);
              counters.set(group, i + 1);
            }
            el.classList.add("is-visible");
            io.unobserve(el);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) { io.observe(el); });
    }
  }

  /* Animated stat counters */
  var counterEls = document.querySelectorAll("[data-counter]");
  if (counterEls.length && !prefersReducedMotion && "IntersectionObserver" in window) {
    var animateCounter = function (el) {
      var target = parseFloat(el.getAttribute("data-counter"));
      var suffix = el.getAttribute("data-suffix") || "";
      var duration = 1100;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = Math.round(target * eased);
        el.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    };
    var cio = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            cio.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.6 }
    );
    counterEls.forEach(function (el) { cio.observe(el); });
  } else {
    counterEls.forEach(function (el) {
      el.textContent = el.getAttribute("data-counter") + (el.getAttribute("data-suffix") || "");
    });
  }

  /* Footer year */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
