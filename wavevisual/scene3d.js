// 3D "real world" scenes for the Wave Optics lesson. Same state keys as the 2D drawings.
import { THREE } from '../lib/view3d.js';

var RAD = Math.PI / 180;

/* wavelength (nm) -> [r, g, b] in 0..1 */
function hue(nm) {
  var r = 0, g = 0, b = 0;
  if (nm < 440) { r = -(nm - 440) / 60; b = 1; }
  else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
  else if (nm < 510) { g = 1; b = -(nm - 510) / 20; }
  else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
  else if (nm < 645) { r = 1; g = -(nm - 645) / 65; }
  else { r = 1; }
  var f = nm < 420 ? 0.4 + 0.6 * (nm - 380) / 40 : nm > 680 ? 0.4 + 0.6 * (750 - nm) / 70 : 1;
  return [Math.max(0, r * f), Math.max(0, g * f), Math.max(0, b * f)];
}
function css(c, a) { return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + (a == null ? 1 : a) + ')'; }

/* a wave surface (water or "light field") with per-vertex heights and colours */
function surface(kit, x0, x1, z0, z1, nx, nz, y) {
  var geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz);
  geo.rotateX(-Math.PI / 2);
  geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
  var n = geo.attributes.position.count;
  geo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
  var mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.05, envMapIntensity: 0.45, side: THREE.DoubleSide });
  var mesh = new THREE.Mesh(geo, mat); mesh.position.y = y || 0; mesh.receiveShadow = true;
  kit.add(mesh);
  var pos = geo.attributes.position, col = geo.attributes.color, c = { h: 0, r: 0, g: 0, b: 0 };
  return {
    mesh: mesh,
    update: function (fn) {
      for (var i = 0; i < n; i++) {
        fn(pos.getX(i), pos.getZ(i), c);
        pos.setY(i, c.h); col.setXYZ(i, c.r, c.g, c.b);
      }
      pos.needsUpdate = true; col.needsUpdate = true;
      geo.computeVertexNormals();
    }
  };
}
// water colour from height (h normalised to about -1..1)
function waterCol(c, h) {
  var k = Math.max(0, Math.min(1, 0.5 + 0.5 * h));
  c.r = 0.01 + 0.2 * k * k * k; c.g = 0.06 + 0.34 * k * k; c.b = 0.16 + 0.5 * k;
}

/* glass-walled ripple tank on the lab table, water level at y = WL */
var WL = 0.6;
function tank(kit, x0, x1, z0, z1) {
  kit.lab(Math.max(24, x1 - x0 + 6), Math.max(10, z1 - z0 + 3));
  kit.box(x1 - x0 + 0.3, 0.12, z1 - z0 + 0.3, kit.mat.paint(0x0d2236, 0.6), [(x0 + x1) / 2, 0.06, (z0 + z1) / 2]);
  var gm = kit.mat.glass(0xcfe8ff, 0.25), h = 0.95;
  kit.box(x1 - x0 + 0.3, h, 0.08, gm, [(x0 + x1) / 2, h / 2, z0 - 0.15]);
  kit.box(x1 - x0 + 0.3, h, 0.08, gm, [(x0 + x1) / 2, h / 2, z1 + 0.15]);
  kit.box(0.08, h, z1 - z0 + 0.3, gm, [x0 - 0.15, h / 2, (z0 + z1) / 2]);
  kit.box(0.08, h, z1 - z0 + 0.3, gm, [x1 + 0.15, h / 2, (z0 + z1) / 2]);
}

/* double-headed arrow showing an electric field direction */
function fieldArrow(kit, color) {
  var g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: color, transparent: true });
  var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), m);
  var c1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 10), m), c2 = c1.clone(); c2.rotation.x = Math.PI;
  g.add(shaft, c1, c2); kit.add(g);
  var Y = new THREE.Vector3(0, 1, 0), d = new THREE.Vector3();
  return {
    g: g, m: m,
    set: function (p, dir, len) {
      len = Math.abs(len);
      g.visible = len > 0.06;
      if (!g.visible) return;
      g.position.set(p[0], p[1], p[2]);
      d.set(dir[0], dir[1], dir[2]).normalize();
      g.quaternion.setFromUnitVectors(Y, d);
      var L = Math.max(0.01, len - 0.4);
      shaft.scale.y = L; c1.position.y = len / 2 - 0.1; c2.position.y = -len / 2 + 0.1;
    }
  };
}

