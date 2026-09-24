/* ============================================================================
   contact3d — the photoreal rivet renderer (three.js, WebGL)
   ----------------------------------------------------------------------------
   Draws the parts from the "Electrical contact 3D model" with the same
   geometry, the same physically based metals and the same studio: a soft-box
   room baked into an environment map, so polished copper and silver have
   something real to reflect, plus the model stage's hemisphere / key / fill
   lights, with a soft contact shadow under the part.

   Two parts come straight from that model:
     buildRivetContact()  — the copper rivet contact with the faceted, dished
                            tip (the larger part; used in the hero)
     buildButtonContact() — the bimetal button contact, silver facing on a
                            copper base (the smaller part; the configurators)
   buildRivet(spec) turns configurator dimensions into a part built the same
   way — the same edge breaks, fillet and inset silver facing — so every
   construction in the configurator reads as the same kind of object.

   A view only draws when asked. The existing hero / teaser / configurator
   scripts keep their drag, spin and visibility logic and call view.render()
   with the angles they already track. If WebGL is missing this module never
   announces itself and those scripts keep using the 2D renderer (rivet3d.js).

   Exposes window.Contact3D and fires "contact3d:ready" on window.
   ========================================================================== */
import * as THREE from "../vendor/three/three.module.min.js";

const mm = 0.001;
const V = (r, y) => new THREE.Vector2(r * mm, y * mm);

/* ---- materials ---------------------------------------------------------- */
/* The model's finish at its published settings: polish 78%, reflections 1.0,
   exposure 1.15. Roughness values below are what its applyLook() produced. */
const EXPOSURE = 1.15;

function metal(name, color, roughness, extra) {
  return new THREE.MeshPhysicalMaterial(Object.assign({
    name, color, metalness: 1, roughness, envMapIntensity: 1
  }, extra || {}));
}

const MAT = {
  copper:     metal("copper", 0xf2a07c, 0.22, { clearcoat: 0.3, clearcoatRoughness: 0.15 }),
  copperTip:  metal("copper_faceted", 0xf7b08c, 0.077, { flatShading: true, side: THREE.DoubleSide }),
  silver:     metal("silver_alloy", 0xd8d9da, 0.476),
  silverEdge: metal("silver_bright", 0xf0f1f2, 0.099),
  // Other base metals the configurator offers, finished to sit beside copper
  brass:      metal("brass", 0xe8c27e, 0.24, { clearcoat: 0.3, clearcoatRoughness: 0.15 }),
  steel:      metal("mild_steel", 0xb9bec4, 0.34),
  nickel:     metal("nickel", 0xd6d2c8, 0.20),
  alum:       metal("aluminium", 0xd9dcdf, 0.38)
};

function lathe(pts, mat, name, seg) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg || 96), mat);
  m.name = name;
  return m;
}

function disc(r, y, mat, name, up) {
  const m = new THREE.Mesh(new THREE.CircleGeometry(r * mm, 96), mat);
  m.name = name;
  m.rotation.x = up ? -Math.PI / 2 : Math.PI / 2;
  m.position.y = y * mm;
  return m;
}

/* ---- the two parts from the model --------------------------------------- */

/* Contact 1 — copper rivet contact: flange, fillet into the stem, and a
   ten-facet concave countersink 1.2 mm deep in the tip. */
function buildRivetContact() {
  const g = new THREE.Group();
  g.name = "rivet_contact";
  g.add(lathe([
    V(0, 0), V(5.1, 0), V(5.4, 0.25), V(5.4, 1.25), V(5.15, 1.55), // flange
    V(3.2, 1.75), V(2.75, 1.95), V(2.6, 2.3),                       // fillet into stem
    V(2.6, 8.6), V(2.45, 8.85), V(2.3, 8.9)                          // stem + top chamfer
  ], MAT.copper, "head_and_shank"));
  const depth = 1.2 * mm;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(2.3 * mm, depth, 10, 1, true), MAT.copperTip);
  tip.name = "faceted_tip";
  tip.rotation.x = Math.PI;                  // concave: the cone points down
  tip.position.y = 8.9 * mm - depth / 2;
  g.add(tip);
  return g;
}

