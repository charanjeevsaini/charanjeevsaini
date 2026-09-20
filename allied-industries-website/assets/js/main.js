/* ============================================================================
   Allied Industries — interaction & motion
   ----------------------------------------------------------------------------
   No animation library. Everything here is IntersectionObserver + rAF driving
   opacity/transform only, so it stays at 60fps on low-end Android and adds
   nothing to Cumulative Layout Shift.
   ========================================================================== */

/* When the site is embedded — the artifact preview, or any iframe — the HOST
   page keeps its own scroll position across an in-frame navigation. The new
   page's own scrollY is already 0; it is the host that is still scrolled, so
   a link clicked from halfway down one page appears to open the next page
   halfway down. Ask the host to bring the top of the frame back into view.

   Left alone on purpose: a URL carrying a hash (that navigation is meant to
   land mid-page) and a back/forward step (the browser's restore is correct). */
(function () {
  "use strict";
  if (window.top === window.self) return;          // not embedded, nothing to do
  if (window.location.hash) return;                // deep link: land where asked

  var entries = window.performance && window.performance.getEntriesByType
    ? window.performance.getEntriesByType("navigation") : null;
  if (entries && entries[0] && entries[0].type === "back_forward") return;

  try {
    // 'instant' matters: html has scroll-behavior:smooth, and a page that
    // slides into place on every load reads as a glitch.
    document.documentElement.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
  } catch (e) {
    try { document.documentElement.scrollIntoView(); } catch (e2) { /* already at top */ }
  }
})();

/* Shared by the scroll-reveal observer and the tab panels, which live in
   separate IIFEs below.

   The stagger delay is for the arrival only. Left on the element it also
   delays every later transition — hover lift, tilt, glow — so the second and
   third card in a row answered the pointer late and out of step with the
   first. Drop it once the reveal has finished, and mark the element settled
   so the CSS can hand its transform back to tilt. */
var clearStagger = (function () {
  function ms(value) {
    var n = parseFloat(value) || 0;
    return /ms/.test(value) ? n : n * 1000;       /* computed values are in s */
  }
  return function (el) {
    var longest = 0;
    getComputedStyle(el).transitionDuration.split(",").forEach(function (d) {
      longest = Math.max(longest, ms(d));
    });
    window.setTimeout(function () {
      el.style.transitionDelay = "";
      el.classList.add("is-settled");
    }, ms(el.style.transitionDelay) + longest + 60);
  };
})();

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
      el.classList.add("is-visible", "is-settled");
      el.style.transitionDelay = "";
    });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        clearStagger(entry.target);
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

/* ============================================================================
   Pointer-reactive surfaces: spotlight glow, 3D tilt, and the data tabs.
   Kept in its own scope so the core page behaviour above stays independent.
   ========================================================================== */