/* a lamp housing with a glowing front */
function lamp(kit, x, y, color) {
  kit.box(1.1, 0.9, 0.9, kit.mat.paint(0x2a2f38, 0.4), [x, y, 0]);
  kit.cyl(0.12, 0.12, y - 0.45, kit.mat.metal(), [x, (y - 0.45) / 2, 0]);
  var glow = new THREE.Mesh(new THREE.CircleGeometry(0.33, 32), kit.mat.glow(color || 0xfff2c0, 1));
  glow.rotation.y = Math.PI / 2; glow.position.set(x + 0.56, y, 0); kit.add(glow);
  var lt = new THREE.PointLight(color || 0xfff2c0, 3, 6, 1.5); lt.position.set(x + 0.9, y, 0); kit.add(lt);
  return glow;
}

/* barrier wall (standing in the tank) with openings: list of [zc, width] */
function barrier(kit, x, z0, z1, h, color) {
  var mat = kit.mat.paint(color || 0x30343c, 0.5), parts = [];
  for (var i = 0; i < 4; i++) { var b = kit.box(1, 1, 1, mat); parts.push(b); }
  return function (gaps) {
    var edges = [z0];
    gaps.forEach(function (g) { edges.push(g[0] - g[1] / 2, g[0] + g[1] / 2); });
    edges.push(z1);
    parts.forEach(function (b, i) {
      var a = edges[2 * i], c = edges[2 * i + 1];
      if (c == null || c - a < 0.01) { b.visible = false; return; }
      b.visible = true; b.scale.set(0.16, h, c - a); b.position.set(x, h / 2, (a + c) / 2);
    });
  };
}

/* a white screen with a canvas pattern along z */
function screenPanel(kit, h, w) {
  var cv = document.createElement('canvas'); cv.width = 512; cv.height = 8;
  var tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  var face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tx }));
  face.rotation.y = -Math.PI / 2;
  var g = new THREE.Group(); g.add(face);
  var frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, h + 0.2, w + 0.2), kit.mat.paint(0x22262d, 0.5)); frame.position.x = 0.08; g.add(frame);
  var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1, 12), kit.mat.metal()); g.add(leg);
  kit.add(g);
  var key = '';
  return {
    g: g,
    place: function (x, yc) { g.position.set(x, yc, 0); leg.scale.y = yc - h / 2; leg.position.y = -h / 2 - (yc - h / 2) / 2; leg.position.x = 0.1; },
    paint: function (k, I, rgb, amt) { // I(f) for f in -1..1 across the width
      if (k === key) return; key = k;
      var g2 = cv.getContext('2d'), img = g2.createImageData(512, 8);
      for (var x = 0; x < 512; x++) {
        var v = amt * I((x + 0.5) / 256 - 1);
        var r = 0.06 + v * rgb[0], gg = 0.06 + v * rgb[1], b = 0.07 + v * rgb[2];
        for (var y = 0; y < 8; y++) { var o = (y * 512 + x) * 4; img.data[o] = Math.min(255, r * 255); img.data[o + 1] = Math.min(255, gg * 255); img.data[o + 2] = Math.min(255, b * 255); img.data[o + 3] = 255; }
      }
      g2.putImageData(img, 0, 0); tx.needsUpdate = true;
    }
  };
}

/* text label sprite; a new texture is made whenever the canvas size changes */
function label(kit, text, color, size) {
  var c = document.createElement('canvas'), g = c.getContext('2d'), fs = 64, cur = null;
  var mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false });
  var sp = new THREE.Sprite(mat); sp.renderOrder = 10;
  sp.setText = function (t, col) {
    if (t + col === cur) return sp; cur = t + col;
    g.font = '600 ' + fs + 'px system-ui, sans-serif';
    var w = Math.ceil(g.measureText(t).width) + 36, h = fs + 28;
    c = document.createElement('canvas'); c.width = w; c.height = h; g = c.getContext('2d');
    g.font = '600 ' + fs + 'px system-ui, sans-serif';
    g.fillStyle = 'rgba(12,16,24,0.72)'; g.beginPath(); g.moveTo(22, 0); g.arcTo(w, 0, w, h, 22); g.arcTo(w, h, 0, h, 22); g.arcTo(0, h, 0, 0, 22); g.arcTo(0, 0, w, 0, 22); g.closePath(); g.fill();
    g.fillStyle = col || '#fff'; g.textBaseline = 'middle'; g.fillText(t, 18, h / 2 + 2);
    if (mat.map) mat.map.dispose();
    mat.map = new THREE.CanvasTexture(c); mat.map.colorSpace = THREE.SRGBColorSpace; mat.needsUpdate = true;
    var hh = size || 0.42; sp.scale.set(hh * w / h, hh, 1);
    sp.visible = t !== '';
    return sp;
  };
  sp.setText(text, color);
  sp.at = function (p) { sp.position.set(p[0], p[1], p[2] || 0); return sp; };
  return kit.add(sp);
}

