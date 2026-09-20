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
    var bn = [];
    for (i = 0; i < en.length; i++) {
      var nA = blend(en[i - 1], en[i]) || en[i];
      var nB = blend(en[i], en[i + 1]) || en[i];
      var mr = (nA[0] + nB[0]) / 2, my = (nA[1] + nB[1]) / 2;
      var ml = Math.hypot(mr, my) || 1;
      bn.push([mr / ml, my / ml]);
    }

    for (i = 0; i < profile.length - 1; i++) {
      var a0 = profile[i], b0 = profile[i + 1];
      if (a0.r === 0 && b0.r === 0) continue;         // degenerate band
      for (j = 0; j < seg; j++) {
        var nr = bn[i][0], ny = bn[i][1];
        var mj = (j + 0.5) / seg * Math.PI * 2;
        quads.push({
          v: [
            [a0.r * cos[j],     a0.y - cy, a0.r * sin[j]],
            [b0.r * cos[j],     b0.y - cy, b0.r * sin[j]],
            [b0.r * cos[j + 1], b0.y - cy, b0.r * sin[j + 1]],
            [a0.r * cos[j + 1], a0.y - cy, a0.r * sin[j + 1]]
          ],
          n: [nr * Math.cos(mj), ny, nr * Math.sin(mj)],
          m: materials[b0.mat] || materials.copper,
          band: i
        });
      }
    }
    this.quads = quads;
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
    var bandMax = this.profile.length - 1;

    for (i = 0; i < quads.length; i++) {
      var q = quads[i];
      if (q.band / bandMax > reveal) continue;        // assembly wipe, bottom-up

      var pts = [], zsum = 0;
      for (k = 0; k < 4; k++) {
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

      // Rotate the normal the same way and cull back faces
      var n = q.n;
      var nx1 = n[0] * cyr + n[2] * syr;
      var nz1 = -n[0] * syr + n[2] * cyr;
      var ny2 = n[1] * cxr - nz1 * sxr;
      var nz2 = n[1] * sxr + nz1 * cxr;
      if (nz2 > 0.12) continue;

      var key  = Math.max(0, nx1 * K[0] + ny2 * K[1] + nz2 * K[2]);
      var fill = Math.max(0, nx1 * F[0] + ny2 * F[1] + nz2 * F[2]);
      // Hemispheric ambient: up-facing surfaces pick up more of the scene
      var amb  = 0.34 + 0.16 * (ny2 * 0.5 + 0.5);
      // Rim: strongest where the surface turns away from the viewer
      var rim  = Math.pow(1 - Math.min(1, Math.abs(nz2)), 3) * 0.30;

      var lum = amb + key * 0.78 + fill * 0.26 + rim;
      var spec = Math.pow(Math.max(0, -nz2 * 0.5 + key * 0.8), q.m.shine * 0.22) * q.m.spec;
      var hi = 255 * spec * 0.75 + 190 * rim * 0.5;

      out.push({
        p: pts, z: zsum,
        r: Math.min(255, q.m.r * lum + hi),
        g: Math.min(255, q.m.g * lum + hi * 0.99),
        b: Math.min(255, q.m.b * lum + hi * 1.02)
      });
    }

    // Painter's algorithm: +z is away from the viewer, so the farthest
    // quads must be laid down first and the nearest painted last.
    out.sort(function (a, b) { return b.z - a.z; });

    ctx.save();
    ctx.globalAlpha = alpha;
    for (i = 0; i < out.length; i++) {
      var f2 = out[i], p2 = f2.p;
      ctx.beginPath();
      ctx.moveTo(p2[0][0], p2[0][1]);
      ctx.lineTo(p2[1][0], p2[1][1]);
      ctx.lineTo(p2[2][0], p2[2][1]);
      ctx.lineTo(p2[3][0], p2[3][1]);
      ctx.closePath();
      var col = "rgb(" + (f2.r | 0) + "," + (f2.g | 0) + "," + (f2.b | 0) + ")";
      ctx.fillStyle = col;
      // Stroke with the same colour to hide seams between adjacent quads
      ctx.strokeStyle = col;
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  };

  global.Rivet3D = { buildProfile: buildProfile, Mesh: Mesh, materials: materials };
})(window);
