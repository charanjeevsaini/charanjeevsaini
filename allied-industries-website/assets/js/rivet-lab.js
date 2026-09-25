/* ============================================================================
   rivet-lab — the ten Allied constructions in 3D (three.js, WebGL)
   ----------------------------------------------------------------------------
   A port of the "Allied Industries rivet 3D models" reference: the same ten
   parametric parts, the same contact alloys and base metals, the same four
   surface finishes (polished, turned, tumbled, satin) with their procedural
   turning-mark and grain textures, the same studio, shadow and turntable.

   What it adds for the website: the stage is a component the page can place
   and theme (transparent canvas, no page-level layout), it only renders
   while on screen, and the section view fills the cut faces so a bimetal
   part shows its silver layer on the copper instead of a hollow shell.

   Exports: TYPES, MATS, FACING, BASE, FINISHES, createLab(host, tweaks).
   ========================================================================== */
import * as THREE from "../vendor/three/three.module.min.js";
import { OrbitControls } from "../vendor/three/OrbitControls.js";

const MM = 0.001, SEG = 96, D2R = Math.PI / 180;

/* ---- materials ------------------------------------------------------------ */
export const MATS = {
  "Ag 99.9":          { c: 0xefeeea, r: 0.15, hex: "#efeeea", note: "Fine silver" },
  "AgNi 10":          { c: 0xdfdedb, r: 0.22, hex: "#dfdedb", note: "Silver nickel, 10% Ni" },
  "AgNi 15":          { c: 0xd9d8d5, r: 0.25, hex: "#d9d8d5", note: "Silver nickel, 15% Ni" },
  "AgCdO 12":         { c: 0xd8d4c8, r: 0.30, hex: "#d8d4c8", note: "Silver cadmium oxide" },
  "AgSnO₂ 12":        { c: 0xcfcfcb, r: 0.32, hex: "#cfcfcb", note: "Silver tin oxide" },
  "Hard gold plated": { c: 0xe6bf62, r: 0.18, hex: "#e6bf62", note: "Hard gold over silver" },
  "ETP copper":       { c: 0xd98a62, r: 0.26, hex: "#d98a62", note: "C11000" },
  "Brass":            { c: 0xd9b56e, r: 0.28, hex: "#d9b56e", note: "CuZn" },
  "Nickel":           { c: 0xa8a69e, r: 0.34, hex: "#a8a69e", note: "Weldable" },
  "CuNi":             { c: 0xb9a293, r: 0.32, hex: "#b9a293", note: "Copper nickel" },
  "Steel":            { c: 0x8f9296, r: 0.45, hex: "#8f9296", note: "Low carbon" }
};
export const FACING = ["Ag 99.9", "AgNi 10", "AgNi 15", "AgCdO 12", "AgSnO₂ 12", "Hard gold plated"];
export const BASE = ["ETP copper", "Brass", "Nickel", "CuNi", "Steel"];
export const FINISHES = { polished: "Polished", turned: "Turned", tumbled: "Tumbled", plated: "Satin" };

let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function canvasTex(w, h, paint, rep) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  paint(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 8;
  return t;
}
let TEX_TURN = null, TEX_GRAIN = null;
function textures() {
  if (TEX_TURN) return;
  // turning marks: fine concentric rings, running along the lathe profile
  TEX_TURN = canvasTex(4, 1024, (x, w, h) => {
    for (let y = 0; y < h; y++) {
      const v = 165 + (rnd() - 0.5) * 36 + (y % 11 === 0 ? 18 : 0);
      x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, y, w, 1);
    }
  }, [1, 3]);
  // tumbled / cold-headed grain: soft isotropic noise
  TEX_GRAIN = canvasTex(256, 256, (x, w, h) => {
    const img = x.createImageData(w, h);
    for (let i = 0; i < w * h; i++) { const v = 110 + rnd() * 110; img.data.set([v, v, v, 255], i * 4); }
    x.putImageData(img, 0, 0); x.globalAlpha = 0.5; x.filter = "blur(1px)"; x.drawImage(x.canvas, 0, 0);
  }, [6, 6]);
}
const FINISH = {
  polished: { rough: 0.55, map: null,    bump: 0,     coat: 0.25 },
  turned:   { rough: 1.0,  map: "turn",  bump: 0.012, coat: 0 },
  tumbled:  { rough: 1.35, map: "grain", bump: 0.02,  coat: 0 },
  plated:   { rough: 1.8,  map: "grain", bump: 0.006, coat: 0 }
};

/* ---- profile helpers (mm; contour runs from the top axis to the bottom) --- */
const arc = (cx, cy, r, a0, a1, n = 10) => {
  const p = [];
  for (let i = 0; i <= n; i++) { const a = (a0 + (a1 - a0) * i / n) * D2R; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return p;
};
const dedupe = (pts) => pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6);

// clip a contour to the band yLo <= y <= yHi, closing to the axis
function band(pts, yHi, yLo) {
  const out = [];
  const inside = (y) => y <= yHi + 1e-9 && y >= yLo - 1e-9;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i > 0) {
      const q = pts[i - 1];
      for (const lv of [yHi, yLo]) {
        if ((q[1] - lv) * (p[1] - lv) < 0) {
          const t = (lv - q[1]) / (p[1] - q[1]);
          out.push([q[0] + (p[0] - q[0]) * t, lv]);
        }
      }
    }
    if (inside(p[1])) out.push(p);
  }
  if (out.length && out[0][0] > 1e-6) out.unshift([0, out[0][1]]);
  if (out.length && out[out.length - 1][0] > 1e-6) out.push([0, out[out.length - 1][1]]);
  return dedupe(out);
}