var SCENES = {};

/* ================= 1. wavefronts and Huygens ================= */
SCENES.huy = function (kit) {
  var X0 = -8, X1 = 8, Z0 = -4.5, Z1 = 4.5;
  tank(kit, X0, X1, Z0, Z1);
  var water = surface(kit, X0, X1, Z0, Z1, 150, 90, WL);
  var pebble = kit.sphere(0.22, kit.mat.paint(0x6b6259, 0.8));
  var pebLab = label(kit, 'source', '#ffd38a', 0.36);
  var rays = [-3.6, -1.8, 0, 1.8, 3.6].map(function () { return kit.beam(0xff6b5b, { r: 0.025, pulses: 2 }); });
  // Huygens construction parts
  var S0 = [-7, 0], R0 = 4, A = 50 * RAD;
  function arcPts(R, y) { var p = []; for (var k = 0; k <= 40; k++) { var a = -A + 2 * A * k / 40; p.push([S0[0] + R * Math.cos(a), y, S0[1] + R * Math.sin(a)]); } return p; }
  var oldF = kit.beam(0x7aa7ee, { r: 0.04, pulses: 0 }), newF = kit.beam(0x3ddc84, { r: 0.05, pulses: 0 }), back = kit.dashed(0x9aa3ad);
  back.set(arcPts(R0 - 1.7, WL + 0.08));
  var dots = [], rings = [], ringGeo = new THREE.RingGeometry(0.975, 1, 72), ringMat = kit.mat.glow(0x5b9dff, 0.7);
  ringGeo.rotateX(-Math.PI / 2);
  for (var k = -4; k <= 4; k++) {
    var a = k * 12.5 * RAD, p = [S0[0] + R0 * Math.cos(a), WL + 0.1, S0[1] + R0 * Math.sin(a)];
    var d = kit.sphere(0.09, kit.mat.glow(0x9fd0ff, 1), p); dots.push(d);
    var r = new THREE.Mesh(ringGeo, ringMat); r.position.set(p[0], p[1], p[2]); kit.add(r); rings.push(r);
  }
  var lOld = label(kit, 'old wavefront', '#9fc3ff', 0.5), lNew = label(kit, 'new wavefront', '#7dffb0', 0.5);
  var srcDot = kit.sphere(0.16, kit.mat.glow(0xff6b5b, 1), [S0[0], WL + 0.1, S0[1]]);
  var hw = { };
  return {
    view: function (s) { return s.mode ? { key: 'h', pos: [-1.5, 10.5, 9.5], target: [-1.5, 0.4, 0] } : { key: 'w', pos: [0, 8.5, 11.5], target: [0, 0.2, 0] }; },
    update: function (s, t) {
      var m1 = !!s.mode;
      if (!m1) {
        var sx = -6.2 - s.far * s.far * 260, lam = s.lam / 36 * 1.0, kk = 2 * Math.PI / lam, w = kk * 0.95 * t, near = s.far < 0.03;
        water.update(function (x, z, c) {
          var r = Math.hypot(x - sx, z), amp = near ? 0.16 / Math.sqrt(1 + 0.5 * r) : 0.12, v = Math.cos(kk * r - w);
          if (r < 0.25) v = 0;
          c.h = amp * v; waterCol(c, v * (near ? Math.max(0.35, 1 - r / 14) : 0.9));
        });
        pebble.visible = pebLab.visible = sx > X0;
        pebble.position.set(sx, WL + 0.05 + 0.08 * Math.abs(Math.sin(t * 3)), 0);
        pebLab.at([sx, WL + 0.75, 0]);
        [-3.6, -1.8, 0, 1.8, 3.6].forEach(function (zt, j) {
          var bx = 7.8, x0 = Math.max(sx + 0.5, X0 + 0.3), f = (x0 - sx) / (bx - sx);
          rays[j].set([[x0, WL + 0.35, zt * f], [bx, WL + 0.35, zt]], 1, s.rays);
        });
      } else {
        water.update(function (x, z, c) { var v = 0.15 * Math.sin(x * 1.3 + t) * Math.sin(z * 1.1 - t * 0.7); c.h = 0.02 * v; waterCol(c, v - 0.2); });
        rays.forEach(function (b) { b.hide(); });
        pebble.visible = pebLab.visible = false;
      }
      var wr = s.w * 1.7;
      oldF.set(arcPts(R0, WL + 0.1), m1 ? 1 : 0, m1 ? 1 : 0);
      newF.set(arcPts(R0 + 1.7, WL + 0.1), m1 ? 1 : 0, m1 ? s.env : 0);
      back.line.visible = m1 && s.env > 0.5;
      dots.forEach(function (d) { d.visible = m1; });
      srcDot.visible = m1;
      rings.forEach(function (r) { r.visible = m1 && wr > 0.05; r.scale.set(Math.max(0.01, wr), 1, Math.max(0.01, wr)); });
      lOld.visible = m1; lOld.at([S0[0] + R0 * Math.cos(-A) - 0.2, WL + 0.6, S0[1] + R0 * Math.sin(-A) - 0.4]);
      lNew.visible = m1 && s.env > 0.5; lNew.at([S0[0] + (R0 + 1.7) * Math.cos(-A) + 0.6, WL + 0.6, S0[1] + (R0 + 1.7) * Math.sin(-A) - 0.4]);
    }
  };
};

