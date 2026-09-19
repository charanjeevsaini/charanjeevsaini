/* ============================================================================
   Allied Industries — interaction & motion
   ----------------------------------------------------------------------------
   No animation library. Everything here is IntersectionObserver + rAF driving
   opacity/transform only, so it stays at 60fps on low-end Android and adds
   nothing to Cumulative Layout Shift.
   ========================================================================== */
(function () {
  "use strict";

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = motionQuery.matches;
  motionQuery.addEventListener("change", function (e) { reduced = e.matches; });

  var supportsIO = "IntersectionObserver" in window;

  /* ------------------------------------------------------------ helpers -- */
  function onFrame(fn) {
    var ticking = false;
    return function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { fn(); ticking = false; });
    };
  }

  /* ----------------------------------------------- header + scroll meter -- */
  var header = document.querySelector(".site-header");
  var progress = document.querySelector(".scroll-progress");

  var onScroll = onFrame(function () {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 8);
    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }
  });
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------- mobile panel -- */
  var toggle = document.querySelector(".nav-toggle");
  var panel = document.querySelector(".mobile-panel");
  var closeBtn = document.querySelector(".mobile-panel-close");
  var lastFocused = null;

  function focusablesIn(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input, select, textarea'),
      function (el) { return el.offsetParent !== null; }
    );
  }

  function openPanel() {
    if (!panel) return;
    lastFocused = document.activeElement;
    panel.classList.add("is-open");
    document.body.classList.add("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "true");
    var first = focusablesIn(panel)[0];
    if (first) first.focus();
  }

  function closePanel() {
    if (!panel) return;
    panel.classList.remove("is-open");
    document.body.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      panel.classList.contains("is-open") ? closePanel() : openPanel();
    });
    if (closeBtn) closeBtn.addEventListener("click", closePanel);

    /* Close on navigation so the panel never persists across an anchor jump */
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) closePanel();
    });

    /* Escape always exits, and Tab is trapped while the panel owns the screen */
    document.addEventListener("keydown", function (e) {
      if (!panel.classList.contains("is-open")) return;
      if (e.key === "Escape") { closePanel(); return; }
      if (e.key !== "Tab") return;

      var items = focusablesIn(panel);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* ------------------------------------------------------ scroll reveals -- */
  /* Stagger children of a group so a grid arrives as a wave, not all at once */
  Array.prototype.forEach.call(document.querySelectorAll("[data-reveal-group]"), function (group) {
    var step = parseInt(group.getAttribute("data-reveal-group"), 10) || 70;
    Array.prototype.forEach.call(group.querySelectorAll("[data-reveal]"), function (el, i) {
      if (!el.style.transitionDelay) {
        el.style.transitionDelay = Math.min(i * step, 480) + "ms";
      }
    });
  });

  var reveals = document.querySelectorAll("[data-reveal]");

  if (!supportsIO || reduced) {
    /* No observer, or motion is not wanted: show the finished state now */
    Array.prototype.forEach.call(reveals, function (el) {
      el.classList.add("is-visible");
      el.style.transitionDelay = "";
    });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);   /* reveal once, then stop */
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    Array.prototype.forEach.call(reveals, function (el) { revealObserver.observe(el); });
  }

  /* ----------------------------------------------------------- counters -- */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute("data-counter"));
    var suffix = el.getAttribute("data-suffix") || "";
    if (isNaN(target)) return;

    if (reduced) { el.textContent = target + suffix; return; }

    var duration = 1400;
    var start = null;

    function tick(now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      /* easeOutExpo — fast off the line, settles gently on the final value */
      var eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll("[data-counter]");
  if (counters.length) {
    if (!supportsIO) {
      Array.prototype.forEach.call(counters, runCounter);
    } else {
      var counterObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          counterObserver.unobserve(entry.target);
        });
      }, { threshold: 0.5 });
      Array.prototype.forEach.call(counters, function (el) { counterObserver.observe(el); });
    }
  }

  /* ----------------------------------------------------------- parallax -- */
  /* Decorative layers only. Small deltas so foreground and background never
     visibly desync, and it is skipped entirely on touch/reduced-motion. */
  var parallaxItems = document.querySelectorAll("[data-parallax]");
  var wantsParallax = parallaxItems.length && !reduced &&
                      window.matchMedia("(hover: hover) and (min-width: 900px)").matches;

  if (wantsParallax) {
    var onParallax = onFrame(function () {
      var vh = window.innerHeight;
      Array.prototype.forEach.call(parallaxItems, function (el) {
        var rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > vh) return;   /* offscreen: skip */
        var speed = parseFloat(el.getAttribute("data-parallax")) || 0.08;
        var centre = rect.top + rect.height / 2 - vh / 2;
        el.style.transform = "translate3d(0," + (-centre * speed).toFixed(2) + "px,0)";
      });
    });
    window.addEventListener("scroll", onParallax, { passive: true });
    window.addEventListener("resize", onParallax, { passive: true });
    onParallax();
  }

  /* ------------------------------------------------------------ marquee -- */
  Array.prototype.forEach.call(document.querySelectorAll(".marquee"), function (marquee) {
    var track = marquee.querySelector(".marquee-track");
    if (!track) return;

    /* Duplicate the logo set so translateX(-50%) loops seamlessly */
    if (!reduced && !track.hasAttribute("data-cloned")) {
      var clone = track.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      Array.prototype.forEach.call(clone.children, function (c) { c.setAttribute("tabindex", "-1"); });
      Array.prototype.forEach.call(clone.children, function (c) { track.appendChild(c); });
      track.setAttribute("data-cloned", "true");
    }

    /* An explicit stop control — hover-pause alone is not keyboard reachable */
    var btn = marquee.querySelector(".marquee-pause");
    if (btn) {
      btn.addEventListener("click", function () {
        var paused = marquee.classList.toggle("is-paused");
        btn.setAttribute("aria-pressed", paused ? "true" : "false");
        btn.setAttribute("aria-label", paused ? "Resume logo scrolling" : "Pause logo scrolling");
      });
    }

    /* Stop the animation entirely while the strip is offscreen */
    if (supportsIO && !reduced) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          track.style.animationPlayState = entry.isIntersecting ? "" : "paused";
        });
      }, { threshold: 0 }).observe(marquee);
    }
  });

  /* -------------------------------------------------------------- forms -- */
  Array.prototype.forEach.call(document.querySelectorAll("form[data-validate]"), function (form) {
    var summary = form.querySelector(".error-summary");
    var summaryList = summary ? summary.querySelector("ul") : null;
    var status = form.querySelector(".form-status");

    function fieldOf(input) { return input.closest(".field"); }

    function messageFor(input) {
      if (input.validity.valueMissing) {
        return (input.getAttribute("data-label") || "This field") + " is required.";
      }
      if (input.validity.typeMismatch && input.type === "email") {
        return "Enter a complete email address, like name@company.com.";
      }
      if (input.validity.tooShort) {
        return "Please give us a little more detail — at least " + input.minLength + " characters.";
      }
      return "Please check this entry.";
    }

    function setError(input, message) {
      var field = fieldOf(input);
      if (!field) return;
      field.classList.add("is-invalid");
      input.setAttribute("aria-invalid", "true");
      var slot = field.querySelector(".error .error-text");
      if (slot) slot.textContent = message;
    }

    function clearError(input) {
      var field = fieldOf(input);
      if (!field) return;
      field.classList.remove("is-invalid");
      input.removeAttribute("aria-invalid");
    }

    /* Suppress the native bubbles so our own summary + inline errors run.
       Set here rather than in the markup so that with JS disabled the browser
       still enforces `required` on its own. */
    form.setAttribute("novalidate", "");

    var inputs = Array.prototype.slice.call(form.querySelectorAll("input, textarea, select"));

    inputs.forEach(function (input) {
      /* Validate on blur, not on every keystroke */
      input.addEventListener("blur", function () {
        if (input.value.trim() === "" && !input.required) { clearError(input); return; }
        input.checkValidity() ? clearError(input) : setError(input, messageFor(input));
      });
      /* Once corrected, clear immediately so the error does not linger */
      input.addEventListener("input", function () {
        if (fieldOf(input) && fieldOf(input).classList.contains("is-invalid") && input.checkValidity()) {
          clearError(input);
        }
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var invalid = inputs.filter(function (i) { return !i.checkValidity(); });

      if (invalid.length) {
        invalid.forEach(function (i) { setError(i, messageFor(i)); });

        if (summary && summaryList) {
          summaryList.innerHTML = "";
          invalid.forEach(function (i) {
            var li = document.createElement("li");
            var a = document.createElement("a");
            a.href = "#" + i.id;
            a.textContent = (i.getAttribute("data-label") || i.name) + " — " + messageFor(i);
            a.addEventListener("click", function (ev) { ev.preventDefault(); i.focus(); });
            li.appendChild(a);
            summaryList.appendChild(li);
          });
          summary.classList.add("is-visible");
          summary.focus();             /* focus the summary, not the field */
        } else {
          invalid[0].focus();
        }
        return;
      }

      if (summary) summary.classList.remove("is-visible");

      /* Static site: hand off to the visitor's mail client with everything
         pre-filled. Swap this block for a fetch() POST to add a form backend. */
      var btn = form.querySelector('[type="submit"]');
      if (btn) {
        btn.setAttribute("aria-busy", "true");
        btn.dataset.label = btn.textContent;
        btn.innerHTML = '<span class="spinner" aria-hidden="true"></span> Opening your email…';
      }

      var to = form.getAttribute("data-mailto");
      var subject = form.getAttribute("data-subject") || "Website enquiry";
      var lines = [];
      inputs.forEach(function (i) {
        if (!i.value.trim()) return;
        lines.push((i.getAttribute("data-label") || i.name) + ": " + i.value.trim());
      });

      window.setTimeout(function () {
        window.location.href = "mailto:" + to +
          "?subject=" + encodeURIComponent(subject) +
          "&body=" + encodeURIComponent(lines.join("\n"));

        if (btn) {
          btn.removeAttribute("aria-busy");
          btn.textContent = btn.dataset.label;
        }
        if (status) {
          status.classList.add("is-visible", "is-success");
        }
      }, 350);
    });
  });

  /* ---------------------------------------------------------------- misc -- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