// lathe with hard edges kept hard: split into smooth runs, lathe each, merge
function latheGeo(contour) {
  const pts = dedupe(contour).slice().reverse();
  const runs = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    runs[runs.length - 1].push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
      const b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(a - b); if (d > Math.PI) d = 2 * Math.PI - d;
      if (d > 32 * D2R) runs.push([pts[i]]);
    }
  }
  const geos = runs.filter(r => r.length > 1)
    .map(r => new THREE.LatheGeometry(r.map(p => new THREE.Vector2(p[0], p[1])), SEG).toNonIndexed());
  return merge(geos);
}
function merge(geos) {
  const out = new THREE.BufferGeometry();
  for (const key of ["position", "normal", "uv"]) {
    const arrs = geos.map(g => g.getAttribute(key).array);
    const len = arrs.reduce((s, a) => s + a.length, 0);
    const buf = new Float32Array(len); let o = 0;
    for (const a of arrs) { buf.set(a, o); o += a.length; }
    out.setAttribute(key, new THREE.BufferAttribute(buf, key === "uv" ? 2 : 3));
  }
  geos.forEach(g => g.dispose());
  return out;
}
const mesh = (name, geo, m) => { geo.scale(MM, MM, MM); const x = new THREE.Mesh(geo, m); x.name = name; return x; };

// facing cap that follows the outer contour (face + rim), constant thickness t
function capTop(c, t) {
  c = dedupe(c);
  let k = 0;
  while (k < c.length - 1 && !(c[k][0] > 1e-6 && Math.abs(c[k + 1][0] - c[k][0]) < 1e-6 && c[k + 1][1] < c[k][1])) k++;
  const top = c.slice(0, k + 1), off = top.map(([x, y]) => [x, y - t]);
  const lower = band(c, top[k][1] - t, -1e9);
  return { cap: [...top, ...off.slice().reverse()], rest: [...off, ...lower.slice(2)] };
}
const mirror = (c) => c.map(([x, y]) => [x, -y]).reverse();
function capBottom(c, t) { const r = capTop(mirror(c), t); return { cap: mirror(r.cap), rest: mirror(r.rest) }; }
function capped(g, c, { t, t2, top, bottom, core, mTop, mBot, mCore }) {
  const a = capTop(c, t);
  g.add(mesh(top, latheGeo(a.cap), mTop));
  if (bottom) {
    const b = capBottom(a.rest, t2);
    g.add(mesh(bottom, latheGeo(b.cap), mBot || mTop));
    g.add(mesh(core, latheGeo(b.rest), mCore));
  } else g.add(mesh(core, latheGeo(a.rest), mCore));
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const fmt = (v) => String(Number((+v).toFixed(2)));

// flat head + shank; all values in mm. e = small underside edge radius
function flatRivet({ R, H, f, rs, L, u, c, t = 0, e = 0.08 }) {
  rs = Math.min(rs, R - 0.1);
  u = clamp(u, 0, R - rs - e - 0.02);
  f = clamp(f, 0, Math.min(H - t - e - 0.02, R - rs - u - e));
  c = clamp(c, 0, Math.min(rs - 0.05, L * 0.5));
  return [
    [0, H], ...arc(R - f, H - f, f, 90, 0), ...arc(R - e, e, e, 0, -90, 5),
    ...arc(rs + u, -u, u, 90, 180, 8), [rs, -L + c], [rs - c, -L], [0, -L]
  ];
}
function domeTop(R, H, He, n = 24) {
  const h = H - He, Rs = (R * R + h * h) / (2 * h), cy = H - Rs;
  const aEnd = Math.atan2(He - cy, R) / D2R;
  return arc(0, cy, Rs, 90, aEnd, n);
}
function extrudeHead(shape, y0, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: depth - (bevel ? 2 * bevel : 0), curveSegments: 64,
    bevelEnabled: !!bevel, bevelThickness: bevel || 0, bevelSize: bevel || 0, bevelOffset: -(bevel || 0), bevelSegments: 5
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, y0 + (bevel || 0), 0);
  return g;
}
const shankContour = (rs, top, L, c = 0.2) => [[0, top], [rs, top], [rs, -L + c], [rs - c, -L], [0, -L]];