/* ================= 2. refraction / reflection of a plane wave ================= */
SCENES.wr = function (kit) {
  var X0 = -8, X1 = 8, Z0 = -4.5, Z1 = 4.5;
  tank(kit, X0, X1, Z0, Z1);
  var water = surface(kit, X0, X1, Z0, Z1, 150, 90, WL);
  // glass plate under the slow (shallow) half
  var plateNear = kit.box(X1 - X0, 0.36, Z1, kit.mat.glass(0xbfe6ff, 0.5), [0, 0.3, Z1 / 2]);
  var plateFar = kit.box(X1 - X0, 0.36, -Z0, kit.mat.glass(0xbfe6ff, 0.5), [0, 0.3, Z0 / 2]);
  var wall = kit.box(X1 - X0, 1.1, 0.25, kit.mat.paint(0x8c949e, 0.35), [0, 0.55, 0.12]);
  var normal = kit.dashed(0xe6e7ea); normal.set([[0, WL + 0.4, Z0], [0, WL + 0.4, Z1]]);
  var inc = kit.beam(0xffffff, { r: 0.03 }), out = kit.beam(0x3ddc84, { r: 0.03 });
  var l1 = label(kit, 'medium 1 · fast', '#cfe2ff', 0.5).at([X0 + 2.2, WL + 0.6, Z0 + 0.6]);
  var l2 = label(kit, 'medium 2', '#cfe2ff', 0.5).at([X0 + 1.6, WL + 0.6, Z1 - 0.5]);
  return {
    view: function (s) { return { key: 'a', pos: [2.5, 12, 11.5], target: [0, 0.2, 0.3] }; },
    update: function (s, t) {
      var i = s.i * RAD, si = Math.sin(i), ci = Math.cos(i), n = s.mode ? 1 : s.n, sr = si / n, tir = !s.mode && sr > 1;
      var lam = 1.25, k1 = 2 * Math.PI / lam, w = k1 * 1.0 * t, k2 = k1 * n, cr = tir ? 0 : Math.sqrt(1 - sr * sr);
      var kap = tir ? k1 * Math.sqrt(si * si - n * n) : 0, A = 0.1;
      water.update(function (x, z, c) {
        var v;
        if (s.mode) {
          if (z > 0) { c.h = 0; waterCol(c, -0.6); return; }
          v = 0.5 * (Math.cos(k1 * (x * si + z * ci) - w) - Math.cos(k1 * (x * si - z * ci) - w));
        } else if (z <= 0) {
          v = Math.cos(k1 * (x * si + z * ci) - w);
          if (tir) v = 0.5 * (v + Math.cos(k1 * (x * si - z * ci) - w));
        } else if (tir) v = Math.cos(k1 * x * si - w) * Math.exp(-kap * z);
        else v = Math.cos(k2 * (x * sr + z * cr) - w);
        c.h = A * v; waterCol(c, v);
      });
      plateNear.visible = !s.mode && s.n > 1.02; plateFar.visible = !s.mode && s.n < 0.98;
      wall.visible = !!s.mode;
      l2.setText(s.mode ? 'reflecting wall' : 'medium 2 · ' + (s.n > 1.02 ? 'slow (shallow)' : s.n < 0.98 ? 'fast (deep)' : 'same'), '#cfe2ff');
      l2.visible = true;
      var O = [0, WL + 0.4, 0];
      inc.set([[-3.2 * si, WL + 0.4, -3.2 * ci], O], 1, 1);
      if (s.mode || tir) out.set([O, [3.2 * si, WL + 0.4, -3.2 * ci]], 1, 1);
      else out.set([O, [3.2 * sr, WL + 0.4, 3.2 * cr]], 1, 1);
    }
  };
};

