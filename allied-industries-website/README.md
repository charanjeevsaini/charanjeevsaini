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

## Contact form

The contact and careers forms are static (`mailto:`) — submitting opens
the visitor's email client with the message pre-filled to
`info@alliedindustries.in`. To capture submissions server-side instead
(e.g. with Formspree or Web3Forms), replace the `submit` handler in
`contact.html` / `careers.html` with a `fetch()` POST to your form
endpoint — no other changes needed.

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
- Fonts (IBM Plex Sans / IBM Plex Mono) load from Google Fonts; the CSS
  falls back to system fonts if that's blocked on a given network.
