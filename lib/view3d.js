// Shared 3D "real world" view for the animated optics lessons.
// Each lesson passes a SCENES map: { topicId: (kit) => ({ update(st), view(st) }) }.
// The lesson engine calls window.V3.draw(topicId, st) whenever it redraws the 2D picture.
import * as THREE from 'three';
import { OrbitControls } from './three/OrbitControls.js';
import { RoomEnvironment } from './three/RoomEnvironment.js';

export { THREE };

export function start(SCENES) {
  var box = document.getElementById('v3');
  if (!box) return;
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
  } catch (e) {
    document.body.classList.add('no3d');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  box.insertBefore(renderer.domElement, box.firstChild);

  var scene = new THREE.Scene();
  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  var BG = new THREE.Color(0x10151f);
  scene.background = BG;

  var camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 400);
  var controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = 0.15;
  controls.maxPolarAngle = Math.PI * 0.62;

  // lighting shared by every scene
  var hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a2018, 0.9);
  scene.add(hemi);
  var sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-6, 14, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  var sc = sun.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 12; sc.bottom = -12; sc.far = 60;
  scene.add(sun);

  var root = null, cur = null, curId = null, curKey = null, st = null, t0 = performance.now();
  var visible = true;
  var kit = makeKit(scene, renderer);

  function clear() {
    if (!root) return;
    scene.remove(root);
    root.traverse(function (o) {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
    });
    root = null;
  }
  function build(id) {
    clear();
    root = new THREE.Group();
    scene.add(root);
    kit.root = root;
    scene.background = BG; scene.fog = null;
    var maker = SCENES[id];
    cur = maker ? maker(kit) : null;
    curId = id; curKey = null;
  }
  function frameCamera(force) {
    if (!cur || !cur.view) return;
    var v = cur.view(st), key = curId + ':' + (v.key || '');
    if (!force && key === curKey) return;
    curKey = key;
    camera.position.set(v.pos[0], v.pos[1], v.pos[2]);
    controls.target.set(v.target[0], v.target[1], v.target[2]);
    camera.fov = v.fov || 40;
    camera.updateProjectionMatrix();
    controls.update();
  }

  function resize() {
    var w = box.clientWidth, h = Math.round(w * 9 / 16);
    if (w < 10) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = 'auto';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(box);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(box);
  renderer.domElement.addEventListener('dblclick', function () { frameCamera(true); });
  var resetBtn = document.getElementById('v3reset');
  if (resetBtn) resetBtn.onclick = function () { frameCamera(true); };

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(now) {
    requestAnimationFrame(loop);
    if (!st || !cur || !visible || document.hidden || box.offsetParent === null) return;
    kit.t = still ? 0 : (now - t0) / 1000;
    frameCamera(false);
    cur.update(st, kit.t);
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  window.V3 = {
    draw: function (id, s) { st = s; if (id !== curId) build(id); },
    THREE: THREE
  };
  if (window.__v3pending) { window.V3.draw(window.__v3pending[0], window.__v3pending[1]); }
  document.body.classList.add('has3d');
}

/* ------------------------------------------------------------------ */
/* kit: helpers that scenes use                                        */
/* ------------------------------------------------------------------ */
function makeKit(scene, renderer) {
  var V = function (a) { return new THREE.Vector3(a[0], a[1], a[2] || 0); };
  var UP = new THREE.Vector3(0, 1, 0);
  var cylGeo = new THREE.CylinderGeometry(1, 1, 1, 12, 1, true);
  var ballGeo = new THREE.SphereGeometry(1, 14, 10);
  var kit = { THREE: THREE, scene: scene, root: null, t: 0, V: V };

  function add(o) { kit.root.add(o); return o; }
  kit.add = add;

  /* ---------- materials ---------- */
  kit.mat = {
    glass: function (tint, op) {
      return new THREE.MeshPhysicalMaterial({ color: tint || 0xdff1ff, metalness: 0, roughness: 0.04, transmission: 0.92, thickness: 0.8, ior: 1.5, transparent: true, opacity: op == null ? 0.55 : op, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, depthWrite: false });
    },
    water: function (op) {
      return new THREE.MeshPhysicalMaterial({ color: 0x4fb3ff, metalness: 0, roughness: 0.08, transmission: 0.6, thickness: 1, ior: 1.33, transparent: true, opacity: op == null ? 0.35 : op, side: THREE.DoubleSide, depthWrite: false });
    },
    mirror: function () { return new THREE.MeshStandardMaterial({ color: 0xf2f5f8, metalness: 1, roughness: 0.04, side: THREE.DoubleSide, envMapIntensity: 1.6 }); },
    metal: function (c) { return new THREE.MeshStandardMaterial({ color: c || 0x9aa3ad, metalness: 0.85, roughness: 0.32 }); },
    paint: function (c, r) { return new THREE.MeshStandardMaterial({ color: c, metalness: 0.1, roughness: r == null ? 0.55 : r }); },
    glow: function (c, op) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op == null ? 1 : op, blending: THREE.AdditiveBlending, depthWrite: false }); },
    ghost: function (c) { return new THREE.MeshStandardMaterial({ color: c || 0x3ddc84, emissive: c || 0x3ddc84, emissiveIntensity: 0.55, transparent: true, opacity: 0.55, roughness: 0.4, side: THREE.DoubleSide, depthWrite: false }); },
    wood: function () {
      var c = document.createElement('canvas'); c.width = 512; c.height = 128;
      var g = c.getContext('2d');
      g.fillStyle = '#7a4e2c'; g.fillRect(0, 0, 512, 128);
      for (var i = 0; i < 60; i++) {
        g.strokeStyle = 'rgba(' + (40 + Math.random() * 40 | 0) + ',' + (20 + Math.random() * 20 | 0) + ',10,' + (0.15 + Math.random() * 0.25).toFixed(2) + ')';
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath(); var y = Math.random() * 128; g.moveTo(0, y);
        for (var x = 0; x <= 512; x += 32) g.lineTo(x, y + Math.sin(x / 60 + i) * 3);
        g.stroke();
      }
      var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(2, 1);
      return new THREE.MeshStandardMaterial({ map: tx, roughness: 0.7, metalness: 0 });
    }
  };

  /* ---------- basic shapes ---------- */
  kit.box = function (w, h, d, mat, pos) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); if (pos) m.position.set(pos[0], pos[1], pos[2] || 0); m.castShadow = m.receiveShadow = true; return add(m); };
  kit.cyl = function (r1, r2, h, mat, pos, seg) { var m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg || 32), mat); if (pos) m.position.set(pos[0], pos[1], pos[2] || 0); m.castShadow = m.receiveShadow = true; return add(m); };
  kit.sphere = function (r, mat, pos) { var m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), mat); if (pos) m.position.set(pos[0], pos[1], pos[2] || 0); m.castShadow = true; return add(m); };

  // a lab room: floor + table top (table surface at y = 0)
  kit.lab = function (w, d) {
    w = w || 24; d = d || 10;
    var floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), kit.mat.paint(0x1a1f29, 0.9));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -4.2; floor.receiveShadow = true; add(floor);
    var top = kit.box(w, 0.3, d, kit.mat.wood(), [0, -0.15, 0]);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { kit.box(0.35, 4, 0.35, kit.mat.paint(0x3b3027), [q[0] * (w / 2 - 0.6), -2.2, q[1] * (d / 2 - 0.6)]); });
    return top;
  };
  // optical bench: a metal rail with a centimetre scale along x
  kit.bench = function (x0, x1, z) {
    z = z || 0;
    var len = x1 - x0, c = document.createElement('canvas'); c.width = 2048; c.height = 64;
    var g = c.getContext('2d'); g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, 2048, 64); g.fillStyle = '#222';
    var cm = len * 10;
    for (var i = 0; i <= cm; i++) { var x = i / cm * 2048, h = i % 10 === 0 ? 30 : i % 5 === 0 ? 20 : 11; g.fillRect(x, 0, 1.4, h); if (i % 10 === 0 && i > 0 && i < cm) { g.font = '22px sans-serif'; g.fillText(String(i), x + 3, 56); } }
    var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
    kit.box(len, 0.22, 0.9, kit.mat.metal(0x6f7881), [(x0 + x1) / 2, 0.11, z]);
    var sc = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.4), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.6 }));
    sc.rotation.x = -Math.PI / 2; sc.position.set((x0 + x1) / 2, 0.225, z + 0.2); add(sc);
  };
  // a post holder standing on the bench, top at height y
  kit.post = function (x, y, z) {
    var g = new THREE.Group();
    var b = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 1), kit.mat.metal(0x50585f)); b.position.y = 0.34; g.add(b);
    var p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, Math.max(0.1, y - 0.45), 16), kit.mat.metal(0xb8c0c8)); p.position.y = 0.45 + (y - 0.45) / 2; g.add(p);
    g.position.set(x, 0, z || 0); g.traverse(function (o) { o.castShadow = true; });
    return add(g);
  };

  /* ---------- candle (object) ---------- */
  // returns a group whose local origin is the base of the wax; flame tip at y = H
  kit.candle = function (H, ghost) {
    var g = new THREE.Group(), wax = H * 0.72;
    var wm = ghost ? kit.mat.ghost() : new THREE.MeshStandardMaterial({ color: 0xf3ead2, roughness: 0.5, emissive: 0x332211, emissiveIntensity: 0.2 });
    var body = new THREE.Mesh(new THREE.CylinderGeometry(H * 0.13, H * 0.14, wax, 24), wm); body.position.y = wax / 2; body.castShadow = !ghost; g.add(body);
    var wick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, H * 0.06, 6), new THREE.MeshBasicMaterial({ color: ghost ? 0x3ddc84 : 0x111111 })); wick.position.y = wax + H * 0.03; g.add(wick);
    var flame = new THREE.Group();
    var outer = new THREE.Mesh(ballGeo, kit.mat.glow(ghost ? 0x3ddc84 : 0xff9a2e, ghost ? 0.6 : 0.9)); outer.scale.set(H * 0.07, H * 0.13, H * 0.07); flame.add(outer);
    var inner = new THREE.Mesh(ballGeo, kit.mat.glow(ghost ? 0xb8ffd6 : 0xfff4c4, 1)); inner.scale.set(H * 0.035, H * 0.08, H * 0.035); inner.position.y = -H * 0.02; flame.add(inner);
    flame.position.y = wax + H * 0.15; g.add(flame);
    if (!ghost) { var lt = new THREE.PointLight(0xffa04a, 2.2, 8, 1.6); lt.position.y = wax + H * 0.2; g.add(lt); }
    g.userData.flame = flame; g.userData.H = H;
    g.userData.tick = function (t) { var f = 1 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 29); flame.scale.set(1 / f, f, 1 / f); flame.rotation.z = 0.06 * Math.sin(t * 7); };
    return add(g);
  };

  /* ---------- light beams ---------- */
  // beam(color): call .set(points, frac, strength) every frame. Little bright pulses run along it to show direction.
  kit.beam = function (color, opt) {
    opt = opt || {};
    var r = opt.r || 0.03, g = new THREE.Group(); add(g);
    var col = new THREE.Color(color);
    var coreM = new THREE.MeshBasicMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.55), transparent: true });
    var glowM = kit.mat.glow(col, 0.3);
    var pulseM = kit.mat.glow(col.clone().lerp(new THREE.Color(0xffffff), 0.3), 0.95);
    var segs = [], pulses = [];
    for (var k = 0; k < (opt.pulses == null ? 3 : opt.pulses); k++) { var p = new THREE.Mesh(ballGeo, pulseM); p.scale.setScalar(r * 2.6); g.add(p); pulses.push(p); }
    function seg(i) {
      if (!segs[i]) { var c = new THREE.Mesh(cylGeo, coreM), h = new THREE.Mesh(cylGeo, glowM); g.add(c); g.add(h); segs[i] = [c, h]; }
      return segs[i];
    }
    var tmp = new THREE.Vector3();
    var api = {
      group: g,
      set: function (pts, frac, strength) {
        frac = frac == null ? 1 : Math.max(0, Math.min(1, frac));
        strength = strength == null ? 1 : strength;
        coreM.opacity = Math.min(1, strength * 1.2); glowM.opacity = 0.3 * strength; pulseM.opacity = 0.95 * strength;
        var P = pts.map(V), L = [0], i;
        for (i = 1; i < P.length; i++) L.push(L[i - 1] + P[i].distanceTo(P[i - 1]));
        var total = L[L.length - 1], upto = total * frac, n = 0;
        for (i = 1; i < P.length && L[i - 1] < upto - 1e-6; i++) {
          var a = P[i - 1], b = P[i].clone();
          if (L[i] > upto) b = a.clone().lerp(P[i], (upto - L[i - 1]) / (L[i] - L[i - 1]));
          var len = a.distanceTo(b); if (len < 1e-4) continue;
          var s = seg(n++), dir = tmp.subVectors(b, a).normalize();
          s.forEach(function (m, j) {
            m.visible = true;
            m.position.copy(a).lerp(b, 0.5);
            m.quaternion.setFromUnitVectors(UP, dir);
            var rr = j ? r * 3.2 : r; m.scale.set(rr, len, rr);
          });
        }
        for (; n < segs.length; n++) { segs[n][0].visible = segs[n][1].visible = false; }
        pulses.forEach(function (p, k) {
          if (upto < 0.05 || strength < 0.05) { p.visible = false; return; }
          var d = ((kit.t * (opt.speed || 2.2) + k * upto / pulses.length) % upto);
          for (var j = 1; j < L.length && L[j] < d; j++);
          if (j >= L.length) { p.visible = false; return; }
          p.visible = true; p.position.copy(P[j - 1]).lerp(P[j], (d - L[j - 1]) / Math.max(1e-6, L[j] - L[j - 1]));
        });
        return api;
      },
      hide: function () { api.set([[0, 0, 0], [0, 0, 0]], 0, 0); }
    };
    return api;
  };

  // dashed construction line
  kit.dashed = function (color, op) {
    var m = new THREE.LineDashedMaterial({ color: color || 0x9aa3ad, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: op == null ? 0.85 : op });
    var geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]);
    var line = new THREE.Line(geo, m); add(line);
    return {
      line: line,
      set: function (pts, show) {
        line.visible = show !== false;
        if (!line.visible) return;
        line.geometry.dispose();
        line.geometry = new THREE.BufferGeometry().setFromPoints(pts.map(V));
        line.computeLineDistances();
      }
    };
  };

  /* ---------- text labels ---------- */
  kit.label = function (text, color, size) {
    var c = document.createElement('canvas'), g = c.getContext('2d'), fs = 64;
    var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
    var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false, depthTest: false }));
    sp.renderOrder = 10;
    var cur = null;
    sp.setText = function (t, col) {
      if (t + col === cur) return sp; cur = t + col;
      g.font = '600 ' + fs + 'px system-ui, sans-serif';
      var w = Math.ceil(g.measureText(t).width) + 36;
      if (c.width !== w || c.height !== fs + 28) {
        c.width = w; c.height = fs + 28;
        tx.dispose(); tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; sp.material.map = tx; sp.material.needsUpdate = true;
      }
      g.font = '600 ' + fs + 'px system-ui, sans-serif';
      g.fillStyle = 'rgba(12,16,24,0.72)'; roundRect(g, 0, 0, w, fs + 28, 22); g.fill();
      g.fillStyle = col || '#ffffff'; g.textBaseline = 'middle'; g.fillText(t, 18, (fs + 28) / 2 + 2);
      tx.needsUpdate = true;
      var h = (size || 0.42) * 1.3; sp.scale.set(h * w / (fs + 28), h, 1);
      return sp;
    };
    sp.setText(text, color);
    sp.at = function (p) { sp.position.set(p[0], p[1], p[2] || 0); return sp; };
    return add(sp);
  };
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  // a laser pointer pointing along dir from position p (beam starts at its tip)
  kit.laser = function (color) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.3, 20), kit.mat.metal(0x2d3138)); body.position.y = -0.65; g.add(body);
    var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.08, 20), kit.mat.metal(0xd0a040)); ring.position.y = -0.25; g.add(ring);
    var btn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.06), new THREE.MeshStandardMaterial({ color: 0xc0392b })); btn.position.set(0.11, -0.5, 0); g.add(btn);
    var tip = new THREE.Mesh(ballGeo, kit.mat.glow(color || 0xff3030, 1)); tip.scale.setScalar(0.06); g.add(tip);
    g.traverse(function (o) { o.castShadow = true; });
    add(g);
    g.aim = function (p, dir) { g.position.set(p[0], p[1], p[2] || 0); g.quaternion.setFromUnitVectors(UP, V(dir).normalize()); return g; };
    return g;
  };

  // lens solid of revolution around the x axis. faces: radius of each face (+ = bulging out), a = aperture radius, e = edge half thickness
  kit.lensGeo = function (a, Ra, Rb, e, concave) {
    function sag(R, r) { return R - Math.sqrt(Math.max(0, R * R - r * r)); }
    var pts = [], N = 24, i, r;
    for (i = 0; i <= N; i++) { r = a * i / N; pts.push(new THREE.Vector2(r, concave ? -(e + sag(Ra, r)) : -(e + sag(Ra, a) - sag(Ra, r)))); }
    for (i = N; i >= 0; i--) { r = a * i / N; pts.push(new THREE.Vector2(r, concave ? e + sag(Rb, r) : e + sag(Rb, a) - sag(Rb, r))); }
    var geo = new THREE.LatheGeometry(pts, 48);
    geo.rotateZ(-Math.PI / 2); // lathe axis y -> x
    return geo;
  };

  kit.stars = function (n, R) {
    var pos = [];
    for (var i = 0; i < n; i++) { var u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u); pos.push(R * s * Math.cos(th), R * Math.abs(u) * 0.9 + 2, R * s * Math.sin(th)); }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    return add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.9 })));
  };

  kit.clipLine = function (a, b, X0, X1, Y0, Y1) { // extend ray a->b until it leaves the box
    var dx = b[0] - a[0], dy = b[1] - a[1], t = 1e9;
    if (dx > 1e-9) t = Math.min(t, (X1 - a[0]) / dx); else if (dx < -1e-9) t = Math.min(t, (X0 - a[0]) / dx);
    if (dy > 1e-9) t = Math.min(t, (Y1 - a[1]) / dy); else if (dy < -1e-9) t = Math.min(t, (Y0 - a[1]) / dy);
    if (t === 1e9) t = 1;
    return [a[0] + dx * t, a[1] + dy * t, 0];
  };
  return kit;
}