/* ================= 3. superposition ================= */
SCENES.sup = function (kit) {
  kit.lab(24, 10);
  var board = kit.box(14, 6.4, 0.2, kit.mat.paint(0x1b2430, 0.8), [-0.6, 3.4, -1.2]);
  var N = 160, X0 = -7, X1 = 4.4, rows = [4.9, 3.1, 1.1];
  function ribbon(color, wd) {
    var geo = new THREE.BufferGeometry(), p = new Float32Array((N + 1) * 2 * 3), idx = [];
    for (var j = 0; j < N; j++) { var a = 2 * j, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
    geo.setIndex(idx); geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    var core = new THREE.Mesh(geo, kit.mat.glow(color, 1)), glow = new THREE.Mesh(geo.clone(), kit.mat.glow(color, 0.28));
    kit.add(core); kit.add(glow);
    return function (yc, fn) {
      [[core, wd], [glow, wd * 3.2]].forEach(function (q) {
        var arr = q[0].geometry.attributes.position.array, h = q[1] / 2;
        for (var j = 0; j <= N; j++) {
          var x = X0 + (X1 - X0) * j / N, y = yc + fn(x), o = j * 6;
          arr[o] = x; arr[o + 1] = y - h; arr[o + 2] = 0; arr[o + 3] = x; arr[o + 4] = y + h; arr[o + 5] = 0;
        }
        q[0].geometry.attributes.position.needsUpdate = true; q[0].geometry.computeBoundingSphere();
      });
    };
  }
  var r1 = ribbon(0x5b9dff, 0.06), r2 = ribbon(0xff6b5b, 0.06), r3 = ribbon(0x3ddc84, 0.09);
  rows.forEach(function (y) { var d = kit.dashed(0x6d7682, 0.6); d.set([[X0, y, 0], [X1, y, 0]]); });
  label(kit, 'wave 1', '#8fbaff', 0.36).at([X0 + 0.7, rows[0] + 1.0, 0]);
  label(kit, 'wave 2', '#ff9a8e', 0.36).at([X0 + 0.7, rows[1] + 1.0, 0]);
  label(kit, 'wave 1 + wave 2', '#7dffb0', 0.36).at([X0 + 1.4, rows[2] + 1.35, 0]);
  // bulb on a stand
  var bx = 6.1, by = 2.9;
  kit.cyl(0.5, 0.6, 0.25, kit.mat.metal(0x50585f), [bx, 0.13, 0]);
  kit.cyl(0.06, 0.06, by - 1.1, kit.mat.metal(), [bx, (by - 1.1) / 2 + 0.2, 0]);
  kit.cyl(0.32, 0.36, 0.5, kit.mat.metal(0xb8a46a), [bx, by - 0.95, 0]);
  var glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, transparent: true, opacity: 0.35, emissive: 0xffd84a, emissiveIntensity: 0 }));
  glass.position.set(bx, by, 0); kit.add(glass);
  var core = kit.sphere(0.35, kit.mat.glow(0xffd84a, 1), [bx, by, 0]);
  var halo = kit.sphere(1.5, kit.mat.glow(0xffc23a, 0.2), [bx, by, 0]);
  var light = new THREE.PointLight(0xffd27a, 0, 12, 1.6); light.position.set(bx, by, 0.6); kit.add(light);
  var lI = label(kit, '', '#ffd84a', 0.38);
  return {
    view: function () { return { key: 's', pos: [-0.3, 4.2, 13.5], target: [-0.3, 2.9, 0] }; },
    update: function (s, t) {
      var a = 0.62, k = 2 * Math.PI / 2.6, w = t * 3, ph = s.phi * RAD;
      if (!s.coh) ph = 3.1 * Math.sin(t * 2.3) + 2.2 * Math.sin(t * 5.1 + 1) + 1.5 * Math.sin(t * 9.7);
      r1(rows[0], function (x) { return a * Math.sin(k * x - w); });
      r2(rows[1], function (x) { return a * s.r * Math.sin(k * x - w + ph); });
      r3(rows[2], function (x) { return a * Math.sin(k * x - w) + a * s.r * Math.sin(k * x - w + ph); });
      var I = 1 + s.r * s.r + 2 * s.r * Math.cos(ph), f = Math.min(1, I / 4);
      core.material.opacity = 0.08 + 0.92 * f; core.scale.setScalar(0.6 + 0.6 * f);
      halo.material.opacity = 0.22 * f; halo.scale.setScalar(0.6 + 0.35 * f);
      glass.material.emissiveIntensity = 0.6 * f;
      light.intensity = 9 * f;
      lI.setText('brightness I = ' + I.toFixed(2) + ' I₀', '#ffd84a').at([bx, by + 1.7, 0]);
    }
  };
};

