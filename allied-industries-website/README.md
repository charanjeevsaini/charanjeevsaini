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

## Images

Most of the product photography is shot on a white backdrop, which reads as a
bright panel on a dark page. Two things handle this:

- The hero art (`hero-cutout-rivets-cut.webp`) had its backdrop removed so the
  parts float on the page. The same treatment was tried on the other photos
  and rejected: where the parts are silver, they are too close in colour to
  the backdrop and the cut eats into them.
- Everywhere else the photo is presented as a lit panel with a gradient scrim
  grounding its lower edge into the card.

Client logos sit on light plates rather than being flattened to silhouettes —
some of these logos are knockout text inside a filled shape, and silhouetting
them erases the wordmark entirely.

## Known follow-ups

- **Dimensional tolerance chart** (`products/contact-rivets.html`): the image
  previously published here was a grey placeholder graphic, not the real
  chart, so it has been removed. The section now lists the six dimensions
  held to tolerance (taken from the page's own copy) and asks the visitor to
  request the chart. **No tolerance values have been invented.** To publish
  the real figures, replace the `.spec-params` list with a `<table
  class="spec-table">` inside a `.table-wrap` — both are already styled.

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
