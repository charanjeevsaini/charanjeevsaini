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
assets/js/contact3d.js         Photoreal 3D parts (three.js / WebGL): the
                                hero rivet contact and the configurator parts
assets/js/rivet-lab.js         The ten constructions in 3D (dimensions, alloys,
                                finishes, section view) for the configurator
assets/js/rivet3d.js           2D canvas fallback renderer (no WebGL)
assets/js/hero.js              Hero flow + drag / spin for the hero part
assets/js/home-stack.js        Home "What we manufacture" stacking cards (scroll depth)
assets/js/home-configurator.js Home-page configurator section (live part)
assets/js/configurator.js      Products-page configurator UI (module)
assets/images/range/           Range thumbnails, rendered from rivet-lab.js
assets/vendor/three/           three.js r184 + OrbitControls (MIT), self-hosted
assets/images/                 Real product photography, client logos,
                                certificate scans (extracted from the
                                company's own material)
```

## Contact form

The contact and careers forms are static (`mailto:`) — submitting opens
the visitor's email client with the message pre-filled to
`info@alliedindustries.in`. To capture submissions server-side instead
(e.g. with Formspree or Web3Forms), replace the `submit` handler in
`contact.html` / `careers.html` with a `fetch()` POST to your form
endpoint — no other changes needed.

The quote form under the configurator (`products.html#customSpec`,
handled in `assets/js/configurator.js`) mirrors every configurator tweak
and accepts an optional drawing. A `mailto:` link cannot carry an
attachment, so when a drawing is attached it uses the system share sheet
on phones and tablets, and on desktop it downloads a ready-to-send
`.eml` draft (addressed, with the spec and drawing attached) that opens
in Outlook, Apple Mail or Thunderbird. A plain-email fallback link is
always shown. A server endpoint would remove the extra step.

## Known follow-ups

- **Certificates**: the ISO 9001:2015 and IATF 16949:2016 certificate
  scans on `quality.html` show a validity date of 08 March 2025. If these
  have been renewed, replace
  `assets/images/certificates/iso-9001-2015.webp` and
  `iatf-16949-2016.webp` with the current scans.
- **Google Maps embed** on `contact.html` requires no API key (uses the
  no-key `output=embed` query form) but depends on the visitor's network
  allowing `google.com` — the address is also shown as plain text above
  it as a fallback.
- Font: Space Grotesk (variable, 300–700), self-hosted in `assets/fonts/`
  under the SIL Open Font License; no third-party font requests.
