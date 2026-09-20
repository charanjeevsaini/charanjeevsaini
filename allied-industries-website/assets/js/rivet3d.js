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
    copper: { r: 196, g: 118, b: 70, spec: 0.85, shine: 26 },
    silver: { r: 206, g: 212, b: 218, spec: 1.00, shine: 42 },
    brass:  { r: 201, g: 166, b: 92, spec: 0.80, shine: 24 },
    steel:  { r: 150, g: 158, b: 166, spec: 0.75, shine: 30 },
    nickel: { r: 176, g: 180, b: 178, spec: 0.85, shine: 34 },
    alum:   { r: 188, g: 192, b: 196, spec: 0.60, shine: 18 }
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

    if (tubular) {
      // Bore wall first, so the open end reads as a tube
      add(sr * 0.52, 0, bodyMat);
      add(sr * 0.52, shankL * 0.55, bodyMat);
      add(sr, shankL * 0.55, bodyMat);
    } else {
      add(0, 0, bodyMat);
      add(sr, 0, bodyMat);
    }

    add(sr, shankL, bodyMat);          // shank wall
    y = shankL;

    if (head === "countersunk") {
      add(hr, y + headT, bodyMat);     // cone flares up to the head diameter
      y += headT;
    } else {
      add(hr, y, bodyMat);             // head underside
      add(hr, y + headT, bodyMat);     // head outer wall
      y += headT;
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
    var CREASE = 0.77;                                // ~40 degrees
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

      for (j = 0; j < seg; j++) {
        var nr = bn[i][0], ny = bn[i][1];
        var aR = bnA[i], bR = bnB[i];
        var mj = (j + 0.5) / seg * Math.PI * 2;
        quads.push({
          v: [
            [a0.r * cos[j],     a0.y - cy, a0.r * sin[j]],
            [b0.r * cos[j],     b0.y - cy, b0.r * sin[j]],
            [b0.r * cos[j + 1], b0.y - cy, b0.r * sin[j + 1]],
            [a0.r * cos[j + 1], a0.y - cy, a0.r * sin[j + 1]]
          ],
          n: [nr * Math.cos(mj), ny, nr * Math.sin(mj)],
          nA: [aR[0] * Math.cos(mj), aR[1], aR[0] * Math.sin(mj)],
          nB: [bR[0] * Math.cos(mj), bR[1], bR[0] * Math.sin(mj)],
          m: materials[b0.mat] || materials.copper,
          y: (a0.y + b0.y) / 2 - cy,
          band: i
        });
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

    // Two-light product setup: a key from up-front-left and a dimmer, cooler
    // fill from the right, plus a rim term so grazing edges catch light the
    // way polished metal does.
    var K = [-0.42, 0.74, 0.52];
    var F = [0.78, 0.18, 0.40];
    var quads = this.quads, out = [], i, k;

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

      // Shade an arbitrary rotated normal with the same model, so a face can
      // be graded from one end to the other instead of filled flat.
      function shadeN(ax, ay, az, m) {
        var up = ay;
        var env = 0.18
                + Math.pow(Math.max(0, up), 0.65) * 0.72          // sky, biased bright
                + Math.max(0, -up) * 0.06                          // dark floor
                + Math.pow(1 - Math.abs(up), 22) * 0.95            // tight horizon strip
                + Math.pow(Math.max(0, up - 0.55) / 0.45, 3) * 0.35; // overhead softbox
        var kk = Math.max(0, ax * K[0] + ay * K[1] + az * K[2]);
        var ff = Math.max(0, ax * F[0] + ay * F[1] + az * F[2]);
        var hxx = K[0], hyy = K[1], hzz = K[2] - 1;
        var hll = Math.hypot(hxx, hyy, hzz) || 1;
        var ndhh = Math.max(0, (ax * hxx + ay * hyy + az * hzz) / hll);
        var sp = Math.pow(ndhh, m.shine * 1.9) * m.spec * 1.9;
        var fr = Math.pow(1 - Math.max(0, -az), 4) * 0.55 * m.spec;
        var lu = 0.26 + kk * 0.56 + ff * 0.18 + env * 0.50;
        var hh = sp * 0.95 + fr * 0.85;
        return [
          Math.min(255, m.r * lu + 255 * hh * (0.55 + 0.45 * (m.r / 255))),
          Math.min(255, m.g * lu + 255 * hh * (0.55 + 0.45 * (m.g / 255))),
          Math.min(255, m.b * lu + 255 * hh * (0.55 + 0.45 * (m.b / 255)))
        ];
      }

      function rotN(n3) {
        var x1 = n3[0] * cyr + n3[2] * syr;
        var z1 = -n3[0] * syr + n3[2] * cyr;
        return [x1, n3[1] * cxr - z1 * sxr, n3[1] * sxr + z1 * cxr];
      }

      var vdot = -nz2;                                  // 1 when facing viewer

      /* Polished metal takes its character from what it reflects, so stand a
         cheap environment in for one: bright sky above, dim floor below and a
         tight bright horizon ring. That ring is what reads as lustre. */
      var up = ny2;
      var env = 0.18
              + Math.pow(Math.max(0, up), 0.65) * 0.72
              + Math.max(0, -up) * 0.06
              + Math.pow(1 - Math.abs(up), 22) * 0.95
              + Math.pow(Math.max(0, up - 0.55) / 0.45, 3) * 0.35;

      var key  = Math.max(0, nx1 * K[0] + ny2 * K[1] + nz2 * K[2]);
      var fill = Math.max(0, nx1 * F[0] + ny2 * F[1] + nz2 * F[2]);

      // Blinn half-vector against a viewer at -z: a tighter, brighter hot spot
      var hx = K[0], hy = K[1], hz = K[2] - 1;
      var hl = Math.hypot(hx, hy, hz) || 1;
      var ndh = Math.max(0, (nx1 * hx + ny2 * hy + nz2 * hz) / hl);
      var spec = Math.pow(ndh, q.m.shine * 1.9) * q.m.spec * 1.9;

      // Fresnel: every metal goes bright at a grazing angle
      var fres = Math.pow(1 - Math.max(0, vdot), 4) * 0.55 * q.m.spec;

      var lum = 0.26 + key * 0.56 + fill * 0.18 + env * 0.50;

      // Metals tint their reflections, so carry the base hue into the
      // highlight instead of washing it out to white.
      var hi = spec * 0.95 + fres * 0.85;
      var tr = 0.55 + 0.45 * (q.m.r / 255);
      var tg = 0.55 + 0.45 * (q.m.g / 255);
      var tb = 0.55 + 0.45 * (q.m.b / 255);

      var rec = {
        p: pts, z: zsum, cap: !!q.cap,
        r: Math.min(255, q.m.r * lum + 255 * hi * tr),
        g: Math.min(255, q.m.g * lum + 255 * hi * tg),
        b: Math.min(255, q.m.b * lum + 255 * hi * tb)
      };
      if (q.nA && q.nB && pts.length === 4) {
        var ra = rotN(q.nA), rb = rotN(q.nB);
        rec.cA = shadeN(ra[0], ra[1], ra[2], q.m);
        rec.cB = shadeN(rb[0], rb[1], rb[2], q.m);
        rec.gA = [(pts[0][0] + pts[3][0]) / 2, (pts[0][1] + pts[3][1]) / 2];
        rec.gB = [(pts[1][0] + pts[2][0]) / 2, (pts[1][1] + pts[2][1]) / 2];
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
      if (f2.cA && (f2.gA[0] !== f2.gB[0] || f2.gA[1] !== f2.gB[1])) {
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
        var rg = ctx.createRadialGradient(cxr2 - rad * 0.32, cyr2 - rad * 0.36, rad * 0.05, cxr2, cyr2, rad * 1.15);
        rg.addColorStop(0,   "rgb(" + Math.min(255, f2.r * 1.08 | 0) + "," + Math.min(255, f2.g * 1.07 | 0) + "," + Math.min(255, f2.b * 1.06 | 0) + ")");
        rg.addColorStop(0.62, col);
        rg.addColorStop(1,   "rgb(" + (f2.r * 0.90 | 0) + "," + (f2.g * 0.90 | 0) + "," + (f2.b * 0.92 | 0) + ")");
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

  global.Rivet3D = { buildProfile: buildProfile, Mesh: Mesh, materials: materials };
})(window);