/* ================= 4 + 5. slits: ripple field + screen ================= */
function slitScene(kit, double) {
  var X0 = -7.5, XS = -4.5, X1 = 6.2, Z0 = -3.6, Z1 = 3.6;
  tank(kit, -10.5, X1 + 0.2, Z0, Z1);
  var field = surface(kit, X0, X1, Z0, Z1, 160, 96, WL);
  var src = lamp(kit, -9.6, WL + 0.15);
  var b1 = barrier(kit, X0, Z0, Z1, 1.15, 0x30343c);
  b1([[0, 0.14]]);
  var b2 = barrier(kit, XS, Z0, Z1, 1.15, 0x30343c);
  var scr = screenPanel(kit, 2.6, 2 * (Z1 - Z0) * 0.5);
  var lS1 = label(kit, double ? 'S₁' : 'slit a', '#ffd38a', 0.34), lS2 = double ? label(kit, 'S₂', '#ffd38a', 0.34) : null;
  var lScr = label(kit, 'screen', '#cfe2ff', 0.34), lLamp = label(kit, 'lamp', '#cfe2ff', 0.3).at([-9.6, WL + 1.05, 0]);
  var beamIn = kit.beam(0xffffff, { r: 0.03, pulses: 2 });
  var srcs = [], NS = 7;
  return {
    view: function () { return { key: 'y', pos: [-2.2, 9.2, 12.4], target: [-2, 0.5, 0] }; },
    update: function (s, t) {
      var rgb = hue(s.lam), lp = s.lam / 700 * 0.9 + 0.22, k = 2 * Math.PI / lp, w = k * 0.9 * t;
      var sx = -1.5 + s.D * 3.5, sz = [], amp = 0.09;
      src.material.color.setRGB(rgb[0], rgb[1], rgb[2]);
      if (double) {
        var sep = 0.5 + s.d * 1.0; sz = [-sep / 2, sep / 2];
        b2([[-sep / 2, 0.14], [sep / 2, 0.14]]);
        lS1.at([XS - 0.5, WL + 1.2, -sep / 2 - 0.25]); lS2.at([XS - 0.5, WL + 1.2, sep / 2 + 0.25]);
      } else {
        var aw = 0.15 + s.a * 4;
        for (var j = 0; j < NS; j++) sz.push(-aw / 2 + aw * (j + 0.5) / NS);
        b2([[0, aw]]);
        lS1.at([XS - 0.6, WL + 1.25, aw / 2 + 0.6]);
      }
      var wav = double ? s.wav : 1, d0 = Math.abs(XS - X0);
      field.update(function (x, z, c) {
        var v = 0;
        if (x > sx - 0.05) { c.h = 0; c.r = 0.02; c.g = 0.05; c.b = 0.09; return; }
        if (x <= XS) { var r0 = Math.hypot(x - X0, z); v = r0 < 0.1 ? 0 : Math.cos(k * r0 - w) * Math.min(1, 1.6 / Math.sqrt(r0 + 0.6)); }
        else {
          for (var q = 0; q < sz.length; q++) { var r = Math.hypot(x - XS, z - sz[q]); v += Math.cos(k * (r + d0) - w) / Math.sqrt(r + 0.35); }
          v *= (double ? 0.9 : 2.2 / sz.length) * wav;
        }
        c.h = amp * v;
        var e = Math.max(0, Math.min(1, 0.5 + 0.45 * v));
        e = e * e; c.r = 0.02 + rgb[0] * e * 0.62; c.g = 0.03 + rgb[1] * e * 0.62; c.b = 0.06 + rgb[2] * e * 0.62;
      });
      scr.place(sx + 0.1, WL + 1.45);
      lScr.at([sx + 0.2, WL + 3.05, 0]);
      beamIn.set([[-9.0, WL + 0.15, 0], [X0 - 0.1, WL + 0.15, 0]], 1, 1);
      var half = (Z1 - Z0) * 0.5, key, I;
      if (double) {
        var beta = s.lam * s.D / (1000 * s.d), per = beta * 0.6;
        key = [s.lam, s.d, s.D, s.pat.toFixed(2)].join();
        I = function (f) { var c = Math.cos(Math.PI * f * half / per); return c * c; };
      } else {
        var y1 = s.lam * s.D / (1000 * s.a), sc = Math.min(1e9, y1 * 0.25);
        key = [s.lam, s.a, s.D, s.pat.toFixed(2)].join();
        I = function (f) { var al = Math.PI * f * half / sc; if (Math.abs(al) < 1e-6) return 1; var v = Math.sin(al) / al; return Math.sqrt(v * v); };
      }
      scr.paint(key, I, rgb, s.pat);
    }
  };
}
SCENES.ydse = function (kit) { return slitScene(kit, true); };
SCENES.diff = function (kit) { return slitScene(kit, false); };

