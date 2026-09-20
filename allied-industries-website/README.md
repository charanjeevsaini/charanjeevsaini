# Allied Industries — Website

Static HTML/CSS/JS site for Allied Industries (rivet & electrical contact
manufacturer, New Delhi). No build step — deploy the folder as-is to any
static host (Netlify, Vercel static, GitHub Pages, or plain shared hosting).

## Structure

```
index.html                     Home
about.html                     About / infrastructure
quality.html                   ISO 9001 / IATF 16949 certification
gallery.html                   Product photo gallery
careers.html                   Careers (mailto-based application)
contact.html                   Contact (call / WhatsApp / mailto form)
products/metal-rivets.html     Metal Rivets product line
products/contact-rivets.html   Contact Rivets product line + tolerance chart
assets/css/styles.css          Design tokens + all styles
assets/js/main.js              Nav, scroll-reveal, stat counters
assets/images/                 Real product photography, client logos,
                                certificate scans (extracted from the
                                company's own material)
```

## Design system

`assets/css/styles.css` holds every token at the top (`:root`). The palette is
dark-industrial, sampled from the company's own product photography —
graphite/steel surfaces with a copper accent. Changing a brand colour means
editing one variable, not hunting through rules.

Motion is CSS + IntersectionObserver only — no animation library, nothing to
install, and it stays smooth on low-end Android. Everything animates
`opacity`/`transform` exclusively, so no animation contributes to layout
shift. `prefers-reduced-motion` renders the finished state immediately.

Elements marked `[data-reveal]` are hidden only once JS confirms it is
running (the `js` class is set in `<head>`), so with JS disabled — or for a
crawler — all content is visible.

## Contact form

The contact and careers forms are static (`mailto:`) — submitting opens
the visitor's email client with the message pre-filled to
`info@alliedindustries.in`. To capture submissions server-side instead
(e.g. with Formspree or Web3Forms), replace the `submit` handler in
`contact.html` / `careers.html` with a `fetch()` POST to your form
endpoint — no other changes needed.

## 3D (no library)

`assets/js/rivet3d.js` is a small software renderer for surfaces of
revolution. A rivet is a lathe form, so it needs no general 3D engine: the
profile is revolved, each quad is shaded with a key/fill/rim light model and
painted back to front onto a 2D canvas. About 8KB, no dependency, and it runs
at 60fps on low-end hardware — where three.js would have been ~600KB.

Two things use it:

- `assets/js/hero.js` — dashed bezier paths stream in from both edges and
  converge on the centre. Arriving particles accumulate "mass", and that mass
  drives the part's assembly from the shank up. Tap to send a ripple through
  the flow; drag to steer it.
- `assets/js/configurator.js` — the "Create your rivet" section on both
  product pages. Form controls drive the same renderer live, and the spec
  can be sent as a quote request.

Profiles are built by `Rivet3D.buildProfile({headDia, headThk, shankDia,
shankLen, headStyle, tubular, bodyMat, facingThk, facingMat})`, all in mm.

## Images

**All photography and client logos have been removed.** In their place:

- `assets/images/rivets/*.webp` — ten labelled cross-section diagrams, one per
  rivet type, extracted from the supplied `rivet-types-merged.pdf`. These are
  real content and are used on the product pages and the homepage product
  cards. They are drawn on a light ground, so their containers carry
  `.is-diagram` (contain, light panel, no scrim) rather than being cropped and
  darkened like a photo.
- Everything else is a **deliberate placeholder** (`.ph`): a drawn panel with
  crop-mark corners naming what belongs there. Replace each one with an
  `<img>` when the real asset exists. Client logos use `.ph-logo` name plates,
  which also avoids publishing third-party marks before that is cleared.

## Known follow-ups

- **Dimensional tolerance chart** (`products/contact-rivets.html`): the image
  previously published here was a grey placeholder graphic, not the real
  chart, so it has been removed. The section now lists the six dimensions
  held to tolerance (taken from the page's own copy) and asks the visitor to
  request the chart. **No tolerance values have been invented.** To publish
  the real figures, replace the `.spec-params` list with a `<table
  class="spec-table">` inside a `.table-wrap` — both are already styled.

- **Technical data** (both product pages): the material, plating and alloy
  comparisons are **general engineering reference**, not Allied's published
  capability list, and the page says so. Confirm the ranges, alloys and
  finishes against what the plant actually runs before this goes live.

- **Certificates**: the ISO 9001:2015 and IATF 16949:2016 certificate
  scans on `quality.html` show a validity date of 08 March 2025. If these
  have been renewed, replace
  `assets/images/certificates/iso-9001-2015.webp` and
  `iatf-16949-2016.webp` with the current scans.
- **Google Maps embed** on `contact.html` requires no API key (uses the
  no-key `output=embed` query form) but depends on the visitor's network
  allowing `google.com` — the address is also shown as plain text above
  it as a fallback.
- Fonts (IBM Plex Sans / IBM Plex Mono) load from Google Fonts; the CSS
  falls back to system fonts if that's blocked on a given network.