(function () {
  "use strict";

  var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = mq.matches;
  mq.addEventListener("change", function (e) { reduced = e.matches; });
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ------------------------------------------------- spotlight glow ------ */
  /* Cards read --x/--y in viewport space; their gradients are
     background-attachment: fixed, so the light appears to stay still in the
     world while the cards move through it. */
  var glows = Array.prototype.slice.call(document.querySelectorAll(".glow"));
  if (glows.length && fine) {
    var gx = 0, gy = 0, gQueued = false;

    function flushGlow() {
      gQueued = false;
      var vw = window.innerWidth;
      for (var i = 0; i < glows.length; i++) {
        var el = glows[i];
        var r = el.getBoundingClientRect();
        if (r.bottom < -240 || r.top > window.innerHeight + 240) continue;

        /* Element-local, not viewport. The cards are transformed, which makes
           `background-attachment: fixed` resolve against the card rather than
           the viewport — so viewport coordinates put the spotlight outside
           every card except whichever one happened to contain them. */
        el.style.setProperty("--x", (gx - r.left).toFixed(1));
        el.style.setProperty("--y", (gy - r.top).toFixed(1));
        el.style.setProperty("--xp", (gx / vw).toFixed(3));

        /* Fade the whole effect out as the pointer leaves the card, so the
           spotlight belongs to the card under the cursor rather than smearing
           a highlight across every card in the row. */
        var near = Math.max(
          Math.abs(gx - (r.left + r.width / 2)) / (r.width / 2 + 140),
          Math.abs(gy - (r.top + r.height / 2)) / (r.height / 2 + 140)
        );
        el.style.setProperty("--glow-on", String(Math.max(0, 1 - near).toFixed(3)));
      }
    }

    document.addEventListener("pointermove", function (e) {
      gx = e.clientX; gy = e.clientY;
      if (!gQueued) { gQueued = true; window.requestAnimationFrame(flushGlow); }
    }, { passive: true });
    window.addEventListener("scroll", function () {
      if (!gQueued) { gQueued = true; window.requestAnimationFrame(flushGlow); }
    }, { passive: true });
  }

  /* -------------------------------------------------------- 3D tilt ------ */
  if (fine) {
    Array.prototype.forEach.call(document.querySelectorAll(".tilt"), function (el) {
      var max = parseFloat(el.getAttribute("data-tilt")) || 6;   // degrees

      el.addEventListener("pointerenter", function () {
        if (reduced) return;
        el.classList.add("is-tilting");
      });

      el.addEventListener("pointermove", function (e) {
        if (reduced) return;
        var r = el.getBoundingClientRect();
        var nx = (e.clientX - r.left) / r.width - 0.5;
        var ny = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--tilt-y", (nx * max).toFixed(2) + "deg");
        el.style.setProperty("--tilt-x", (-ny * max).toFixed(2) + "deg");
        el.style.setProperty("--tilt-lift", "-6px");
      });

      el.addEventListener("pointerleave", function () {
        el.classList.remove("is-tilting");     // longer easing on the way back
        el.style.setProperty("--tilt-y", "0deg");
        el.style.setProperty("--tilt-x", "0deg");
        el.style.setProperty("--tilt-lift", "0px");
      });
    });
  }

  /* ---------------------------------------------------- data tabs -------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-tabs]"), function (group) {
    var tabs = Array.prototype.slice.call(group.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;               // roving tabindex
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (!panel) return;
        panel.hidden = !on;

        /* A hidden panel is display:none, so its cards never intersect and
           the observer never fires for them. Run the reveal here instead,
           staggered, so switching tabs animates the panel in. */
        if (on) {
          var items = panel.querySelectorAll("[data-reveal]");
          Array.prototype.forEach.call(items, function (el, i) {
            el.classList.remove("is-visible", "is-settled");
            el.style.transitionDelay = Math.min(i * 60, 360) + "ms";
          });
          // Next frame, so the removal above is actually painted first
          window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
              Array.prototype.forEach.call(items, function (el) {
                el.classList.add("is-visible");
                clearStagger(el);
              });
            });
          });
        }
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") next = tabs[0];
        else if (e.key === "End") next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });

    select(tabs.find(function (t) { return t.getAttribute("aria-selected") === "true"; }) || tabs[0], false);
  });
})();

/* ============================================================================
   Scroll spy for in-page jump links (the Products family switch).
   Marking the link you are actually reading is honest; pre-filling one is not.
   ========================================================================== */
(function () {
  "use strict";
  var links = Array.prototype.slice.call(document.querySelectorAll('.type-switch a[href^="#"]'));
  if (!links.length || !("IntersectionObserver" in window)) return;

  var map = {};
  links.forEach(function (a) {
    var el = document.getElementById(a.getAttribute("href").slice(1));
    if (el) map[el.id] = a;
  });

  var seen = {};
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { seen[e.target.id] = e.intersectionRatio; });
    // Whichever target currently occupies most of the viewport wins
    var best = null, bestRatio = 0;
    Object.keys(seen).forEach(function (id) {
      if (seen[id] > bestRatio) { bestRatio = seen[id]; best = id; }
    });
    links.forEach(function (a) {
      var on = best && a.getAttribute("href") === "#" + best && bestRatio > 0.12;
      a.setAttribute("aria-current", on ? "true" : "false");
    });
  }, { threshold: [0, 0.12, 0.3, 0.55, 0.8] });

  Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
})();