/* ================= 6. polarisation ================= */
function polaroidTex() {
  var c = document.createElement('canvas'); c.width = c.height = 256;
  var g = c.getContext('2d'); g.fillStyle = '#3a3f2a'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(20,22,14,0.85)'; g.lineWidth = 5;
  for (var x = 8; x < 256; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); }
  var tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
}
SCENES.pol = function (kit) {
  kit.lab(24, 10);
  var Y = 2.6, A = kit.root;
  // Malus parts
  var malus = new THREE.Group(); A.add(malus);
  kit.root = malus;
  var lmp = lamp(kit, -9.2, Y, 0xffe9a8);
  var bA = kit.beam(0xffd84a, { r: 0.07, pulses: 0 }), bB = kit.beam(0xffd84a, { r: 0.07, pulses: 0 }), bC = kit.beam(0xffd84a, { r: 0.07, pulses: 0 });
  function polaroid(x) {
    var g = new THREE.Group();
    var disc = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.06, 48), new THREE.MeshStandardMaterial({ map: polaroidTex(), transparent: true, opacity: 0.82, roughness: 0.3, side: THREE.DoubleSide }));
    disc.rotation.z = Math.PI / 2; g.add(disc);
    var ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.08, 12, 64), kit.mat.metal(0x3d434b)); ring.rotation.y = Math.PI / 2; g.add(ring);
    var axis = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.5, 0.05), kit.mat.glow(0x9fd0ff, 0.9)); axis.position.x = -0.05; g.add(axis);
    g.position.set(x, Y, 0); malus.add(g);
    kit.cyl(0.07, 0.07, Y - 1.4, kit.mat.metal(), [x, (Y - 1.4) / 2, 0]);
    kit.cyl(0.4, 0.45, 0.15, kit.mat.metal(0x50585f), [x, 0.08, 0]);
    return g;
  }
  var P1 = polaroid(-3), P2 = polaroid(2.4);
  label(kit, 'P₁', '#cfe2ff', 0.4).at([-3, Y + 1.95, 0]); label(kit, 'P₂', '#cfe2ff', 0.4).at([2.4, Y + 1.95, 0]);
  var lU = label(kit, 'unpolarised', '#ffd38a', 0.32).at([-6.3, Y + 1.6, 0]);
  label(kit, 'plane polarised', '#ffd38a', 0.32).at([-0.3, Y + 1.6, 0]);
  var lOut = label(kit, '', '#7dffb0', 0.34);
  var scr = kit.box(0.15, 3, 3.2, new THREE.MeshStandardMaterial({ color: 0xf4f1e8, roughness: 0.8, emissive: 0xffd84a, emissiveIntensity: 0 }), [8.4, Y, 0]);
  kit.cyl(0.07, 0.07, Y - 1.5, kit.mat.metal(), [8.4, (Y - 1.5) / 2, 0]);
  var spot = new THREE.Mesh(new THREE.CircleGeometry(0.55, 40), kit.mat.glow(0xffd84a, 1)); spot.rotation.y = -Math.PI / 2; spot.position.set(8.3, Y, 0); malus.add(spot);
  var un = [], mid = [], fin = [];
  [-7.3, -6, -4.7].forEach(function (x) { for (var q = 0; q < 4; q++) un.push({ x: x, q: q, a: fieldArrow(kit, 0xff8a7a) }); });
  [-1.7, -0.5, 0.8].forEach(function (x) { mid.push({ x: x, a: fieldArrow(kit, 0x5b9dff) }); });
  [3.8, 5.1, 6.4].forEach(function (x) { fin.push({ x: x, a: fieldArrow(kit, 0x3ddc84) }); });
  // Brewster parts
  var brew = new THREE.Group(); A.add(brew); kit.root = brew;
  var slab = kit.box(12, 1.6, 4, kit.mat.glass(0xcfeaff, 0.45), [0, 0.8, 0]);
  var normal = kit.dashed(0xe6e7ea); normal.set([[0, 0.2, 0], [0, 5.6, 0]]);
  var inc = kit.beam(0xffd84a, { r: 0.05 }), ref = kit.beam(0xff8a7a, { r: 0.05 }), refr = kit.beam(0x3ddc84, { r: 0.05 });
  var las = kit.laser(0xffd84a);
  var mk = [];
  for (var q = 0; q < 9; q++) mk.push({ p: fieldArrow(kit, 0xffffff), z: fieldArrow(kit, 0x9fd0ff) });
  var lB = label(kit, '', '#ffd38a', 0.36).at([0, 6.2, 0]);
  var lR = label(kit, '', '#ff9a8e', 0.32);
  kit.root = A;
  var rnd = [];
  for (q = 0; q < 12; q++) rnd.push(Math.random() * Math.PI);
  return {
    view: function (s) { return s.mode ? { key: 'b', pos: [0, 5.2, 12.5], target: [0, 2.4, 0] } : { key: 'm', pos: [-1.2, 6, 13.6], target: [0, 2.3, 0] }; },
    update: function (s, t) {
      malus.visible = !s.mode; brew.visible = !!s.mode;
      if (!s.mode) {
        var th = s.th * RAD, c = Math.cos(th), c2 = c * c, osc = function (x) { return Math.sin(t * 5 - x * 1.4); };
        bA.set([[-8.6, Y, 0], [-3, Y, 0]], 1, 1); bB.set([[-3, Y, 0], [2.4, Y, 0]], 1, 0.55); bC.set([[2.4, Y, 0], [8.3, Y, 0]], 1, 0.55 * c2 + 0.001);
        P2.rotation.x = th;
        un.forEach(function (u, j) { var ang = rnd[j] + u.q * Math.PI / 4 + 0.7 * Math.sin(t * 1.3 + j); var L = 1.9 * Math.abs(Math.sin(t * 5 + j * 1.7)); u.a.set([u.x, Y, 0], [0, Math.cos(ang), Math.sin(ang)], L); });
        mid.forEach(function (m) { m.a.set([m.x, Y, 0], [0, 1, 0], 2.2 * osc(m.x)); });
        fin.forEach(function (m) { m.a.set([m.x, Y, 0], [0, Math.cos(th), Math.sin(th)], 2.2 * c * osc(m.x)); });
        spot.material.opacity = c2; scr.material.emissiveIntensity = 0.5 * c2;
        lOut.setText('I = I₀ cos²θ = ' + c2.toFixed(2) + ' I₀', '#7dffb0').at([6.2, Y + 1.9, 0]);
      } else {
        var i = s.i * RAD, r = Math.asin(Math.sin(i) / s.n), iB = Math.atan(s.n), off = Math.abs(s.i - iB / RAD), O = [0, 1.6, 0], R = 5.2;
        var Ap = [-R * Math.sin(i), 1.6 + R * Math.cos(i), 0], Rf = [R * Math.sin(i), 1.6 + R * Math.cos(i), 0], B = [1.6 * Math.tan(r), 0, 0];
        las.aim(Ap, [Math.sin(i), -Math.cos(i), 0]);
        inc.set([Ap, O], 1, 1); ref.set([O, Rf], 1, 1); refr.set([O, B], 1, 1);
        var pol = Math.min(1, off / 22);
        function along(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 0]; }
        var segs = [[Ap, O, 1, 1], [O, Rf, 1, pol], [O, B, 0.45, 1]];
        segs.forEach(function (sg, j) {
          var a = sg[0], b = sg[1], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy), nx = -dy / dl, ny = dx / dl;
          [0.25, 0.5, 0.75].forEach(function (f, q) {
            var m = mk[j * 3 + q], p = along(a, b, f), os = Math.sin(t * 5 - q * 1.6);
            m.p.set(p, [nx, ny, 0], 0.9 * sg[3] * os);
            m.z.set(p, [0, 0, 1], 0.9 * sg[2] * Math.sin(t * 5 - q * 1.6 + 0.9));
          });
        });
        lB.setText('Brewster angle = tan⁻¹ n = ' + (iB / RAD).toFixed(1) + '°', '#ffd38a');
        lR.setText(off < 0.8 ? 'reflected: completely polarised' : 'reflected: partly polarised', '#ff9a8e').at([Rf[0] * 0.8 + 0.6, Rf[1] * 0.8 + 0.7, 0]);
      }
    }
  };
};

export default SCENES;