/* ---- the ten types -------------------------------------------------------- */
const P = (k, label, def, min, max, step = 0.05) => ({ k, label, def, min, max, step });
export const TYPES = [
  {
    id: "solid", name: "Solid Contact Rivet", sub: "Ag / AgNi — one piece",
    desc: "Cold-headed from a single silver-alloy wire. The shank stays soft for riveting while the head is work-hardened for contact life.",
    build: "Monolithic, cold headed", use: "Relays, thermostats, low-current switches",
    params: [P("headD", "Head diameter", 6, 2, 12, 0.1), P("headH", "Head thickness", 1.4, 0.4, 4), P("edgeR", "Head edge radius", 0.35, 0, 1.5), P("shankD", "Shank diameter", 3, 0.8, 6, 0.1), P("shankL", "Shank length", 2.5, 0.5, 10, 0.1), P("filletR", "Shank-to-head radius", 0.25, 0, 1), P("chamfer", "Shank end chamfer", 0.2, 0, 0.8)],
    mats: [["body", "Contact alloy", FACING, "Ag 99.9"]],
    summary: p => `Head Ø${fmt(p.headD)} × ${fmt(p.headH)} · Shank Ø${fmt(p.shankD)} × ${fmt(p.shankL)}`,
    make(g, p, m) { g.add(mesh("contact_body", latheGeo(flatRivet({ R: p.headD / 2, H: p.headH, f: p.edgeR, rs: p.shankD / 2, L: p.shankL, u: p.filletR, c: p.chamfer })), m.body)); }
  },
  {
    id: "bimetal", name: "Bimetal Contact Rivet", sub: "Ag layer on Cu — flat head",
    desc: "A silver-alloy contact facing pressure-welded to a copper base, then headed. Saves precious metal while keeping full contact performance.",
    build: "Ag contact facing, Cu head & shank", use: "MCBs, wiring switches, contactors",
    params: [P("headD", "Head diameter", 6, 2, 12, 0.1), P("headH", "Head thickness", 1.6, 0.5, 4), P("edgeR", "Head edge radius", 0.35, 0, 1.5), P("facing", "Facing thickness", 0.1, 0.1, 0.6, 0.01), P("shankD", "Shank diameter", 3, 0.8, 6, 0.1), P("shankL", "Shank length", 3, 0.5, 10, 0.1), P("filletR", "Shank-to-head radius", 0.25, 0, 1), P("chamfer", "Shank end chamfer", 0.2, 0, 0.8)],
    mats: [["facing", "Contact facing", FACING, "AgNi 10"], ["base", "Base metal", BASE, "ETP copper"]],
    summary: p => `Head Ø${fmt(p.headD)} × ${fmt(p.headH)} · Facing ${fmt(p.facing)} · Shank Ø${fmt(p.shankD)} × ${fmt(p.shankL)}`,
    make(g, p, m) {
      const t = Math.min(p.facing, p.headH - 0.2);
      capped(g, flatRivet({ R: p.headD / 2, H: p.headH, f: p.edgeR, rs: p.shankD / 2, L: p.shankL, u: p.filletR, c: p.chamfer, t }), { t, top: "contact_facing", core: "base", mTop: m.facing, mCore: m.base });
    }
  },
  {
    id: "radius", name: "Bimetal Radius-Head Rivet", sub: "Crowned Ag face on Cu",
    desc: "A spherical contact face concentrates force at a single point, giving stable resistance on mating contacts that are not perfectly aligned.",
    build: "Domed Ag facing, Cu base", use: "Relays, automotive switches",
    params: [P("headD", "Head diameter", 5, 2, 12, 0.1), P("headH", "Head height (at crown)", 2, 0.6, 4), P("crownR", "Crown (spherical) radius", 4.5, 1.2, 30, 0.1), P("facing", "Facing thickness", 0.1, 0.1, 0.6, 0.01), P("shankD", "Shank diameter", 2.5, 0.8, 6, 0.1), P("shankL", "Shank length", 2.5, 0.5, 10, 0.1), P("filletR", "Shank-to-head radius", 0.22, 0, 1), P("chamfer", "Shank end chamfer", 0.18, 0, 0.8)],
    mats: [["facing", "Contact facing", FACING, "AgNi 10"], ["base", "Base metal", BASE, "ETP copper"]],
    summary: p => `Head Ø${fmt(p.headD)} × ${fmt(p.headH)} · Crown R${fmt(p.crownR)} · Facing ${fmt(p.facing)} · Shank Ø${fmt(p.shankD)} × ${fmt(p.shankL)}`,
    make(g, p, m) {
      const R = p.headD / 2, H = p.headH, t = Math.min(p.facing, H - 0.3), e = 0.1;
      const rs = Math.min(p.shankD / 2, R - 0.15), u = clamp(p.filletR, 0, R - rs - e - 0.02), c = clamp(p.chamfer, 0, Math.min(rs - 0.05, p.shankL / 2));
      let Rs = Math.max(p.crownR, R + 0.001);
      const sagOf = (r) => r - Math.sqrt(r * r - R * R);
      while (H - sagOf(Rs) < t + e + 0.1 && Rs < 200) Rs *= 1.05;
      const He = H - sagOf(Rs), cy = H - Rs;
      const outer = arc(0, cy, Rs, 90, Math.atan2(He - cy, R) / D2R, 32), inner = outer.map(([x, y]) => [x, y - t]);
      g.add(mesh("contact_facing", latheGeo([...outer, ...inner.slice().reverse()]), m.facing));
      g.add(mesh("base", latheGeo([...inner, ...arc(R - e, e, e, 0, -90, 5), ...arc(rs + u, -u, u, 90, 180, 8), [rs, -p.shankL + c], [rs - c, -p.shankL], [0, -p.shankL]]), m.base));
    }
  },
  {
    id: "trimetal", name: "Trimetal Contact Rivet", sub: "Ag · Cu · Ag — both faces",
    desc: "Silver alloy is bonded on both ends of a copper core, so the head and the shank tip each act as a working contact.",
    build: "Ag head facing, Cu core, Ag shank-end facing", use: "Changeover relays, bridging contacts",
    params: [P("headD", "Head diameter", 6, 2, 12, 0.1), P("headH", "Head thickness", 1.5, 0.5, 4), P("edgeR", "Head edge radius", 0.35, 0, 1.5), P("facingHead", "Facing thickness — head", 0.1, 0.1, 0.6, 0.01), P("shankD", "Shank diameter", 3, 0.8, 6, 0.1), P("shankL", "Shank length", 2.4, 0.6, 10, 0.1), P("facingShank", "Facing thickness — shank end", 0.1, 0.1, 0.6, 0.01), P("filletR", "Shank-to-head radius", 0.25, 0, 1), P("chamfer", "Shank end chamfer", 0.25, 0, 0.8)],
    mats: [["facingHead", "Head facing", FACING, "AgCdO 12"], ["facingShank", "Shank-end facing", FACING, "AgCdO 12"], ["base", "Core metal", BASE, "ETP copper"]],
    summary: p => `Head Ø${fmt(p.headD)} × ${fmt(p.headH)} · Shank Ø${fmt(p.shankD)} × ${fmt(p.shankL)} · Facings ${fmt(p.facingHead)} / ${fmt(p.facingShank)}`,
    make(g, p, m) {
      const t = Math.min(p.facingHead, p.headH - 0.2);
      const c = clamp(p.chamfer, 0, Math.min(p.shankD / 2 - 0.05, p.shankL / 2));
      const t2 = clamp(p.facingShank, 0.02, p.shankL - c - p.filletR - 0.1);
      capped(g, flatRivet({ R: p.headD / 2, H: p.headH, f: p.edgeR, rs: p.shankD / 2, L: p.shankL, u: p.filletR, c, t }), { t, t2, top: "contact_facing_head", bottom: "contact_facing_shank", core: "core", mTop: m.facingHead, mBot: m.facingShank, mCore: m.base });
    }
  },
  {
    id: "semitubular", name: "Semi-Tubular Rivet", sub: "Drilled shank — brass / Cu",
    desc: "A blind bore in the shank end lets the rivet roll over with low setting force, protecting thin terminals and plastic housings.",
    build: "Solid head, bored shank", use: "Terminal fixing, switch assemblies",
    params: [P("headD", "Head diameter", 5.6, 2, 12, 0.1), P("headH", "Head thickness", 1.2, 0.4, 4), P("edgeR", "Head edge radius", 0.3, 0, 1.5), P("shankD", "Shank diameter", 2.8, 1, 6, 0.1), P("shankL", "Shank length", 4, 1, 12, 0.1), P("boreD", "Bore diameter", 1.8, 0.4, 5, 0.1), P("boreDepth", "Bore depth", 2.2, 0.3, 10, 0.1), P("filletR", "Shank-to-head radius", 0.22, 0, 1)],
    mats: [["body", "Rivet material", BASE, "Brass"]],
    summary: p => `Head Ø${fmt(p.headD)} × ${fmt(p.headH)} · Shank Ø${fmt(p.shankD)} × ${fmt(p.shankL)} · Bore Ø${fmt(p.boreD)} × ${fmt(p.boreDepth)}`,
    make(g, p, m) {
      const R = p.headD / 2, rs = Math.min(p.shankD / 2, R - 0.1), L = p.shankL, e = 0.1;
      const u = clamp(p.filletR, 0, R - rs - e - 0.02), f = clamp(p.edgeR, 0, Math.min(p.headH - e - 0.02, R - rs - u - e));
      const ri = clamp(p.boreD / 2, 0.1, rs - 0.15), d = clamp(p.boreDepth, 0.1, L + p.headH - ri * 0.6 - 0.3), ch = 0.08;
      const c = [[0, p.headH], ...arc(R - f, p.headH - f, f, 90, 0), ...arc(R - e, e, e, 0, -90, 5), ...arc(rs + u, -u, u, 90, 180, 8),
        [rs, -L + 0.12], [rs - 0.12, -L], [ri + ch, -L], [ri, -L + ch], [ri, -L + d], [0, -L + d + ri * 0.55]];
      g.add(mesh("rivet_body", latheGeo(c), m.body));
    }
  },
  {
    id: "trimmed", name: "Trimmed Rivet", sub: "Head flats — anti-rotation",
    desc: "Two flats are trimmed on the head so it fits narrow contact arms and locks against rotation in the carrier.",
    build: "Bimetal head with two trimmed flats", use: "Narrow contact arms, rotary switches",
    params: [P("headD", "Head diameter", 7, 2, 12, 0.1), P("flats", "Width across flats", 5.2, 1, 12, 0.1), P("headH", "Head thickness", 1.6, 0.5, 4), P("facing", "Facing thickness", 0.1, 0.1, 0.6, 0.01), P("shankD", "Shank diameter", 2.8, 0.8, 6, 0.1), P("shankL", "Shank length", 2.8, 0.5, 10, 0.1), P("chamfer", "Shank end chamfer", 0.2, 0, 0.8)],
    mats: [["facing", "Contact facing", FACING, "AgNi 10"], ["base", "Base metal", BASE, "ETP copper"]],
    summary: p => `Head Ø${fmt(p.headD)} × ${fmt(p.headH)} · A/F ${fmt(Math.min(p.flats, p.headD))} · Facing ${fmt(p.facing)} · Shank Ø${fmt(p.shankD)} × ${fmt(p.shankL)}`,
    make(g, p, m) {
      const R = p.headD / 2, w = clamp(p.flats / 2, 0.3, R - 0.001), a = Math.acos(w / R), s = R * Math.sin(a);
      const sh = new THREE.Shape();
      sh.moveTo(w, s); sh.absarc(0, 0, R, a, Math.PI - a, false); sh.lineTo(-w, -s); sh.absarc(0, 0, R, Math.PI + a, 2 * Math.PI - a, false); sh.lineTo(w, s);
      const t = Math.min(p.facing, p.headH - 0.2), rs = Math.min(p.shankD / 2, w - 0.1);
      g.add(mesh("contact_facing", extrudeHead(sh, p.headH - t, t, Math.min(0.12, t * 0.3)), m.facing));
      g.add(mesh("base_head", extrudeHead(sh, 0, p.headH - t, 0.06), m.base));
      g.add(mesh("base_shank", latheGeo(shankContour(rs, 0.05, p.shankL, clamp(p.chamfer, 0, rs - 0.05))), m.base));
    }
  },
  {
    id: "straight", name: "Straight Head Rivet", sub: "Cylindrical head — deep Ag",
    desc: "A tall, straight-sided head carries a thicker contact facing for heavy arcing duty where erosion depth matters.",
    build: "Tall cylindrical head, bimetal", use: "Contactors, motor starters",
    params: [P("headD", "Head diameter", 4, 1.5, 10, 0.1), P("headH", "Head height", 2.4, 0.6, 6), P("edgeR", "Head edge radius", 0.12, 0, 1), P("facing", "Facing thickness", 0.1, 0.1, 1.2, 0.01), P("shankD", "Shank diameter", 2.6, 0.8, 6, 0.1), P("shankL", "Shank length", 2.5, 0.5, 10, 0.1), P("filletR", "Shank-to-head radius", 0.15, 0, 1), P("chamfer", "Shank end chamfer", 0.18, 0, 0.8)],
    mats: [["facing", "Contact facing", FACING, "AgSnO₂ 12"], ["base", "Base metal", BASE, "ETP copper"]],
    summary: p => `Head Ø${fmt(p.headD)} × ${fmt(p.headH)} · Facing ${fmt(p.facing)} · Shank Ø${fmt(p.shankD)} × ${fmt(p.shankL)}`,
    make(g, p, m) {
      const t = Math.min(p.facing, p.headH - 0.2);
      capped(g, flatRivet({ R: p.headD / 2, H: p.headH, f: p.edgeR, rs: p.shankD / 2, L: p.shankL, u: p.filletR, c: p.chamfer, t }), { t, top: "contact_facing", core: "base", mTop: m.facing, mCore: m.base });
    }
  },
  {
    id: "doublehead", name: "Double Head Rivet", sub: "Two heads — Ag both faces",
    desc: "Pre-formed heads on both ends of a short shank; fitted through a contact spring to give two contact faces without a riveting step.",
    build: "Ag facing · Cu shank · Ag facing", use: "Bridging contacts, bi-directional relays",
    params: [
      P("neckD", "Shank diameter", 2.6, 0.8, 6, 0.1), P("neckL", "Shank length (between heads)", 0.6, 0.1, 6), P("filletR", "Shank-to-head radius", 0.18, 0, 1),
      P("head1D", "Head 1 diameter (top)", 5.6, 1.5, 12, 0.1), P("head1H", "Head 1 thickness", 1.1, 0.3, 4), P("head1R", "Head 1 edge radius", 0.15, 0, 1.5), P("facing1", "Head 1 facing thickness", 0.1, 0.1, 0.6, 0.01),
      P("head2D", "Head 2 diameter (bottom)", 5.6, 1.5, 12, 0.1), P("head2H", "Head 2 thickness", 1.1, 0.3, 4), P("head2R", "Head 2 edge radius", 0.15, 0, 1.5), P("facing2", "Head 2 facing thickness", 0.1, 0.1, 0.6, 0.01)
    ],
    mats: [["facing1", "Head 1 facing", FACING, "AgNi 10"], ["facing2", "Head 2 facing", FACING, "AgNi 10"], ["base", "Core metal", BASE, "ETP copper"]],
    summary: p => `Head 1 Ø${fmt(p.head1D)} × ${fmt(p.head1H)} · Head 2 Ø${fmt(p.head2D)} × ${fmt(p.head2H)} · Shank Ø${fmt(p.neckD)} × ${fmt(p.neckL)} · Facings ${fmt(p.facing1)} / ${fmt(p.facing2)}`,
    make(g, p, m) {
      const R1 = p.head1D / 2, R2 = p.head2D / 2, eb = 0.08;
      const rn = Math.min(p.neckD / 2, Math.min(R1, R2) - 0.15);
      const u = clamp(p.filletR, 0, Math.min(p.neckL / 2 - 0.001, Math.min(R1, R2) - rn - eb - 0.02));
      const t1 = Math.min(p.facing1, p.head1H - 0.15), t2 = Math.min(p.facing2, p.head2H - 0.15);
      const e1 = clamp(p.head1R, 0, Math.min(p.head1H - t1 - eb - 0.02, R1 - rn - u - eb));
      const e2 = clamp(p.head2R, 0, Math.min(p.head2H - t2 - eb - 0.02, R2 - rn - u - eb));
      const H2 = p.head2H, N = p.neckL, Ht = H2 + N + p.head1H;
      const c = [[0, Ht], ...arc(R1 - e1, Ht - e1, e1, 90, 0, 8), ...arc(R1 - eb, H2 + N + eb, eb, 0, -90, 5),
        ...arc(rn + u, H2 + N - u, u, 90, 180, 6), ...arc(rn + u, H2 + u, u, 180, 270, 6),
        ...arc(R2 - eb, H2 - eb, eb, 90, 0, 5), ...arc(R2 - e2, e2, e2, 0, -90, 8), [0, 0]];
      capped(g, c, { t: t1, t2, top: "contact_facing_head1", bottom: "contact_facing_head2", core: "core", mTop: m.facing1, mBot: m.facing2, mCore: m.base });
    }
  },
  {
    id: "doubleshank", name: "Double Shank Rivet", sub: "Oblong head — twin shanks",
    desc: "An elongated contact head on two shanks: it cannot rotate on the carrier and spreads current across a wider contact face.",
    build: "Oblong bimetal head, two shanks", use: "Heavy-duty switches, isolators",
    params: [P("headL", "Head length", 9, 3, 20, 0.1), P("headW", "Head width", 4, 1.5, 12, 0.1), P("headH", "Head thickness", 1.6, 0.5, 4), P("cornerR", "Head corner radius", 1.4, 0, 6), P("facing", "Facing thickness", 0.1, 0.1, 0.6, 0.01), P("shankD", "Shank diameter", 1.6, 0.6, 5, 0.1), P("shankL", "Shank length", 2.2, 0.5, 10, 0.1), P("pitch", "Shank pitch (centre to centre)", 5.6, 1, 18, 0.1)],
    mats: [["facing", "Contact facing", FACING, "AgNi 10"], ["base", "Base metal", BASE, "ETP copper"]],
    summary: p => `Head ${fmt(p.headL)} × ${fmt(p.headW)} × ${fmt(p.headH)} · Facing ${fmt(p.facing)} · Shanks Ø${fmt(p.shankD)} × ${fmt(p.shankL)} @ ${fmt(p.pitch)}`,
    make(g, p, m) {
      const W = p.headL / 2, Dp = p.headW / 2, r = clamp(p.cornerR, 0.001, Math.min(W, Dp) - 0.001);
      const sh = new THREE.Shape();
      sh.moveTo(-W + r, -Dp); sh.lineTo(W - r, -Dp); sh.absarc(W - r, -Dp + r, r, -Math.PI / 2, 0); sh.lineTo(W, Dp - r); sh.absarc(W - r, Dp - r, r, 0, Math.PI / 2);
      sh.lineTo(-W + r, Dp); sh.absarc(-W + r, Dp - r, r, Math.PI / 2, Math.PI); sh.lineTo(-W, -Dp + r); sh.absarc(-W + r, -Dp + r, r, Math.PI, Math.PI * 1.5);
      const t = Math.min(p.facing, p.headH - 0.2);
      g.add(mesh("contact_facing", extrudeHead(sh, p.headH - t, t, Math.min(0.12, t * 0.3)), m.facing));
      g.add(mesh("base_head", extrudeHead(sh, 0, p.headH - t, 0.06), m.base));
      const rs = Math.min(p.shankD / 2, Dp - 0.1), half = clamp(p.pitch / 2, rs + 0.05, W - rs - 0.05);
      for (const [i, x] of [[1, -half], [2, half]]) {
        const s = latheGeo(shankContour(rs, 0.05, p.shankL, Math.min(0.15, rs * 0.3))); s.translate(x, 0, 0);
        g.add(mesh("base_shank_" + i, s, m.base));
      }
    }
  },
  {
    id: "projection", name: "Projection Weldable Contact", sub: "Ag on Ni / steel — weld nubs",
    desc: "No shank: projections under the base resistance-weld the contact straight onto the carrier. The silver facing sits on a weldable base.",
    build: "Ag facing on weldable base with projections", use: "Automated welding lines, appliance controls",
    params: [P("dia", "Contact diameter", 6, 2, 14, 0.1), P("thick", "Total thickness", 1.4, 0.5, 4), P("crown", "Crown height", 0.15, 0.01, 1, 0.01), P("facing", "Facing thickness", 0.1, 0.1, 0.8, 0.01), P("projD", "Projection diameter", 0.8, 0.2, 2.5), P("projH", "Projection height", 0.3, 0.05, 1, 0.01), P("pcd", "Projection pitch circle Ø", 3.6, 0.5, 12, 0.1), P("count", "Number of projections", 3, 1, 8, 1)],
    mats: [["facing", "Contact facing", FACING, "AgCdO 12"], ["base", "Weld base", BASE, "Steel"]],
    summary: p => `Ø${fmt(p.dia)} × ${fmt(p.thick)} · Facing ${fmt(p.facing)} · ${p.count} × Ø${fmt(p.projD)} × ${fmt(p.projH)} on Ø${fmt(p.pcd)} PCD`,
    make(g, p, m) {
      const R = p.dia / 2, T = p.thick, cr = clamp(p.crown, 0.005, Math.min(R * 0.9, T - 0.35)), t = clamp(p.facing, 0.05, T - cr - 0.2);
      const outer = domeTop(R, T, T - cr, 28), inner = outer.map(([x, y]) => [x, y - t]);
      g.add(mesh("contact_facing", latheGeo([...outer, ...inner.slice().reverse()]), m.facing));
      g.add(mesh("weld_base", latheGeo([...inner, [R, 0.08], [R - 0.08, 0], [0, 0]]), m.base));
      const pr = Math.min(p.projD / 2, R * 0.5), rr = clamp(p.pcd / 2, 0, R - pr - 0.05), n = Math.round(p.count);
      for (let i = 0; i < n; i++) {
        const a = i * 2 * Math.PI / n + Math.PI / 6;
        const s = new THREE.SphereGeometry(pr, 32, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
        s.scale(1, p.projH / pr, 1); s.translate((n === 1 ? 0 : rr) * Math.cos(a), 0.002, (n === 1 ? 0 : rr) * Math.sin(a));
        g.add(mesh("weld_projection_" + (i + 1), s, m.base));
      }
    }
  }
];

export const DEFAULT_TWEAKS = {
  finish: "turned", texture: 1, roughMul: 1, exposure: 1, reflect: 1.1,
  soft: 10, shadow: "soft", opacity: 0.2, azimuth: 39, speed: 1.2
};

/* ---- the stage ------------------------------------------------------------ */
function studio(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), new THREE.MeshBasicMaterial({ color: 0xb3afa7, side: THREE.BackSide })));
  const panel = (w, h, pos, rot, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color.setRGB(k, k, k); m.position.set(...pos); m.rotation.set(...rot); env.add(m);
  };
  panel(6, 4, [0, 4.9, 0], [Math.PI / 2, 0, 0], 5);
  panel(0.8, 7, [4.9, 0.5, 1.5], [0, -Math.PI / 2, 0], 6);
  panel(0.6, 7, [-4.9, 0.5, -1.8], [0, Math.PI / 2, 0], 3.5);
  panel(3.5, 1.4, [0.5, 2.2, 4.9], [0, Math.PI, 0], 2.4);
  panel(1.2, 6, [-2, 0.5, -4.9], [0, 0, 0], 1.8);
  panel(2.5, 6, [2.2, 0, -4.9], [0, 0, 0], 0.08);
  panel(2, 6, [-4.9, 0, 2.2], [0, Math.PI / 2, 0], 0.1);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: 0x5a5750 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -4.9; env.add(floor);
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.03).texture;
  pm.dispose();
  env.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