/* Contact 2 — bimetal button contact: silver facing on a copper base. */
function buildButtonContact() {
  const g = new THREE.Group();
  g.name = "bimetal_contact";
  g.add(lathe([
    V(0, 0), V(1.6, 0), V(1.75, 0.15), V(1.75, 1.6),               // back shank
    V(4.2, 1.6), V(4.6, 1.8), V(4.75, 2.1), V(4.75, 3.4)             // copper base
  ], MAT.copper, "copper_base"));
  g.add(lathe([
    V(4.52, 3.401), V(4.62, 3.55), V(4.6, 4.1), V(4.45, 4.3), V(4.3, 4.35)
  ], MAT.silverEdge, "silver_rim"));
  g.add(disc(4.3, 4.35, MAT.silver, "silver_face", true));
  g.add(disc(4.53, 3.401, MAT.silver, "silver_underside", false));
  return g;
}

/* ---- configurator parts -------------------------------------------------- */
/* Dimensions in mm, the same spec object configurator.js already builds:
   { headDia, headThk, shankDia, shankLen, headStyle, tubular, bodyMat,
     facingThk }. Proportions of every edge break are taken from the button
   contact above, scaled to the part, so a 5 mm head gets the same crisp
   0.15 mm-class chamfers the model has rather than a CAD-sharp corner. */
function buildRivet(s) {
  const hr = s.headDia / 2, sr = Math.min(s.shankDia / 2, hr * 0.96);
  const ht = s.headThk, sl = s.shankLen;
  const ft = s.facingThk > 0 ? s.facingThk : 0;
  const body = MAT[s.bodyMat] || MAT.copper;
  const style = s.headStyle || "flat";

  const c  = Math.min(0.09 * sr, 0.2, sl * 0.2);                // shank end chamfer
  const rr = Math.min(0.12 * hr, ht * 0.42);                     // head underside round
  const tc = Math.min(0.05 * hr, ht * 0.18);                     // head top edge break
  const fl = Math.min(0.1 * sr, sl * 0.25, (hr - sr) * 0.4);     // shank-to-head fillet

  const p = [];
  if (s.tubular) {
    // Semi-tubular: a blind bore up the shank, its wall ~ a quarter of the dia
    const ri = sr * 0.58, bore = sl * 0.6;
    p.push(V(0, bore), V(ri, bore), V(ri, c * 0.6), V(ri + c * 0.6, 0));
  } else {
    p.push(V(0, 0));
  }
  p.push(V(sr - c, 0), V(sr, c));                                // shank end
  const y0 = sl;                                                 // head underside

  let top;                                                       // head top, before facing
  if (style === "countersunk") {
    p.push(V(sr, y0 - fl * 0.4));
    top = y0 + ht;
    p.push(V(hr - tc, top - tc * 0.6), V(hr, top - tc * 0.2));  // cone to the rim
  } else {
    p.push(V(sr, y0 - fl), V(sr + fl * 0.35, y0 - fl * 0.2), V(sr + fl, y0));  // fillet
    p.push(V(hr - rr, y0), V(hr - rr * 0.16, y0 + rr * 0.4), V(hr, y0 + rr));  // underside round
    top = y0 + ht;
  }

  const g = new THREE.Group();
  g.name = "configured_rivet";

  if (ft > 0) {
    // Copper wall runs to the facing; the silver sits inset on top of it,
    // with a bright turned rim and a satin face — as on the model.
    p.push(V(hr, top), V(hr * 0.96, top), V(0, top));
    g.add(lathe(p, body, "body"));
    const fr = hr * 0.905;
    if (style === "dome") {
      const rim = [V(hr * 0.952, top + 0.001), V(hr * 0.973, top + ft * 0.16), V(hr * 0.968, top + ft * 0.7)];
      g.add(lathe(rim, MAT.silverEdge, "silver_rim"));
      const dome = [], h = hr * 0.42, n = 18;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        dome.push(V(hr * 0.968 * Math.cos(t * Math.PI / 2), top + ft * 0.7 + h * Math.sin(t * Math.PI / 2)));
      }
      g.add(lathe(dome, MAT.silver, "silver_face"));
    } else {
      g.add(lathe([
        V(hr * 0.952, top + 0.001), V(hr * 0.973, top + ft * 0.16), V(hr * 0.968, top + ft * 0.74),
        V(hr * 0.937, top + ft * 0.95), V(fr, top + ft)
      ], MAT.silverEdge, "silver_rim"));
      g.add(disc(fr, top + ft, MAT.silver, "silver_face", true));
    }
    g.add(disc(hr * 0.953, top + 0.001, MAT.silver, "silver_underside", false));
  } else if (style === "dome") {
    p.push(V(hr, top - tc));
    const h = hr * 0.5, n = 20;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      p.push(V(hr * Math.cos(t * Math.PI / 2), top - tc + h * Math.sin(t * Math.PI / 2)));
    }
    g.add(lathe(p, body, "body"));
  } else {
    p.push(V(hr, top - tc), V(hr - tc, top), V(0, top));
    g.add(lathe(p, body, "body"));
  }
  return g;
}