/* ============================================================================
   Gallery showcase — one large stage, a rail of thumbnails beneath.
   Arrows, arrow keys and the rail all drive the same index; the stage
   crossfades rather than jumping, and the caption is announced politely.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.getElementById("showcase");
  if (!root) return;

  var shots  = root.querySelectorAll(".shot");
  var thumbs = root.querySelectorAll(".thumb");
  var caps   = root.querySelectorAll(".cap-line");
  var now    = document.getElementById("shotNow");
  var prev   = root.querySelector(".showcase-arrow.prev");
  var next   = root.querySelector(".showcase-arrow.next");
  var rail   = root.querySelector(".showcase-rail");
  if (!shots.length) return;

  var count = shots.length;
  var at = 0;

  function show(i, moveFocus) {
    at = (i + count) % count;

    Array.prototype.forEach.call(shots, function (el, n) {
      var on = n === at;
      el.classList.toggle("is-current", on);
      /* The outgoing figure stays in the layout for the crossfade, so hide it
         from assistive tech explicitly rather than relying on opacity. */
      if (on) { el.removeAttribute("aria-hidden"); }
      else { el.setAttribute("aria-hidden", "true"); }
    });

    Array.prototype.forEach.call(thumbs, function (el, n) {
      var on = n === at;
      el.classList.toggle("is-current", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
      el.tabIndex = on ? 0 : -1;                       // roving tabindex
      if (on && moveFocus) el.focus();
    });

    Array.prototype.forEach.call(caps, function (el, n) {
      el.classList.toggle("is-current", n === at);
    });

    if (now) now.textContent = String(at + 1);
    keepThumbInView();
  }

  /* Keep the active thumbnail on screen without yanking the page around it. */
  function keepThumbInView() {
    if (!rail || !thumbs[at]) return;
    var t = thumbs[at].getBoundingClientRect();
    var r = rail.getBoundingClientRect();
    if (t.left < r.left + 4) rail.scrollLeft -= (r.left + 4 - t.left);
    else if (t.right > r.right - 4) rail.scrollLeft += (t.right - (r.right - 4));
  }

  if (prev) prev.addEventListener("click", function () { show(at - 1, false); });
  if (next) next.addEventListener("click", function () { show(at + 1, false); });

  Array.prototype.forEach.call(thumbs, function (el) {
    el.addEventListener("click", function () {
      show(parseInt(el.getAttribute("data-goto"), 10) || 0, false);
    });
  });

  /* Arrow keys move the rail the way a tablist should; Home/End jump. */
  if (rail) {
    rail.addEventListener("keydown", function (e) {
      var k = e.key, to = null;
      if (k === "ArrowRight") to = at + 1;
      else if (k === "ArrowLeft") to = at - 1;
      else if (k === "Home") to = 0;
      else if (k === "End") to = count - 1;
      if (to === null) return;
      e.preventDefault();
      show(to, true);
    });
  }

  /* Arrow keys also work from anywhere on the page, as long as the visitor
     is not typing into something. */
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    /* e.target can be `document`, which has no closest(), so check for it. */
    var t = e.target;
    if (t && typeof t.closest === "function" &&
        (t.closest("input, textarea, select, [contenteditable]") || t.closest(".showcase-rail"))) return;
    if (e.key === "ArrowRight") { show(at + 1, false); }
    else if (e.key === "ArrowLeft") { show(at - 1, false); }
    else return;
    e.preventDefault();
  });

  /* Swipe on touch, which is what the rail invites on a phone. */
  var sx = 0, sy = 0, tracking = false;
  var frame = root.querySelector(".showcase-frame");
  if (frame) {
    frame.addEventListener("touchstart", function (e) {
      if (e.touches.length !== 1) return;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; tracking = true;
    }, { passive: true });
    frame.addEventListener("touchend", function (e) {
      if (!tracking) return;
      tracking = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.4) show(at + (dx < 0 ? 1 : -1), false);
    }, { passive: true });
  }

  show(0, false);
})();