/* createLab(host, tweaks, opts)
   host   — element the transparent canvas fills (position it with CSS)
   tweaks — the live tweak object; call the apply* methods after changing it
   opts   — { interactive: true } (false for thumbnail rendering) */
export function createLab(host, tw, opts) {
  opts = Object.assign({ interactive: true }, opts || {});
  textures();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, stencil: true, preserveDrawingBuffer: !opts.interactive });
  renderer.setPixelRatio(opts.pixelRatio || Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  /* Variance shadow maps: the soft edge comes from a blur baked into the
     map, so it is identical from every camera angle. The PCF soft filter
     samples through per-pixel screen-space noise instead, which stays put
     while the shadow moves across it — the shimmer seen on the turntable. */
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.localClippingEnabled = true;
  const canvas = renderer.domElement;
  canvas.className = "lab-canvas";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.environment = studio(renderer);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.00001, 10);
  camera.position.set(3, 2.2, 4);
  let controls = null;
  if (opts.interactive) {
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = true;
  }

  // Neutral studio lights, a shadow-casting key and a dim fill from behind
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.0));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.blurSamples = 16;
  scene.add(key, key.target);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
  fill.position.set(-5, 3, -4);
  scene.add(fill);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const clip = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  const cache = {};
  let section = false, object = null, radius = 0.005;
  const center = new THREE.Vector3();

  function finishMat(m, d) {
    const f = FINISH[tw.finish] || FINISH.turned;
    const tex = f.map === "turn" ? TEX_TURN : f.map === "grain" ? TEX_GRAIN : null;
    m.roughness = Math.min(1, d.r * f.rough * tw.roughMul);
    m.roughnessMap = tex; m.bumpMap = tex && f.bump ? tex : null; m.bumpScale = f.bump * tw.texture;
    m.clearcoat = f.coat; m.clearcoatRoughness = 0.08;
    m.specularIntensity = 1; m.envMapIntensity = 1;
    m.needsUpdate = true;
  }
  function getMat(n) {
    if (!cache[n]) {
      const d = MATS[n];
      cache[n] = new THREE.MeshPhysicalMaterial({ name: n.replace(/[^\w]+/g, "_"), color: d.c, roughness: d.r, metalness: 1 });
      finishMat(cache[n], d);
    }
    const m = cache[n];
    m.clippingPlanes = section ? clip : [];
    m.side = section ? THREE.DoubleSide : THREE.FrontSide;
    return m;
  }

  /* Section caps. Each part is drawn into the stencil buffer (back faces
     up, front faces down) so what is left non-zero is the solid's interior
     where the cut plane passes through it; a plane in that part's own
     material then fills exactly that. One part at a time, so a silver facing
     and its copper base each show their own colour on the cut. */
  let caps = [];
  function clearCaps() {
    for (const c of caps) { c.parent && c.parent.remove(c); if (c.material) c.material.dispose(); }
    caps = [];
  }
  function buildCaps() {
    clearCaps();
    if (!section || !object) return;
    const parts = [];
    object.traverse(o => { if (o.isMesh && !o.userData.lab) parts.push(o); });
    const size = radius * 6;
    let order = 1;
    for (const part of parts) {
      const stencil = (side, op) => new THREE.MeshBasicMaterial({
        side, clippingPlanes: clip, depthWrite: false, depthTest: false, colorWrite: false,
        stencilWrite: true, stencilFunc: THREE.AlwaysStencilFunc,
        stencilFail: op, stencilZFail: op, stencilZPass: op
      });
      const back = new THREE.Mesh(part.geometry, stencil(THREE.BackSide, THREE.IncrementWrapStencilOp));
      const front = new THREE.Mesh(part.geometry, stencil(THREE.FrontSide, THREE.DecrementWrapStencilOp));
      back.renderOrder = front.renderOrder = order;
      const capMat = part.material.clone();
      Object.assign(capMat, {
        clippingPlanes: null, side: THREE.DoubleSide, roughnessMap: TEX_GRAIN, bumpMap: null,
        stencilWrite: true, stencilRef: 0, stencilFunc: THREE.NotEqualStencilFunc,
        stencilFail: THREE.ReplaceStencilOp, stencilZFail: THREE.ReplaceStencilOp, stencilZPass: THREE.ReplaceStencilOp
      });
      const cap = new THREE.Mesh(new THREE.PlaneGeometry(size, size), capMat);
      cap.position.set(center.x, center.y, 0);
      cap.renderOrder = order + 0.5;
      [back, front, cap].forEach(o => { o.userData.lab = true; o.castShadow = false; o.receiveShadow = false; });
      part.add(back, front);
      object.add(cap);
      caps.push(back, front, cap);
      order += 1;
    }
  }

  function frame(sphere) {
    const dist = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * (opts.frame || 1.35);
    const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
    camera.position.copy(sphere.center).add(dir.multiplyScalar(dist));
    if (controls) { controls.target.copy(sphere.center); controls.update(); }
    else camera.lookAt(sphere.center);
  }

  function setPart(type, dims, mats, keepView) {
    const m = Object.fromEntries(Object.entries(mats).map(([k, v]) => [k, getMat(v)]));
    const g = new THREE.Group(); g.name = "allied_" + type.id;
    type.make(g, dims, m);
    clearCaps();
    if (object) { scene.remove(object); object.traverse(o => { if (o.isMesh) o.geometry.dispose(); }); }
    object = g;
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
    const box = new THREE.Box3().setFromObject(g);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    center.copy(sphere.center); radius = sphere.radius;
    ground.position.y = box.min.y;
    camera.near = Math.max(sphere.radius / 100, 0.00001);
    camera.far = sphere.radius * 400;
    camera.updateProjectionMatrix();
    const span = sphere.radius * 3;
    Object.assign(key.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: sphere.radius * 4, far: sphere.radius * 60 });
    key.shadow.camera.updateProjectionMatrix();
    if (!keepView) frame(sphere);
    scene.add(g);
    buildCaps();
    applyDisplay();
  }

  function placeLight() {
    const kd = radius * 20, el = 55 * D2R, a = tw.azimuth * D2R;
    key.position.set(center.x + kd * Math.cos(el) * Math.sin(a), center.y + kd * Math.sin(el), center.z + kd * Math.cos(el) * Math.cos(a));
    key.target.position.copy(center); key.target.updateMatrixWorld();
    key.shadow.bias = -0.0002; key.shadow.normalBias = 0;
    refreshShadow();
  }
  function refreshShadow() { key.shadow.needsUpdate = true; renderer.shadowMap.needsUpdate = true; dirty = true; }

  function applyFinish() {
    for (const [n, m] of Object.entries(cache)) finishMat(m, MATS[n]);
    renderer.toneMappingExposure = tw.exposure;
    scene.environmentIntensity = tw.reflect;
    buildCaps();
    refreshShadow();
  }
  function applyDisplay() {
    key.castShadow = tw.shadow !== "off";
    key.shadow.radius = tw.shadow === "soft" ? tw.soft : 2;
    ground.material.opacity = tw.opacity;
    ground.visible = tw.shadow !== "off";
    if (controls) controls.autoRotateSpeed = tw.speed;
    placeLight();
  }
  function setSection(on) {
    section = !!on;
    for (const m of Object.values(cache)) {
      m.clippingPlanes = section ? clip : []; m.side = section ? THREE.DoubleSide : THREE.FrontSide; m.needsUpdate = true;
    }
    buildCaps();
    refreshShadow();
  }

  /* ---- sizing and the render loop ---------------------------------------- */
  let w = 0, h = 0, dirty = true, running = false, visible = true, pageVisible = !document.hidden;
  function resize() {
    // Measured off the canvas, so the page can inset it (e.g. beside an
    // open panel) with CSS alone
    const nw = canvas.clientWidth || host.clientWidth, nh = canvas.clientHeight || host.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    dirty = true;
  }
  function render() {
    resize();
    if (!w) return;
    renderer.render(scene, camera);
    dirty = false;
  }
  function tick() {
    if (!running) return;
    const moved = controls ? controls.update() : false;
    if (moved || dirty || (controls && controls.autoRotate)) render();
  }
  function sync() {
    const want = opts.interactive && visible && pageVisible;
    if (want === running) return;
    running = want;
    renderer.setAnimationLoop(running ? tick : null);
  }
  if (opts.interactive) {
    new ResizeObserver(() => { resize(); if (!running) render(); }).observe(canvas);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => { visible = es[0].isIntersecting; sync(); }, { threshold: 0 }).observe(host);
    }
    document.addEventListener("visibilitychange", () => { pageVisible = !document.hidden; sync(); });
    sync();
  }

  /* Keyboard rotation for the canvas (WCAG 2.5.7): arrows orbit the camera
     the same way a drag does, + / - zoom. */
  function orbitBy(dAz, dEl) {
    if (!controls) return;
    const off = camera.position.clone().sub(controls.target);
    const s = new THREE.Spherical().setFromVector3(off);
    s.theta += dAz;
    s.phi = Math.max(0.05, Math.min(Math.PI - 0.05, s.phi + dEl));
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
    camera.lookAt(controls.target);
    dirty = true;
  }
  function zoomBy(f) {
    if (!controls) return;
    camera.position.sub(controls.target).multiplyScalar(f).add(controls.target);
    dirty = true;
  }

  return {
    canvas, controls,
    setPart, setSection, applyFinish, applyDisplay,
    get section() { return section; },
    setAutoRotate(on) { if (controls) controls.autoRotate = !!on; dirty = true; },
    get autoRotate() { return !!(controls && controls.autoRotate); },
    orbitBy, zoomBy,
    render,
    snapshot(type) { render(); return canvas.toDataURL(type || "image/png"); },
    dispose() {
      renderer.setAnimationLoop(null);
      clearCaps();
      if (object) object.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
      Object.values(cache).forEach(m => m.dispose());
      scene.environment.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    }
  };
}

export function webglAvailable() {
  try { return !!(window.WebGL2RenderingContext && document.createElement("canvas").getContext("webgl2")); }
  catch (e) { return false; }
}