/* ---- the studio --------------------------------------------------------- */
/* The model's environment: a warm grey room with an overhead strip, a key
   soft-box, a dimmer fill, a rim strip and a front kicker. Baked once per
   renderer into a prefiltered map; nothing here is drawn on screen. */
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20),
    new THREE.MeshBasicMaterial({ color: 0x5a544d, side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: 0x8a847c }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -5.9; env.add(floor);
  const box = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 0.97), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  box(8, 3, 0, 5.8, 0, 6);        // overhead strip
  box(3, 7, 9.8, 1, 3, 5);        // key softbox
  box(3, 7, -9.8, 1, -2, 2.5);    // fill
  box(10, 1.2, 0, 2, -9.8, 4);    // rim strip
  box(2, 5, -4, 0, 9.8, 1.5);     // front kicker
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.02).texture;
  pmrem.dispose();
  env.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

function shadowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(0,0,0,0.85)");
  g.addColorStop(0.28, "rgba(0,0,0,0.6)");
  g.addColorStop(0.5, "rgba(0,0,0,0.18)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* The camera sits where the model's stage frames a part: 19 degrees up,
   looking at the centre of its bounds. rotY orbits it and rotX tips it, so
   the lights stay put and the reflections travel across the metal the way
   they do when you turn a real part under a lamp. */
const BASE_ELEV = Math.atan2(0.55, Math.hypot(1, 1.25));
const BASE_AZ = Math.atan2(1, 1.25);

function createView(host, opts) {
  opts = opts || {};
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;

  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.className = "contact3d-canvas";
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:block";
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);

  // The model stage's lights, at the model's adjusted intensities
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 0.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(4, 7, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xfff4e6, 0.2);
  fill.position.set(-5, 3, -4);
  scene.add(fill);

  /* Contact shadow. A shadow map at millimetre scale either aliases or,
     seen from the far side of the key, lays a hard crescent beside the part;
     a soft occlusion pool under it is what a product shot actually shows. */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: shadowTexture(), transparent: true, depthWrite: false,
    opacity: opts.shadow != null ? opts.shadow : 0.5, toneMapped: false
  }));
  ground.rotation.x = -Math.PI / 2;
  ground.renderOrder = -1;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(opts.fov || 45, 1, 0.0001, 10);
  const center = new THREE.Vector3();
  let radius = 0.005, object = null, w = 0, h = 0;
  const fillFrac = opts.fill || 0.74;

  function resize() {
    const nw = host.clientWidth, nh = host.clientHeight;
    if (!nw || !nh || (nw === w && nh === h)) return false;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return true;
  }

  function setModel(obj) {
    if (object) {
      scene.remove(object);
      object.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    }
    object = obj;
    const box = new THREE.Box3().setFromObject(obj);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    center.copy(sphere.center);
    radius = sphere.radius;
    const foot = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
    ground.position.set(center.x, box.min.y - radius * 0.002, center.z);
    ground.scale.setScalar(foot * 3.2);
    scene.add(obj);
  }

  /* rotX / rotY are the angles the page scripts already track: rotX -0.10
     is their resting tilt, so it maps onto the model's own 19-degree view. */
  function render(o) {
    o = o || {};
    resize();
    if (!object || !w) return;
    const elev = Math.max(-1.45, Math.min(1.45, BASE_ELEV - ((o.rotX || 0) + 0.10)));
    const az = BASE_AZ - (o.rotY || 0);
    const fov = camera.fov * Math.PI / 360;
    const dist = radius / (fillFrac * (o.zoom || 1) * Math.tan(fov) * Math.min(1, camera.aspect));
    camera.position.set(
      center.x + Math.sin(az) * Math.cos(elev) * dist,
      center.y + Math.sin(elev) * dist,
      center.z + Math.cos(az) * Math.cos(elev) * dist);
    camera.near = dist / 100; camera.far = dist * 10;
    camera.updateProjectionMatrix();
    camera.lookAt(center);
    renderer.render(scene, camera);
  }

  function dispose() {
    if (object) object.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    scene.environment && scene.environment.dispose();
    renderer.dispose();
    canvas.remove();
  }

  return { canvas, setModel, render, resize, dispose };
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGL2RenderingContext && c.getContext("webgl2"));
  } catch (e) { return false; }
}

if (webglAvailable()) {
  window.Contact3D = { createView, buildRivetContact, buildButtonContact, buildRivet, materials: MAT };
  window.dispatchEvent(new Event("contact3d:ready"));
}
