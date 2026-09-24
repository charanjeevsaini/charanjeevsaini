/* ============================================================================
   rivet3d — a tiny software 3D renderer for surfaces of revolution
   ----------------------------------------------------------------------------
   A rivet is a lathe form, so it needs no general 3D engine. We revolve a 2D
   profile, shade each quad with Lambert + a specular term, and paint back to
   front onto a 2D canvas. ~6KB, no dependencies, 60fps on low-end hardware.

   Exposes window.Rivet3D = { buildProfile, Mesh, materials }.
   ========================================================================== */
(function (global) {
  "use strict";

  /* Material palette — tuned to the site's copper/steel tokens */
  var materials = {
    copper: { r: 216, g: 150, b: 116, spec: 0.42, shine: 20 },
    silver: { r: 212, g: 216, b: 220, spec: 0.50, shine: 30 },
    /* The contact face is the worked surface — the design model gives it a
       much higher roughness than the turned rim around it, so it reads matte
       against a brighter edge. */
    silverFace: { r: 205, g: 208, b: 210, spec: 0.20, shine: 10 },
    brass:  { r: 214, g: 184, b: 118, spec: 0.42, shine: 20 },
    steel:  { r: 176, g: 182, b: 188, spec: 0.40, shine: 24 },
    nickel: { r: 194, g: 198, b: 196, spec: 0.44, shine: 26 },
    alum:   { r: 198, g: 202, b: 206, spec: 0.34, shine: 16 }
  };

  /* --------------------------------------------------------------------------
     buildProfile — turn rivet dimensions into a lathe outline.

     All dimensions are in millimetres and are scaled to scene units by the
     caller. Points run from the shank's bottom up and over the head, ending on
     the axis so the head closes. `mat` tags which material paints that band.
     -------------------------------------------------------------------------- */
  function buildProfile(opt) {
    var headD   = opt.headDia    != null ? opt.headDia    : 4.0;
    var headT   = opt.headThk    != null ? opt.headThk    : 1.0;
    var shankD  = opt.shankDia   != null ? opt.shankDia   : 2.0;
    var shankL  = opt.shankLen   != null ? opt.shankLen   : 3.0;
    var head    = opt.headStyle  || "flat";      // flat | dome | countersunk
    var facingT = opt.facingThk  != null ? opt.facingThk  : 0;
    var bodyMat = opt.bodyMat    || "copper";
    var faceMat = opt.facingMat  || "silver";
    var tubular = !!opt.tubular;                 // semi-tubular: bored shank

    var hr = headD / 2, sr = shankD / 2;
    var p = [];
    var y = 0;

    function add(r, yy, mat) { p.push({ r: r, y: yy, mat: mat }); }

    /* Detailing taken from the electrical-contact design study: a cold-headed
       part has no truly sharp arrises. Its profile chamfers the shank end,
       fillets the shank into the underside of the head, and chamfers the head
       top and bottom edges. Sizes are proportional so they hold at any
       dimension the configurator is set to, and clamped so a small part does
       not chamfer itself away. */
    /* Clamped at zero as well as above: the head terms scale with (hr - sr),
       which goes NEGATIVE once the shank is set wider than the head. The
       configurator warns about that combination rather than forbidding it, so
       the profile still has to come out well formed — unclamped, the chamfers
       inverted and the profile doubled back on itself. */
    var ch = Math.max(0, Math.min(0.10 * shankD, 0.18, shankL * 0.18));   // shank end chamfer
    var hc = Math.max(0, Math.min(0.10 * headT, 0.16, (hr - sr) * 0.30)); // head edge chamfer
    var fl = Math.max(0, Math.min(0.22 * (hr - sr), 0.34, shankL * 0.20)); // under-head fillet

    if (tubular) {
      // Bore wall first, so the open end reads as a tube
      add(sr * 0.52, 0, bodyMat);
      add(sr * 0.52, shankL * 0.55, bodyMat);
      add(sr, shankL * 0.55, bodyMat);
    } else {
      add(0, 0, bodyMat);
      add(sr - ch, 0, bodyMat);
      add(sr, ch, bodyMat);            // chamfered shank end
    }

    add(sr, shankL - fl, bodyMat);     // shank wall

    if (head === "countersunk") {
      add(hr, shankL + headT, bodyMat);  // cone flares up to the head diameter
      y = shankL + headT;
    } else {
      // Fillet out of the shank into the head underside, then chamfer the
      // head's lower and upper edges.
      if (fl > 0.01) {
        add(sr + fl * 0.55, shankL - fl * 0.25, bodyMat);
        add(sr + fl, shankL, bodyMat);
      }
      add(hr - hc, shankL, bodyMat);           // head underside
      add(hr, shankL + hc, bodyMat);           // bottom edge chamfer
      add(hr, shankL + headT - hc, bodyMat);   // head wall
      add(hr - hc, shankL + headT, bodyMat);   // top edge chamfer
      y = shankL + headT;
      hr = hr - hc;                            // facing/top sit inside the chamfer
    }

    // Contact facing sits on top of the head as its own material band
    if (facingT > 0) {
      add(hr, y, faceMat);
      add(hr * 0.985, y + facingT, faceMat);
      if (head === "dome") {
        var steps = 14;
        for (var i = 1; i <= steps; i++) {
          var t = i / steps;
          add(hr * 0.985 * Math.cos(t * Math.PI / 2), y + facingT + hr * 0.55 * Math.sin(t * Math.PI / 2), faceMat);
        }
      } else {
        add(0, y + facingT, faceMat);
      }
    } else if (head === "dome") {
      var s2 = 16;
      for (var j = 1; j <= s2; j++) {
        var t2 = j / s2;
        add(hr * Math.cos(t2 * Math.PI / 2), y + hr * 0.6 * Math.sin(t2 * Math.PI / 2), bodyMat);
      }
    } else {
      add(0, y, bodyMat);              // flat top closes on the axis
    }

    return p;
  }

  /* --------------------------------------------------------------------------
     Models ported from the "Electrical contact 3D model" design study.

     That study is a Three.js scene, and its parts are LatheGeometry — a 2D
     profile revolved about Y, which is exactly what buildProfile feeds Mesh
     here. So the profiles carry over point for point, in millimetres, and the
     shapes on the page are the shapes in the model rather than a likeness of
     them. What does not carry over is Three's PBR shading; these use the
     site's own renderer.
     -------------------------------------------------------------------------- */
  var models = {
    /* Copper rivet contact: chamfered flange, fillet into the stem, chamfered
       tip. `countersink` is the study's faceted tip depth in mm (0 for flat);
       as a profile it is simply the tip face falling back to the axis. */
    contactRivet: function (o) {
      o = o || {};
      var sink = o.countersink != null ? o.countersink : 1.2;
      var m = o.bodyMat || "copper";
      var p = [
        [0, 0], [5.1, 0], [5.4, 0.25], [5.4, 1.25], [5.15, 1.55],   // flange
        [3.2, 1.75], [2.75, 1.95], [2.6, 2.3],                       // fillet into stem
        [2.6, 8.6], [2.45, 8.85], [2.3, 8.9]                         // stem + tip chamfer
      ].map(function (v) { return { r: v[0], y: v[1], mat: m }; });
      // Concave tip: the face runs from the chamfer back down to the axis.
      p.push({ r: 0, y: sink > 0 ? 8.9 - sink : 8.9, mat: m });
      return p;
    },

    /* Bimetal button contact: silver facing bonded onto a copper base. The
       study builds the facing as three separate meshes (rim, face, underside);
       revolved as one profile they are three bands of the same surface, which
       is what the real part is. */
    bimetalButton: function (o) {
      o = o || {};
      var base = o.bodyMat || "copper";
      var rim  = o.facingMat || "silver";
      var face = o.faceMat || "silverFace";
      return [
        { r: 0,    y: 0,     mat: base },
        { r: 1.6,  y: 0,     mat: base },
        { r: 1.75, y: 0.15,  mat: base },
        { r: 1.75, y: 1.6,   mat: base },
        { r: 4.2,  y: 1.6,   mat: base },
        { r: 4.6,  y: 1.8,   mat: base },
        { r: 4.75, y: 2.1,   mat: base },
        { r: 4.75, y: 3.4,   mat: base },
        { r: 4.52, y: 3.42,  mat: rim  },   // copper lip around the facing
        { r: 4.62, y: 3.55,  mat: rim  },
        { r: 4.6,  y: 4.1,   mat: rim  },
        { r: 4.45, y: 4.3,   mat: rim  },
        { r: 4.3,  y: 4.35,  mat: face },
        { r: 0,    y: 4.35,  mat: face }
      ];
    }
  };

  /* --------------------------------------------------------------------------
     Mesh — revolve a profile and render it.
     -------------------------------------------------------------------------- */
  function Mesh(profile, segments) {
    this.seg = segments || 40;
    this.setProfile(profile);
  }

  Mesh.prototype.setProfile = function (profile) {
    this.profile = profile;
    var seg = this.seg, quads = [], i, j;

    // Centre the form vertically so rotation looks balanced
    var minY = Infinity, maxY = -Infinity, maxR = 0;
    for (i = 0; i < profile.length; i++) {
      if (profile[i].y < minY) minY = profile[i].y;
      if (profile[i].y > maxY) maxY = profile[i].y;
      if (profile[i].r > maxR) maxR = profile[i].r;
    }
    var cy = (minY + maxY) / 2;
    this.extent = Math.max(maxY - minY, maxR * 2) || 1;

    var cos = [], sin = [];
    for (j = 0; j <= seg; j++) {
      var a = (j / seg) * Math.PI * 2;
      cos.push(Math.cos(a)); sin.push(Math.sin(a));
    }

    // Edge normals in the r-y plane, then averaged at each point so that a
    // curved run of segments (the dome) shades as a curve, not as facets.
    var en = [];
    for (i = 0; i < profile.length - 1; i++) {
      var dR = profile[i + 1].r - profile[i].r, dY = profile[i + 1].y - profile[i].y;
      var L0 = Math.hypot(dR, dY) || 1;
      en.push([dY / L0, -dR / L0]);
    }
    // Blend a point's normal with its neighbour only across a tangent-continuous
    // join (the dome). A hard join -- a flat head top meeting the head wall --
    // must stay a crease, or the flat face shades as though it were curved.
    /* A chamfer is a machined edge, not a curve. At the old ~40 degrees a
       26-degree chamfer blended into the wall beside it, which rounded off
       the edge and — worse — left the flat wall with two different end
       normals, so it shaded as though it were curved and lost its grading
       around the axis. At ~15 degrees chamfers stay crisp and only genuinely
       continuous runs, like the dome's 5-degree steps, still blend. */
    var CREASE = 0.966;                               // ~15 degrees
    function blend(eA, eB) {
      if (!eA) return eB;
      if (!eB) return eA;
      if (eA[0] * eB[0] + eA[1] * eB[1] < CREASE) return null;   // keep it hard
      var br = eA[0] + eB[0], by = eA[1] + eB[1];
      var bl = Math.hypot(br, by) || 1;
      return [br / bl, by / bl];
    }
    // For each band, the normal at each of its ends, creases respected
    var bn = [], bnA = [], bnB = [];
    for (i = 0; i < en.length; i++) {
      var nA = blend(en[i - 1], en[i]) || en[i];
      var nB = blend(en[i], en[i + 1]) || en[i];
      bnA.push(nA); bnB.push(nB);
      var mr = (nA[0] + nB[0]) / 2, my = (nA[1] + nB[1]) / 2;
      var ml = Math.hypot(mr, my) || 1;
      bn.push([mr / ml, my / ml]);
    }

    for (i = 0; i < profile.length - 1; i++) {
      var a0 = profile[i], b0 = profile[i + 1];
      if (a0.r === 0 && b0.r === 0) continue;         // degenerate band

      // Flat cap: one disc, one polygon, no internal seams
      if (a0.y === b0.y && (a0.r === 0 || b0.r === 0)) {
        var rr = Math.max(a0.r, b0.r), ring = [];
        for (j = 0; j <= seg; j++) ring.push([rr * cos[j], a0.y - cy, rr * sin[j]]);
        quads.push({
          v: ring,
          n: [0, bn[i][1] >= 0 ? 1 : -1, 0],
          m: materials[b0.mat] || materials.copper,
          y: a0.y - cy,
          band: i,
          cap: true
        });
        continue;
      }

      /* Canvas gradients are linear, so each quad can grade along one axis
         only. Both axes carry shading: around the axis the normal sweeps a
         segment's worth, and along the profile it changes wherever the run
         is curved or blended into a chamfer. Whichever is graded, the other
         fills flat — and a flat fill around the axis is what drew the
         vertical stripes down the shank.

         So carry both pairs of normals and let the renderer pick per quad,
         by which pair actually differs in colour. */
      for (j = 0; j < seg; j++) {
        var nr = bn[i][0], ny = bn[i][1];
        var aR = bnA[i], bR = bnB[i];
        var mj = (j + 0.5) / seg * Math.PI * 2;
        var q = {
          v: [
            [a0.r * cos[j],     a0.y - cy, a0.r * sin[j]],
            [b0.r * cos[j],     b0.y - cy, b0.r * sin[j]],
            [b0.r * cos[j + 1], b0.y - cy, b0.r * sin[j + 1]],
            [a0.r * cos[j + 1], a0.y - cy, a0.r * sin[j + 1]]
          ],
          n: [nr * Math.cos(mj), ny, nr * Math.sin(mj)],
          m: materials[b0.mat] || materials.copper,
          y: (a0.y + b0.y) / 2 - cy,
          band: i
        };
        // Along the profile: this band's two end normals, at this segment.
        q.nA = [aR[0] * Math.cos(mj), aR[1], aR[0] * Math.sin(mj)];
        q.nB = [bR[0] * Math.cos(mj), bR[1], bR[0] * Math.sin(mj)];
        // Around the axis: the band's normal at this segment's two edges.
        q.nL = [nr * cos[j], ny, nr * sin[j]];
        q.nR = [nr * cos[j + 1], ny, nr * sin[j + 1]];
        quads.push(q);
      }
    }
    this.quads = quads;
    this.minY = minY - cy;
    this.maxY = maxY - cy;
    return this;
  };

  /* Render into ctx. opts: cx, cy, scale, rotX, rotY, reveal (0..1), alpha */
  Mesh.prototype.render = function (ctx, o) {
    var rx = o.rotX || 0, ry = o.rotY || 0;
    var cxr = Math.cos(rx), sxr = Math.sin(rx);
    var cyr = Math.cos(ry), syr = Math.sin(ry);
    var scale = o.scale, cx = o.cx, cy = o.cy;
    var reveal = o.reveal == null ? 1 : o.reveal;
    var alpha = o.alpha == null ? 1 : o.alpha;
    var persp = o.persp == null ? 0.0016 : o.persp;

    /* Two-light product setup. The key sits LOW and frontal on purpose: most
       of a rivet is cylinder wall, whose normals are horizontal, and a high
       key puts the specular half-vector out of their reach entirely. With the
       old key at y=0.74 and an exponent of 49, the hot spot evaluated to 7e-10
       on every wall facet — the specular term was doing nothing at all, and
       what looked like lustre was only the ambient environment.

       Both lights also need a NEGATIVE z. The viewer sits at -z (back faces
       are culled at nz > 0.12), so the old lights at z = +0.52 and +0.40 were
       standing behind the part: the key landed 0.000 on the head top and
       0.000 on the front of the shank, and every surface actually facing the
       camera was lit by ambient alone. */
    /* The key is oblique rather than head-on. Pointed straight at the camera
       it lit the whole front of a cylinder evenly, which left the walls
       looking flat; from the side it carries the roundness. */
    var K = [-0.74, 0.36, -0.57];
    var F = [0.80, 0.10, -0.59];

    // Blinn half-vectors for a viewer down -z, precomputed once per frame.
    function halfOf(L) {
      var hx = L[0], hy = L[1], hz = L[2] - 1;
      var hl = Math.hypot(hx, hy, hz) || 1;
      return [hx / hl, hy / hl, hz / hl];
    }
    var HK = halfOf(K), HF = halfOf(F);

    /* One shading model, used both for the flat per-face colour and for the
       two end colours of the per-face gradient. It used to be written out
       twice, which is how the two copies drifted apart. */
    function shadeNormal(ax, ay, az, m) {
      var up = ay;
      /* A workshop, not a mirror box. The old horizon term was a hard bright
         ring that wrapped the part and read as a light effect painted onto a
         drawing rather than as metal. It is now a soft wrap. */
      var env = 0.30
              + Math.pow(Math.max(0, up), 0.70) * 0.64             // sky
              + Math.max(0, -up) * 0.10                            // bounce
              + Math.pow(1 - Math.abs(up), 8) * 0.18               // soft horizon
              + Math.pow(Math.max(0, up - 0.55) / 0.45, 3) * 0.28; // softbox

      var key  = Math.max(0, ax * K[0] + ay * K[1] + az * K[2]);
      var fill = Math.max(0, ax * F[0] + ay * F[1] + az * F[2]);

      var ndhK = Math.max(0, ax * HK[0] + ay * HK[1] + az * HK[2]);
      var ndhF = Math.max(0, ax * HF[0] + ay * HF[1] + az * HF[2]);

      /* A cold-headed rivet is satin, not chrome. Three soft terms rather
         than one hard one: a broad highlight, a wider sheen that grades
         around the circumference, and a little from the fill so the shadow
         side keeps its shape. */
      var hot   = Math.pow(ndhK, m.shine * 0.55) * m.spec * 0.95;
      var sheen = Math.pow(ndhK, m.shine * 0.12) * m.spec * 0.22;
      var hot2  = Math.pow(ndhF, m.shine * 0.40) * m.spec * 0.15;
      var fres  = Math.pow(1 - Math.max(0, -az), 4) * 0.28 * m.spec;

      /* Weighted toward diffuse: in the reference photographs the form is
         carried by shading across a fairly bright body, and the copper never
         washes out — even the brightest pixel stays warm. */
      var lum = 0.31 + key * 0.48 + fill * 0.18 + env * 0.38;
      var hi  = hot + sheen + hot2 + fres * 0.70;

      // Metals tint their reflections. Weighted hard toward the base hue so a
      // highlight on copper stays copper instead of going to white.
      return [
        Math.min(255, m.r * lum + 255 * hi * (0.28 + 0.72 * (m.r / 255))),
        Math.min(255, m.g * lum + 255 * hi * (0.28 + 0.72 * (m.g / 255))),
        Math.min(255, m.b * lum + 255 * hi * (0.28 + 0.72 * (m.b / 255)))
      ];
    }
    var quads = this.quads, out = [], i, k;
    var bandAxis = {};      // gradient axis per profile band, settled once a frame

    /* The assembly used to cull whole profile bands, so the part arrived in
       about ten visible chunks. Instead sweep a soft frontier up through the
       form and fade each quad across it, which reads as continuous growth. */
    var span = (this.maxY - this.minY) || 1;
    var feather = span * 1.15;
    var front = this.minY + (span + feather) * reveal;

    for (i = 0; i < quads.length; i++) {
      var q = quads[i];
      var qa = reveal >= 1 ? 1 : (front - q.y) / feather;
      if (qa <= 0) continue;                           // not yet reached
      if (qa > 1) qa = 1;
      qa = qa * qa * (3 - 2 * qa);                     // smoothstep the edge

      var pts = [], zsum = 0, nv = q.v.length;
      for (k = 0; k < nv; k++) {
        var v = q.v[k];
        // rotate Y then X
        var x1 = v[0] * cyr + v[2] * syr;
        var z1 = -v[0] * syr + v[2] * cyr;
        var y2 = v[1] * cxr - z1 * sxr;
        var z2 = v[1] * sxr + z1 * cxr;
        var f = 1 / (1 + z2 * persp * scale);         // mild perspective
        pts.push([cx + x1 * scale * f, cy - y2 * scale * f]);
        zsum += z2;
      }
      zsum /= nv;

      // Rotate the normal the same way and cull back faces
      var n = q.n;
      var nx1 = n[0] * cyr + n[2] * syr;
      var nz1 = -n[0] * syr + n[2] * cyr;
      var ny2 = n[1] * cxr - nz1 * sxr;
      var nz2 = n[1] * sxr + nz1 * cxr;
      if (nz2 > 0.12) continue;

      function rotN(n3) {
        var x1 = n3[0] * cyr + n3[2] * syr;
        var z1 = -n3[0] * syr + n3[2] * cyr;
        return [x1, n3[1] * cxr - z1 * sxr, n3[1] * sxr + z1 * cxr];
      }

      var flat = shadeNormal(nx1, ny2, nz2, q.m);
      var rec = { p: pts, z: zsum, cap: !!q.cap, r: flat[0], g: flat[1], b: flat[2] };

      /* A flat turned face has one normal, so a single shade leaves it dead.
         Real turned metal carries concentric tool marks that smear the
         reflection radially, so sample the model at normals tilted toward and
         away from the key and let the cap gradient run between them. That is
         a colour sweep, not the flat +/-8% brightness scale it replaces. */
      if (q.cap) {
        rec.capHot = shadeNormal(
          nx1 + HK[0] * 0.75, ny2 + HK[1] * 0.75, nz2 + HK[2] * 0.75, q.m);
        rec.capRim = shadeNormal(
          nx1 - HK[0] * 0.55, ny2 - HK[1] * 0.55, nz2 - HK[2] * 0.55, q.m);
      }
      if (q.nA && q.nB && pts.length === 4) {
        /* Grade along whichever axis actually varies, judged by colour rather
           than by geometry: a chamfer that blends into the wall leaves the
           profile normals differing slightly, which looks like a reason to
           grade that way while the real variation is still around the axis.

           The answer is a property of the band, not of the segment — a
           cylinder varies around the axis all the way round, a dome ring
           varies along the profile all the way round — so it is settled once
           per band per frame. Deciding it per quad meant four shade calls on
           every one of ~900 quads and cost 12ms a frame; this is two. */
        var axis = bandAxis[q.band];
        if (axis === undefined) {
          var ra0 = rotN(q.nA), rb0 = rotN(q.nB);
          var ca0 = shadeNormal(ra0[0], ra0[1], ra0[2], q.m);
          var cb0 = shadeNormal(rb0[0], rb0[1], rb0[2], q.m);
          var rl0 = rotN(q.nL), rr0 = rotN(q.nR);
          var cl0 = shadeNormal(rl0[0], rl0[1], rl0[2], q.m);
          var cr0 = shadeNormal(rr0[0], rr0[1], rr0[2], q.m);
          var dAB = Math.abs(ca0[0] - cb0[0]) + Math.abs(ca0[1] - cb0[1]) + Math.abs(ca0[2] - cb0[2]);
          var dLR = Math.abs(cl0[0] - cr0[0]) + Math.abs(cl0[1] - cr0[1]) + Math.abs(cl0[2] - cr0[2]);
          axis = bandAxis[q.band] = (dLR >= dAB) ? 1 : 0;   // 1 = around the axis
        }

        if (axis === 1) {
          var rl = rotN(q.nL), rr = rotN(q.nR);
          rec.cA = shadeNormal(rl[0], rl[1], rl[2], q.m);
          rec.cB = shadeNormal(rr[0], rr[1], rr[2], q.m);
          rec.gA = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
          rec.gB = [(pts[3][0] + pts[2][0]) / 2, (pts[3][1] + pts[2][1]) / 2];
        } else {
          var ra = rotN(q.nA), rb = rotN(q.nB);
          rec.cA = shadeNormal(ra[0], ra[1], ra[2], q.m);
          rec.cB = shadeNormal(rb[0], rb[1], rb[2], q.m);
          rec.gA = [(pts[0][0] + pts[3][0]) / 2, (pts[0][1] + pts[3][1]) / 2];
          rec.gB = [(pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2];
        }
      }
      out.push(rec);
    }

    // Painter's algorithm: +z is away from the viewer, so the farthest
    // quads must be laid down first and the nearest painted last.
    out.sort(function (a, b) { return b.z - a.z; });

    /* Translucent adjacent polygons antialias into visible seams, so the
       materialise is done by masking the finished part with a single
       gradient rather than by fading each quad separately. */
    /* A part with no shadow floats. Lay a soft contact ellipse under it
       first, scaled to how far the form is tipped. */
    if (o.shadow !== false) {
      var sw = this.extent * scale * 0.62;
      var sh = sw * (0.16 + Math.abs(Math.cos(rx)) * 0.20);
      var sy = cy + this.extent * scale * 0.42 * Math.cos(rx);
      ctx.save();
      ctx.globalAlpha = (o.alpha == null ? 1 : o.alpha) * 0.5 * reveal;
      var sg = ctx.createRadialGradient(cx, sy, 0, cx, sy, sw);
      sg.addColorStop(0,   "rgba(0,0,0,0.55)");
      sg.addColorStop(0.5, "rgba(0,0,0,0.22)");
      sg.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.translate(cx, sy); ctx.scale(1, sh / sw); ctx.translate(-cx, -sy);
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, sy, sw, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    var masked = reveal < 1;
    var target = ctx, gy0 = 0, gy1 = 0;
    if (masked) {
      var cw = ctx.canvas.width, chh = ctx.canvas.height;
      if (!this._scratch) this._scratch = document.createElement("canvas");
      var sc = this._scratch;
      if (sc.width !== cw || sc.height !== chh) { sc.width = cw; sc.height = chh; }
      var sctx = sc.getContext("2d");
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, cw, chh);
      sctx.setTransform(ctx.getTransform());
      // Screen-space band the gradient runs across (y grows downward)
      gy1 = o.cy - (this.minY - feather * 0.15) * scale;
      gy0 = o.cy - (this.minY + (span + feather) * reveal) * scale;
      target = sctx;
    }

    target.save();
    target.globalAlpha = alpha;
    var ctxOriginal = ctx;
    ctx = target;
    for (i = 0; i < out.length; i++) {
      var f2 = out[i], p2 = f2.p;
      ctx.beginPath();
      ctx.moveTo(p2[0][0], p2[0][1]);
      for (var pv = 1; pv < p2.length; pv++) ctx.lineTo(p2[pv][0], p2[pv][1]);
      ctx.closePath();
      var col = "rgb(" + (f2.r | 0) + "," + (f2.g | 0) + "," + (f2.b | 0) + ")";
      /* A gradient object per quad is the single most expensive thing in this
         loop, and on any given frame a good share of quads have ends within a
         shade of each other — on the shadow side, or wherever the surface
         faces away from both lights. Those fill flat for free. */
      var flatEnough = f2.cA &&
        Math.abs(f2.cA[0] - f2.cB[0]) + Math.abs(f2.cA[1] - f2.cB[1]) + Math.abs(f2.cA[2] - f2.cB[2]) < 3;
      if (f2.cA && !flatEnough && (f2.gA[0] !== f2.gB[0] || f2.gA[1] !== f2.gB[1])) {
        var lg = ctx.createLinearGradient(f2.gA[0], f2.gA[1], f2.gB[0], f2.gB[1]);
        lg.addColorStop(0, "rgb(" + (f2.cA[0]|0) + "," + (f2.cA[1]|0) + "," + (f2.cA[2]|0) + ")");
        lg.addColorStop(1, "rgb(" + (f2.cB[0]|0) + "," + (f2.cB[1]|0) + "," + (f2.cB[2]|0) + ")");
        ctx.fillStyle = lg;
      } else if (f2.cap) {
        // A turned face is brightest off-centre, where the light rakes it
        var cxr2 = 0, cyr2 = 0;
        for (var cp = 0; cp < f2.p.length; cp++) { cxr2 += f2.p[cp][0]; cyr2 += f2.p[cp][1]; }
        cxr2 /= f2.p.length; cyr2 /= f2.p.length;
        var rad = 0;
        for (var cq = 0; cq < f2.p.length; cq++) rad = Math.max(rad, Math.hypot(f2.p[cq][0] - cxr2, f2.p[cq][1] - cyr2));
        // Offset the bright pole toward where the key sits on screen (y is
        // flipped going to screen space), so the sweep tracks the lighting.
        var lx = HK[0], ly = -HK[1];
        var ll = Math.hypot(lx, ly) || 1;
        var rg = ctx.createRadialGradient(
          cxr2 + (lx / ll) * rad * 0.52, cyr2 + (ly / ll) * rad * 0.52, rad * 0.04,
          cxr2, cyr2, rad * 1.25);
        var hotC = f2.capHot || [f2.r, f2.g, f2.b];
        var rimC = f2.capRim || [f2.r, f2.g, f2.b];
        rg.addColorStop(0,    "rgb(" + (hotC[0]|0) + "," + (hotC[1]|0) + "," + (hotC[2]|0) + ")");
        rg.addColorStop(0.55, col);
        rg.addColorStop(1,    "rgb(" + (rimC[0]|0) + "," + (rimC[1]|0) + "," + (rimC[2]|0) + ")");
        ctx.fillStyle = rg;
      } else {
        ctx.fillStyle = col;
      }
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;   // closes the seam without banding
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    ctx = ctxOriginal;

    if (masked) {
      var sc2 = this._scratch, s2 = sc2.getContext("2d");
      s2.save();
      s2.setTransform(1, 0, 0, 1, 0, 0);
      s2.globalCompositeOperation = "destination-in";
      var tm = ctx.getTransform();
      var g = s2.createLinearGradient(0, gy1 * tm.d + tm.f, 0, gy0 * tm.d + tm.f);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      s2.fillStyle = g;
      s2.fillRect(0, 0, sc2.width, sc2.height);
      s2.restore();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(sc2, 0, 0);
      ctx.restore();
    }
  };

  global.Rivet3D = { buildProfile: buildProfile, Mesh: Mesh, materials: materials, models: models };
})(window);
