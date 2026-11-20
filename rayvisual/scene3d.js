// 3D "real world" scenes for the Ray Optics lesson. Each scene follows the same state (st)
// as the 2D diagram in index.html, so sliders and story steps drive both pictures.
import { THREE } from '../lib/view3d.js';

var RAD = Math.PI / 180;
var BLUE = 0x3d8bff, RED = 0xff4a3d, GREEN = 0x3ddc84, WHITE = 0xfff6e8;
var K = 0.1; // scene units per cm
var LAB = new THREE.Color(0x10151f), NIGHT = new THREE.Color(0x04060c);

function sub(kit, fn) { var r = kit.root, g = new THREE.Group(); r.add(g); kit.root = g; fn(); kit.root = r; return g; }
function marker(kit, color) { var m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), new THREE.MeshBasicMaterial({ color: color || 0xffffff })); return kit.add(m); }
function arc(kit, color) {
  var line = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: color || 0xffffff, transparent: true, opacity: 0.9 }));
  kit.add(line);
  line.setArc = function (c, r, a0, a1, show) { // angles from +x axis, in the xy plane
    line.visible = show !== false && Math.abs(a1 - a0) > 0.02;
    if (!line.visible) return;
    var pts = [];
    for (var i = 0; i <= 24; i++) { var a = a0 + (a1 - a0) * i / 24; pts.push(new THREE.Vector3(c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), 0)); }
    line.geometry.dispose(); line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  };
  return line;
}
function nature(real, m) { var a = Math.abs(m); return (real ? 'real, inverted' : 'virtual, erect') + ', ' + (Math.abs(a - 1) < 0.03 ? 'same size' : a > 1 ? 'magnified' : 'diminished'); }
function mediumName(n) { return Math.abs(n - 1) < 0.02 ? 'Air' : Math.abs(n - 1.33) < 0.02 ? 'Water' : Math.abs(n - 1.5) < 0.02 ? 'Glass' : 'n = ' + n.toFixed(2); }
function mediumMat(kit) { return new THREE.MeshPhysicalMaterial({ color: 0x4fb3ff, roughness: 0.1, transmission: 0.5, thickness: 1, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }); }
function tintMedium(mat, n) {
  var x = Math.max(0, Math.min(1, (n - 1) / 1.2));
  mat.opacity = x < 0.005 ? 0 : 0.12 + x * 0.5;
  mat.color.setHSL(0.56 + x * 0.12, 0.7, 0.62 - x * 0.18);
}
function edges(kit, w, h, d, pos) {
  var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.55 }));
  e.position.set(pos[0], pos[1], pos[2] || 0); return kit.add(e);
}
// place a ghost/real candle at x with magnification m (negative = inverted) standing on the axis
function placeCandle(c, x, ax, m) {
  var s = Math.max(0.05, Math.min(3.5, Math.abs(m)));
  c.position.set(x, ax, 0); c.scale.set(s, m < 0 ? -s : s, s);
}

/* ======================= 1. spherical mirrors ======================= */
function mirror(kit) {
  var AX = 2.3, H = 1.0, sag = 0.3, ap = 2.0;
  kit.lab(26, 8); kit.bench(-11.5, 2.5);
  var dishMat = kit.mat.mirror(), backMat = kit.mat.paint(0x2a2f36, 0.6);
  var dish = new THREE.Group(); dish.position.set(0, AX, 0); kit.add(dish);
  var prof = []; for (var i = 0; i <= 30; i++) { var r = ap * i / 30; prof.push(new THREE.Vector2(r, sag * (r / ap) * (r / ap))); }
  var face = new THREE.Mesh(new THREE.LatheGeometry(prof, 64), dishMat); dish.add(face);
  var back = new THREE.Mesh(new THREE.LatheGeometry(prof.map(function (p) { return new THREE.Vector2(p.x, p.y - 0.06); }), 64), backMat); dish.add(back);
  var rim = new THREE.Mesh(new THREE.TorusGeometry(ap, 0.05, 10, 64), kit.mat.metal(0x8b939c)); rim.rotation.x = Math.PI / 2; rim.position.y = sag; dish.add(rim);
  dish.traverse(function (o) { o.castShadow = true; });
  kit.post(0.35, AX - ap + 0.1);
  var cPost = kit.post(-4, AX), cand = kit.candle(H), ghost = kit.candle(H, true);
  var b1 = kit.beam(BLUE), b2 = kit.beam(RED), d1 = kit.dashed(GREEN), d2 = kit.dashed(GREEN), axis = kit.dashed(0x8a909a, 0.6);
  axis.set([[-11.5, AX], [3, AX]]);
  var mF = marker(kit, 0xffc93c), mC = marker(kit, 0xffffff), lF = kit.label('F', '#ffd38a', 0.36), lC = kit.label('C', '#ffffff', 0.36), lP = kit.label('P', '#ffffff', 0.36);
  var lImg = kit.label('image', '#7dffb0', 0.34), lObj = kit.label('object', '#ffffff', 0.32);
  var P = function (x, y) { return [x * K, AX + y * K, 0]; };
  return {
    view: function () { return { pos: [-2.6, 4.9, 12.6], target: [-2.9, 2.0, 0] }; },
    update: function (s, t) {
      var cc = s.type === 'concave';
      dish.rotation.z = cc ? Math.PI / 2 : -Math.PI / 2;
      dish.position.x = 0;
      var fs = cc ? -s.f : s.f, u = -s.u, h = H / K, inv = 1 / fs - 1 / u, inf = Math.abs(inv) < 2e-4, v = inf ? 1e9 : 1 / inv, m = -v / u;
      cPost.position.x = u * K; placeCandle(cand, u * K, AX, 1); cand.userData.tick(t);
      lObj.at([u * K - 0.3, AX + H + 0.5]);
      mF.position.set(fs * K, AX, 0); mC.position.set(2 * fs * K, AX, 0);
      lF.at([fs * K, AX - 0.35]); lC.at([2 * fs * K, AX - 0.35]); lP.at([0.15, AX - 0.35]);
      mC.visible = lC.visible = Math.abs(2 * fs * K) < 11.5;
      var tip = [u, h], M1 = [0, h], F = [fs, 0];
      var dir1 = F[0] < 0 ? [F[0] - M1[0], F[1] - M1[1]] : [M1[0] - F[0], M1[1] - F[1]];
      var e1 = kit.clipLine(M1, [M1[0] + dir1[0], M1[1] + dir1[1]], -115, 30, -AX / K + 1, 40);
      var e2 = kit.clipLine([0, 0], [u, -h], -115, 30, -AX / K + 1, 40);
      b1.set([P(tip[0], tip[1]), P(0, h), P(e1[0], e1[1])], s.a);
      b2.set([P(tip[0], tip[1]), P(0, 0), P(e2[0], e2[1])], s.b);
      var show = s.im > 0.01 && !inf && Math.abs(v) < 115;
      ghost.visible = show; lImg.visible = show && s.im > 0.5;
      if (show) {
        placeCandle(ghost, v * K, AX, m); ghost.userData.tick(t + 0.4);
        ghost.traverse(function (o) { if (o.material && o.material.opacity != null && o.material !== undefined) o.material.opacity = (o.material.blending === THREE.AdditiveBlending ? 0.8 : 0.55) * Math.min(1, s.im); });
        lImg.setText('image: ' + nature(v < 0, m), '#7dffb0').at([Math.min(v * K, -0.6), m < 0 ? AX + Math.max(-2.1, m * H) - 0.4 : AX - 0.75]);
      }
      d1.set([P(0, h), P(v, m * h)], show && v > 0 && s.im > 0.5);
      d2.set([P(0, 0), P(v, m * h)], show && v > 0 && s.im > 0.5);
    }
  };
}

/* ======================= 2. refraction (water tank + laser) ======================= */
function snellRig(kit, opt) {
  var Y0 = 2.6, W = 9, Hh = 2.6, D = 3.2, R = 2.4;
  var top = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), mediumMat(kit)); top.position.set(0, Y0 + Hh / 2, 0); kit.add(top);
  var bot = new THREE.Mesh(new THREE.BoxGeometry(W, Hh, D), mediumMat(kit)); bot.position.set(0, Y0 - Hh / 2, 0); kit.add(bot);
  edges(kit, W, 2 * Hh, D, [0, Y0, 0]);
  var surf = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshPhysicalMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.25, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false }));
  surf.rotation.x = -Math.PI / 2; surf.position.y = Y0; kit.add(surf);
  var laser = kit.laser(RED), inc = kit.beam(RED, { r: 0.035 }), refl = kit.beam(RED, { r: 0.03, pulses: 2 }), refr = kit.beam(RED, { r: 0.035 });
  var normal = kit.dashed(0xcfd6e0, 0.8); normal.set([[0, Y0 + 2.5], [0, Y0 - 2.5]]);
  var ai = arc(kit, 0xffd38a), ar = arc(kit, 0x7dffb0);
  var lt = kit.label('Air', '#cfe8ff', 0.34), lb = kit.label('Water', '#cfe8ff', 0.34), li = kit.label('i', '#ffd38a', 0.34), lr = kit.label('r', '#7dffb0', 0.34), lnote = kit.label('', '#ffb0a8', 0.32);
  lt.at([-W / 2 + 1, Y0 + Hh - 0.35, D / 2]); lb.at([-W / 2 + 1, Y0 - Hh + 0.35, D / 2]);
  return {
    update: function (s) {
      tintMedium(top.material, s.n1); tintMedium(bot.material, s.n2);
      lt.setText((s.lt || mediumName(s.n1)) + ' · n₁ = ' + s.n1.toFixed(2), '#cfe8ff');
      lb.setText((s.lb || mediumName(s.n2)) + ' · n₂ = ' + s.n2.toFixed(2), '#cfe8ff');
      var i = s.i * RAD, sr = s.n1 * Math.sin(i) / s.n2, tir = sr > 1;
      var O = [0, Y0], A = [-R * Math.sin(i), Y0 + R * Math.cos(i)], Rf = [R * Math.sin(i), Y0 + R * Math.cos(i)];
      laser.aim([A[0] - 0.05 * Math.sin(i), A[1] + 0.05 * Math.cos(i)], [Math.sin(i), -Math.cos(i), 0]);
      inc.set([A, O], s.a);
      ai.setArc(O, 0.7, Math.PI / 2, Math.PI / 2 + i, s.a > 0.99 && s.i > 2);
      li.visible = s.a > 0.99 && s.i > 2; li.at([-0.95 * Math.sin(i / 2), Y0 + 0.95 * Math.cos(i / 2)]);
      if (tir) {
        refl.set([O, Rf], s.b, 1); refr.hide(); ar.setArc(O, 1, 0, 0, false); lr.visible = false;
        lnote.visible = s.b > 0.99; lnote.setText('All light reflected: total internal reflection', '#ffb0a8').at([2.6, Y0 + 2.6]);
      } else {
        var r = Math.asin(sr), B = [R * Math.sin(r), Y0 - R * Math.cos(r)];
        var weak = Math.abs(s.n1 - s.n2) < 1e-3 ? 0 : 0.18 + 0.6 * Math.pow(sr, 6);
        refl.set([O, Rf], s.b, weak); refr.set([O, B], s.b);
        ar.setArc(O, 0.7, -Math.PI / 2, -Math.PI / 2 + r, s.b > 0.99 && r > 0.04);
        lr.visible = s.b > 0.99 && r > 0.04; lr.at([0.95 * Math.sin(r / 2), Y0 - 0.95 * Math.cos(r / 2)]);
        lnote.visible = false;
      }
    }
  };
}
function refr(kit) {
  kit.lab(16, 8);
  var rig = snellRig(kit);
  return {
    view: function () { return { pos: [3.2, 4.6, 10.5], target: [0, 2.6, 0] }; },
    update: function (s) { rig.update(s); }
  };
}

/* ======================= 3. TIR + optical fibre ======================= */
function tir(kit) {
  kit.lab(22, 8);
  var g0, g1, rig, fib = {};
  g0 = sub(kit, function () { rig = snellRig(kit); });
  g1 = sub(kit, function () {
    var pts = [[-9, 1.6], [-6, 1.7], [-3.5, 2.6], [-1, 3.6], [1.5, 3.4], [4, 2.2], [6.5, 1.7], [9, 2.0]].map(function (p) { return new THREE.Vector3(p[0], p[1], 0); });
    var curve = new THREE.CatmullRomCurve3(pts);
    var clad = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.5, 32, false), new THREE.MeshPhysicalMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.22, roughness: 0.15, transmission: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    var core = new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.32, 32, false), new THREE.MeshPhysicalMaterial({ color: 0x9fe0ff, transparent: true, opacity: 0.3, roughness: 0.05, transmission: 0.8, side: THREE.DoubleSide, depthWrite: false }));
    kit.add(clad); kit.add(core);
    [-7, -2, 3, 7.5].forEach(function (x) { var p = curve.getPoint((x + 9) / 18); kit.cyl(0.06, 0.06, p.y - 0.5, kit.mat.metal(), [p.x, (p.y - 0.5) / 2, 0]); });
    var zig = [], N = 600, B = 26;
    for (var i = 0; i <= N; i++) {
      var u = i / N, p = curve.getPointAt(u), tg = curve.getTangentAt(u), nrm = [-tg.y, tg.x], tri = 2 * Math.abs(((u * B) % 2) - 1) - 1;
      zig.push([p.x + nrm[0] * 0.27 * tri, p.y + nrm[1] * 0.27 * tri, 0]);
    }
    var keep = [zig[0]]; for (i = 1; i < N; i++) { var a = zig[i - 1], b = zig[i], c = zig[i + 1]; if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0 && i % 2 === 0) keep.push(b); } keep.push(zig[N]);
    fib.path = keep;
    fib.beam = kit.beam(RED, { r: 0.03, pulses: 6, speed: 5 });
    var p0 = curve.getPointAt(0);
    fib.laser = kit.laser(RED).aim([p0.x - 0.15, p0.y - 0.15], [1, 0.9, 0]);
    var pe = curve.getPointAt(1);
    fib.out = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), kit.mat.glow(0xff5a4a, 0.7)); fib.out.position.copy(pe).add(new THREE.Vector3(0.4, 0, 0)); kit.add(fib.out);
    kit.label('core: higher n', '#9fe0ff', 0.32).at([-1, 4.5]);
    kit.label('cladding: lower n', '#ffe2a8', 0.32).at([4.5, 3.3]);
    fib.note = kit.label('light arrives at the far end', '#ffb0a8', 0.32).at([7.4, 3.0]);
  });
  return {
    view: function (s) { return s.mode ? { key: 'f', pos: [0, 6.4, 16.5], target: [0, 2.3, 0] } : { key: 'b', pos: [3.2, 4.6, 10.5], target: [0, 2.6, 0] }; },
    update: function (s) {
      g0.visible = !s.mode; g1.visible = !!s.mode;
      if (!s.mode) rig.update({ i: s.i, n1: s.n, n2: 1, a: s.a, b: s.a, lt: 'Glass (denser)', lb: 'Air' });
      else { fib.beam.set(fib.path, s.a); fib.out.visible = fib.note.visible = s.a > 0.99; fib.out.scale.setScalar(0.8 + 0.2 * Math.sin(kit.t * 6)); }
    }
  };
}

/* ======================= 4. lenses ======================= */
function lens(kit) {
  kit.lab(26, 8);
  var AX = 2.4, H = 1.0, gm, gi, A = {}, B = {};
  // part A: lens maker (parallel beam, lens in a liquid tank)
  gm = sub(kit, function () {
    A.tank = new THREE.Mesh(new THREE.BoxGeometry(18, 4.8, 3.4), mediumMat(kit)); A.tank.position.set(-0.5, 2.4, 0); kit.add(A.tank);
    A.edge = edges(kit, 18, 4.8, 3.4, [-0.5, 2.4, 0]);
    A.lens = new THREE.Mesh(kit.lensGeo(1.6, 2, 2, 0.04), kit.mat.glass()); A.lens.position.set(-2.5, AX, 0); kit.add(A.lens);
    kit.post(-2.5, AX - 1.55);
    A.beams = [-1.2, -0.6, 0.6, 1.2].map(function () { return kit.beam(BLUE, { r: 0.028 }); });
    A.dash = [0, 1, 2, 3].map(function () { return kit.dashed(BLUE, 0.7); });
    A.mF = marker(kit, 0xffc93c); A.lF = kit.label('F', '#ffd38a', 0.36);
    A.liq = kit.label('', '#cfe8ff', 0.34).at([-7.5, 4.4, 1.7]);
    A.key = '';
  });
  // part B: image formation on an optical bench
  gi = sub(kit, function () {
    kit.bench(-11, 10);
    B.lensV = new THREE.Mesh(kit.lensGeo(1.9, 2.6, 2.6, 0.03), kit.mat.glass()); B.lensV.position.set(0, AX, 0); kit.add(B.lensV);
    B.lensC = new THREE.Mesh(kit.lensGeo(1.9, 2.6, 2.6, 0.04, true), kit.mat.glass()); B.lensC.position.set(0, AX, 0); kit.add(B.lensC);
    kit.post(0, AX - 1.85);
    B.cPost = kit.post(-4, AX); B.cand = kit.candle(H); B.ghost = kit.candle(H, true);
    B.screen = sub(kit, function () {
      kit.box(0.06, 3.2, 2.6, kit.mat.paint(0xf4f4f0, 0.9), [0, AX, 0]);
      kit.cyl(0.07, 0.07, AX - 1.6, kit.mat.metal(), [0, (AX - 1.6) / 2 + 0.3, 0]);
      kit.box(0.6, 0.25, 1, kit.mat.metal(0x50585f), [0, 0.34, 0]);
    });
    B.b1 = kit.beam(BLUE); B.b2 = kit.beam(RED); B.d1 = kit.dashed(GREEN); B.d2 = kit.dashed(GREEN);
    kit.dashed(0x8a909a, 0.6).set([[-11, AX], [10, AX]]);
    B.marks = ['F', 'F', '2F', '2F'].map(function (t) { return { m: marker(kit, 0xffc93c), l: kit.label(t, '#ffd38a', 0.32) }; });
    B.lImg = kit.label('image', '#7dffb0', 0.34);
  });
  var P = function (x, y) { return [x * K, AX + y * K, 0]; };
  return {
    view: function (s) { return s.mode ? { key: 'i', pos: [-0.5, 4.8, 12.5], target: [-0.5, 2.0, 0] } : { key: 'm', pos: [0.5, 5.2, 15.5], target: [-0.5, 2.3, 0] }; },
    update: function (s, t) {
      gm.visible = !s.mode; gi.visible = !!s.mode;
      if (!s.mode) {
        tintMedium(A.tank.material, s.nm); A.edge.visible = s.nm > 1.01;
        A.liq.visible = s.nm > 1.01; A.liq.setText('liquid around the lens: n = ' + s.nm.toFixed(2), '#cfe8ff');
        var key = s.R1.toFixed(1) + ',' + s.R2.toFixed(1);
        if (key !== A.key) { A.key = key; A.lens.geometry.dispose(); A.lens.geometry = kit.lensGeo(1.6, 1.7 + (s.R1 - 10) * 0.09, 1.7 + (s.R2 - 10) * 0.09, 0.04); }
        var k = (s.n / s.nm - 1) * (1 / s.R1 + 1 / s.R2), flat = Math.abs(k) < 2e-4, f = flat ? 1e9 : 1 / k, X = -2.5;
        [-1.2, -0.6, 0.6, 1.2].forEach(function (d, j) {
          var hit = [X, AX + d], F = [X + f * K, AX], end = flat ? [9, AX + d] : kit.clipLine(hit, f > 0 ? F : [2 * hit[0] - F[0], 2 * hit[1] - F[1]], -10, 8.4, 0.05, 4.75);
          A.beams[j].set([[-9.4, AX + d], hit, end], s.a);
          A.dash[j].set([hit, F], !flat && f < 0 && s.a > 0.99 && F[0] > -9.4);
        });
        var Fx = X + f * K; A.mF.visible = A.lF.visible = !flat && Fx > -9.4 && Fx < 8.4 && s.a > 0.99;
        A.mF.position.set(Fx, AX, 0); A.lF.at([Fx, AX - 0.4]);
        return;
      }
      var cv = s.type === 'convex', fs = cv ? s.f : -s.f, u = -s.u, h = H / K, inv = 1 / fs + 1 / u, inf = Math.abs(inv) < 2e-4, v = inf ? 1e9 : 1 / inv, m = v / u;
      B.lensV.visible = cv; B.lensC.visible = !cv;
      B.cPost.position.x = u * K; placeCandle(B.cand, u * K, AX, 1); B.cand.userData.tick(t);
      [s.f, -s.f, 2 * s.f, -2 * s.f].forEach(function (x, j) { var mk = B.marks[j], ok = Math.abs(x * K) < 10.5; mk.m.visible = mk.l.visible = ok; mk.m.position.set(x * K, AX, 0); mk.l.at([x * K, AX - 0.38]); });
      var tip = [u, h], M1 = [0, h], F2 = [fs, 0];
      var dir1 = fs > 0 ? [F2[0] - M1[0], F2[1] - M1[1]] : [M1[0] - F2[0], M1[1] - F2[1]];
      var e1 = kit.clipLine(M1, [M1[0] + dir1[0], M1[1] + dir1[1]], -110, 100, -AX / K + 1, 40);
      var e2 = kit.clipLine([0, 0], [-u, -h], -110, 100, -AX / K + 1, 40);
      B.b1.set([P(tip[0], tip[1]), P(0, h), P(e1[0], e1[1])], s.a);
      B.b2.set([P(tip[0], tip[1]), P(0, 0), P(e2[0], e2[1])], s.b);
      var show = s.im > 0.01 && !inf && Math.abs(v) < 100, real = v > 0;
      B.ghost.visible = show; B.lImg.visible = show && s.im > 0.5;
      B.screen.visible = show && real && s.im > 0.5; B.screen.position.x = v * K + 0.05;
      if (show) {
        placeCandle(B.ghost, v * K, AX, m); B.ghost.userData.tick(t + 0.4);
        B.lImg.setText((real ? 'image on the screen: ' : 'image: ') + nature(real, m), '#7dffb0').at([v * K, m < 0 ? AX + Math.max(-2.1, m * H) - 0.4 : AX + m * H + 0.55]);
      }
      B.d1.set([P(0, h), P(v, m * h)], show && !real && s.im > 0.5);
      B.d2.set([P(tip[0], tip[1]), P(v, m * h)], show && !real && s.im > 0.5);
    }
  };
}

/* ======================= 5. prism with dispersion ======================= */
var SPEC = [0xff2a2a, 0xff8a1f, 0xffe12a, 0x3ddc54, 0x2aa8ff, 0x3a4dff, 0x9a3cff];
function prismPath(A, n, ideg) {
  var i = ideg * RAD, r1 = Math.asin(Math.sin(i) / n), r2 = A - r1, x = n * Math.sin(r2);
  if (Math.abs(x) > 1) return { r1: r1, r2: r2, tir: true };
  var e = Math.asin(x);
  return { r1: r1, r2: r2, e: e, d: i + e - A, tir: false };
}
function rot(v, t) { return [v[0] * Math.cos(t) - v[1] * Math.sin(t), v[0] * Math.sin(t) + v[1] * Math.cos(t)]; }
function prism(kit) {
  kit.lab(18, 8);
  var Sx = function (p) { return [(p[0] - 240) / 55, (300 - p[1]) / 55 + 0.05, 0]; };
  var body = new THREE.Mesh(new THREE.BufferGeometry(), kit.mat.glass(0xe8f6ff, 0.5)); kit.add(body);
  var edge = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.7 })); kit.add(edge);
  var white = kit.beam(WHITE, { r: 0.035 }), cols = SPEC.map(function (c) { return kit.beam(c, { r: 0.022, pulses: 1 }); });
  var lamp = kit.laser(0xffffff), n1 = kit.dashed(0xcfd6e0, 0.7), n2 = kit.dashed(0xcfd6e0, 0.7), ext = kit.dashed(0xffd38a, 0.8);
  var lA = kit.label('A', '#ffffff', 0.36), lD = kit.label('', '#ffd38a', 0.36), lN = kit.label('', '#ffb0a8', 0.32);
  var curA = -1;
  return {
    view: function () { return { pos: [1.2, 4.2, 9.5], target: [0.6, 2.4, 0] }; },
    update: function (s) {
      var A = s.A * RAD, hA = A / 2, Ap = [240, 36], Ls = 250;
      var Bl = [Ap[0] - Ls * Math.sin(hA), Ap[1] + Ls * Math.cos(hA)], Br = [Ap[0] + Ls * Math.sin(hA), Ap[1] + Ls * Math.cos(hA)];
      if (s.A !== curA) {
        curA = s.A;
        var sh = new THREE.Shape(); var a = Sx(Ap), b = Sx(Bl), c = Sx(Br);
        sh.moveTo(a[0], a[1]); sh.lineTo(b[0], b[1]); sh.lineTo(c[0], c[1]); sh.closePath();
        var geo = new THREE.ExtrudeGeometry(sh, { depth: 2.2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }); geo.translate(0, 0, -1.1);
        body.geometry.dispose(); body.geometry = geo;
        edge.geometry.dispose(); edge.geometry = new THREE.EdgesGeometry(geo, 30);
        lA.at([a[0], a[1] + 0.35]);
      }
      function trace(n) {
        var p = prismPath(A, n, s.i), M1 = [Ap[0] - 0.62 * Ls * Math.sin(hA), Ap[1] + 0.62 * Ls * Math.cos(hA)], Nin = [Math.cos(hA), Math.sin(hA)], din = rot(Nin, -s.i * RAD), d1 = rot(Nin, -p.r1);
        var S0 = [M1[0] - 230 * din[0], M1[1] - 230 * din[1]], t2 = [Math.sin(hA), Math.cos(hA)], den = d1[0] * t2[1] - d1[1] * t2[0];
        var wx = Ap[0] - M1[0], wy = Ap[1] - M1[1], tt = (wx * t2[1] - wy * t2[0]) / den, q = (wx * d1[1] - wy * d1[0]) / den;
        var o = { p: p, M1: M1, S0: S0, din: din, Nin: Nin };
        if (!(tt > 0) || q < 4 || q > Ls - 4) { o.miss = true; o.end = [M1[0] + 110 * d1[0], M1[1] + 110 * d1[1]]; return o; }
        var M2 = [M1[0] + tt * d1[0], M1[1] + tt * d1[1]], nR = [Math.cos(hA), -Math.sin(hA)]; o.M2 = M2; o.nR = nR;
        if (p.tir) { var dr = rot([-nR[0], -nR[1]], p.r2); o.end = [M2[0] + 120 * dr[0], M2[1] + 120 * dr[1]]; return o; }
        var dout = rot(nR, p.e); o.dout = dout; o.end = [M2[0] + 230 * dout[0], M2[1] + 230 * dout[1]]; return o;
      }
      var mid = trace(s.n), full = s.a >= 0.99;
      lamp.aim(Sx([mid.S0[0] - 4 * mid.din[0], mid.S0[1] - 4 * mid.din[1]]), [mid.din[0], -mid.din[1], 0]);
      n1.set([Sx([mid.M1[0] - 60 * mid.Nin[0], mid.M1[1] - 60 * mid.Nin[1]]), Sx([mid.M1[0] + 40 * mid.Nin[0], mid.M1[1] + 40 * mid.Nin[1]])], full);
      if (mid.miss || mid.p.tir) {
        white.set([Sx(mid.S0), Sx(mid.M1)].concat(mid.M2 ? [Sx(mid.M2)] : []).concat([Sx(mid.end)]), s.a);
        cols.forEach(function (c) { c.hide(); });
        n2.set([[0, 0], [0, 0]], false); ext.set([[0, 0], [0, 0]], false); lD.visible = false;
        lN.visible = full; lN.setText(mid.miss ? 'The ray misses the second face. Increase i' : 'Total internal reflection at the second face', '#ffb0a8').at([2.2, 5.3]);
        return;
      }
      lN.visible = false;
      // white light goes in; inside and after the prism it fans into colours (red bends least)
      var fin = Math.min(1, s.a * 3);
      white.set([Sx(mid.S0), Sx(mid.M1)], fin);
      var rest = Math.max(0, (s.a - 1 / 3) * 1.5);
      SPEC.forEach(function (c, j) {
        var tr = trace(s.n - 0.045 + j * 0.015);
        if (tr.miss || tr.p.tir) { cols[j].hide(); return; }
        cols[j].set([Sx(tr.M1), Sx(tr.M2), Sx(tr.end)], rest);
      });
      n2.set([Sx([mid.M2[0] - 40 * mid.nR[0], mid.M2[1] - 40 * mid.nR[1]]), Sx([mid.M2[0] + 60 * mid.nR[0], mid.M2[1] + 60 * mid.nR[1]])], full);
      ext.set([Sx(mid.M1), Sx([mid.M1[0] + 200 * mid.din[0], mid.M1[1] + 200 * mid.din[1]])], full);
      lD.visible = full; lD.setText('δ = ' + (mid.p.d / RAD).toFixed(1) + '°', '#ffd38a').at(Sx([mid.M2[0] + 150 * mid.dout[0], mid.M2[1] + 150 * mid.dout[1] - 26]));
    }
  };
}

/* ======================= 6. microscope + telescope ======================= */
function inst(kit) {
  var gM, gT, M = {}, T = {};
  gM = sub(kit, function () {
    kit.lab(16, 8);
    // map 2D diagram coordinates: axis (2D x) -> up, lateral (2D y) -> sideways, exaggerated
    var Sy = function (p) { return [(p[1] - 120) * 0.03, (p[0] - 100) / 82 + 0.9, 0]; };
    M.S = Sy;
    var dark = kit.mat.paint(0x23272e, 0.4), cream = kit.mat.paint(0xe8e2d4, 0.45);
    kit.box(3.2, 0.3, 2.4, dark, [0.4, 0.15, 0]);
    kit.box(0.6, 6.2, 0.6, cream, [0, 3.2, -1.5]);
    kit.box(2.6, 0.12, 2, dark, [0.4, Sy([118, 120])[1] - 0.12, 0]);
    kit.box(1.6, 0.03, 0.6, kit.mat.glass(0xffffff, 0.6), [0, Sy([118, 120])[1] - 0.045, 0]);
    var yo = Sy([170, 120])[1], ye = Sy([170 + 1 / (1 / 40 - 1 / 52) + 45, 120])[1];
    var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, ye - yo + 0.6, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x9fb3c8, transparent: true, opacity: 0.16, roughness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    tube.position.set(0, (ye + yo) / 2, 0); kit.add(tube);
    kit.cyl(0.66, 0.66, 0.25, kit.mat.metal(0x30353c), [0, yo + 0.25, 0]);
    kit.cyl(0.95, 0.95, 0.2, kit.mat.metal(0x30353c), [0, ye + 0.42, 0]);
    kit.box(0.4, 0.4, 0.9, cream, [0, (ye + yo) / 2, -0.95]);
    var lo = new THREE.Mesh(kit.lensGeo(0.42, 0.6, 0.6, 0.02), kit.mat.glass()); lo.rotation.z = Math.PI / 2; lo.position.set(0, yo, 0); kit.add(lo);
    var le = new THREE.Mesh(kit.lensGeo(0.9, 1.6, 1.6, 0.02), kit.mat.glass()); le.rotation.z = Math.PI / 2; le.position.set(0, ye, 0); kit.add(le);
    var eye = kit.sphere(0.32, kit.mat.paint(0xffffff, 0.3), [0, ye + 1.5, 0]);
    var iris = kit.sphere(0.14, kit.mat.paint(0x3b2a1a, 0.3), [0, ye + 1.24, 0]); iris.scale.y = 0.4;
    M.obj = kit.cyl(0.04, 0.07, 1, kit.mat.paint(0x3ddc84, 0.4), [0, 0, 0]);
    M.i1 = kit.cyl(0.03, 0.03, 1, kit.mat.ghost(), [0, 0, 0]);
    M.i2 = kit.cyl(0.04, 0.04, 1, kit.mat.ghost(), [0, 0, 0]);
    M.b = [kit.beam(BLUE), kit.beam(RED), kit.beam(BLUE), kit.beam(RED)];
    M.d = [kit.dashed(GREEN), kit.dashed(GREEN)];
    kit.label('objective', '#cfe8ff', 0.3).at([-1.3, yo]);
    kit.label('eyepiece', '#cfe8ff', 0.3).at([-1.6, ye]);
    kit.label('eye', '#ffffff', 0.3).at([0.8, ye + 1.5]);
    M.l1 = kit.label('A′B′ (real)', '#7dffb0', 0.28); M.l2 = kit.label('A″B″ final (virtual)', '#7dffb0', 0.3); M.l0 = kit.label('specimen AB', '#ffffff', 0.28);
  });
  gT = sub(kit, function () {
    var ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48), kit.mat.paint(0x1d2a1f, 0.95)); ground.rotation.x = -Math.PI / 2; kit.add(ground);
    kit.stars(900, 80);
    T.saturn = new THREE.Group();
    var planet = new THREE.Mesh(new THREE.SphereGeometry(1.4, 40, 30), new THREE.MeshStandardMaterial({ color: 0xe0c58a, roughness: 0.8, emissive: 0x3a2a10, emissiveIntensity: 0.6 }));
    var ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 3.1, 64), new THREE.MeshStandardMaterial({ color: 0xcdb98c, side: THREE.DoubleSide, transparent: true, opacity: 0.85, emissive: 0x2a2010, emissiveIntensity: 0.6 }));
    ring.rotation.x = Math.PI / 2.4; T.saturn.add(planet); T.saturn.add(ring); kit.add(T.saturn);
    T.tube = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: 0xdfe6ee, transparent: true, opacity: 0.18, roughness: 0.3, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    T.tube.rotation.z = Math.PI / 2; kit.add(T.tube);
    T.ro = kit.cyl(1.62, 1.62, 0.2, kit.mat.metal(0xf0f0f0)); T.ro.rotation.z = Math.PI / 2;
    T.re = kit.cyl(1.05, 1.05, 0.25, kit.mat.metal(0x30353c)); T.re.rotation.z = Math.PI / 2;
    T.lo = new THREE.Mesh(kit.lensGeo(1.55, 4.5, 4.5, 0.03), kit.mat.glass()); kit.add(T.lo);
    T.le = new THREE.Mesh(kit.lensGeo(1.0, 1.6, 1.6, 0.03), kit.mat.glass()); kit.add(T.le);
    T.legs = [0, 1, 2].map(function (k) { var l = kit.cyl(0.06, 0.06, 1, kit.mat.metal(0x2a2e33)); l.userData.k = k; return l; });
    T.b = [kit.beam(0xffe6a8), kit.beam(0xffd38a), kit.beam(0xffe6a8)];
    T.img = kit.sphere(0.12, kit.mat.glow(0x7dffb0, 0.9));
    T.eye = kit.sphere(0.3, kit.mat.paint(0xffffff, 0.3));
    T.l1 = kit.label('objective (long f₀)', '#cfe8ff', 0.32); T.l2 = kit.label('eyepiece (short fₑ)', '#cfe8ff', 0.32); T.l3 = kit.label('image at the common focus', '#7dffb0', 0.3);
  });
  var tmpY = new THREE.Vector3();
  return {
    view: function (s) { return s.mode ? { key: 'm', pos: [6, 5, 9.5], target: [0, 3.6, 0] } : { key: 't', pos: [-1, 5.5, 17], target: [0.5, 3.2, 0] }; },
    update: function (s) {
      gM.visible = !!s.mode; gT.visible = !s.mode;
      kit.scene.background = s.mode ? LAB : NIGHT;
      if (s.mode) {
        var S = M.S, ax = 120, xo = 170, fo = 40, uo = 52, hh = 14, fe = 70, ue = 45;
        var vo = 1 / (1 / fo - 1 / uo), h1 = hh * vo / uo, xi = xo + vo, xe = xi + ue, ve = 1 / (1 / fe - 1 / ue), xf = xe + ve, h2 = h1 * (-ve) / ue;
        var tip = [xo - uo, ax - hh], I1 = [xi, ax + h1], I2 = [xf, ax + h2], a1 = [xo, ax - hh], b1 = [xo, ax];
        var atX = function (a, b, X) { return [X, a[1] + (b[1] - a[1]) * (X - a[0]) / (b[0] - a[0])]; };
        var a2 = atX(a1, I1, xe), b2 = atX(tip, b1, xe), endY = xe + 120;
        var rod = function (mesh, base, top) { var A0 = S(base), A1 = S(top); mesh.position.set((A0[0] + A1[0]) / 2, A0[1], 0); mesh.scale.set(1, 1, 1); mesh.rotation.z = Math.PI / 2; mesh.scale.y = Math.max(0.02, Math.abs(A1[0] - A0[0])); mesh.position.x = (A0[0] + A1[0]) / 2; };
        rod(M.obj, [tip[0], ax], tip); rod(M.i1, [I1[0], ax], I1); rod(M.i2, [I2[0], ax], I2);
        M.i1.visible = M.l1.visible = s.a > 0.99; M.i2.visible = M.l2.visible = s.b > 0.99;
        M.l0.at([S(tip)[0] - 1.2, S(tip)[1] + 0.1]); M.l1.at([S(I1)[0] + 1.1, S(I1)[1]]); M.l2.at([S(I2)[0] - 1.6, S(I2)[1]]);
        M.b[0].set([S(tip), S(a1), S(I1)], s.a); M.b[1].set([S(tip), S(b1), S(I1)], s.a);
        M.b[2].set([S(I1), S(a2), S(atX(I2, a2, endY))], s.b); M.b[3].set([S(I1), S(b2), S(atX(I2, b2, endY))], s.b);
        M.d[0].set([S(a2), S(I2)], s.b > 0.99); M.d[1].set([S(b2), S(I2)], s.b > 0.99);
        return;
      }
      var X = function (px) { return (px - 44) / 40 - 6; }, AY = 3.4, Y = function (py) { return AY + (130 - py) / 40; };
      var x0 = 44, sc = 3.2, k = 0.05, xi2 = x0 + s.fo * sc, xe2 = xi2 + s.fe * sc, I = [xi2, 130 + s.fo * sc * k], kout = (130 - I[1]) / (s.fe * sc);
      var X0 = X(x0), XE = X(xe2), len = XE - X0;
      T.tube.position.set((X0 + XE) / 2, AY, 0); T.tube.scale.set(1.45, len, 1.45);
      T.ro.position.set(X0, AY, 0); T.re.position.set(XE + 0.1, AY, 0);
      T.lo.position.set(X0, AY, 0); T.le.position.set(XE, AY, 0);
      var mx = (X0 + XE) / 2;
      T.legs.forEach(function (l) { var a = l.userData.k * 2.1 + 0.5, foot = [mx + 1.8 * Math.cos(a), 0, 1.8 * Math.sin(a)]; tmpY.set(mx - foot[0], AY - 1.2, -foot[2]); l.position.set((mx + foot[0]) / 2, (AY - 1.2) / 2, foot[2] / 2); l.scale.y = tmpY.length(); l.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmpY.normalize()); });
      var dir = [1, -k * 40 / 40]; // incoming slope in scene units (2D slope k, y flipped)
      T.saturn.position.set(X0 - 14, AY + 14 * k + 0.0, -2); T.saturn.rotation.y = kit.t * 0.1;
      [-40, 0, 40].forEach(function (d, n) {
        var hit = [x0, 130 + d], he = atX2(hit, I, xe2), out = [xe2 + 220, he[1] + kout * 220];
        T.b[n].set([[X(-300), Y(130 + d - (x0 + 300) * k)], [X(hit[0]), Y(hit[1])], [X(he[0]), Y(he[1])], [X(out[0]), Y(out[1])]], s.a);
      });
      T.img.position.set(X(I[0]), Y(I[1]), 0); T.img.visible = T.l3.visible = s.a > 0.6;
      T.eye.position.set(X(xe2) + 1.6, AY + 0.1, 0);
      T.l1.at([X0, AY + 2.1]); T.l2.at([XE, AY + 1.6]); T.l3.at([X(I[0]), Y(I[1]) - 0.55]);
      function atX2(a, b, Xp) { return [Xp, a[1] + (b[1] - a[1]) * (Xp - a[0]) / (b[0] - a[0])]; }
    }
  };
}

export default { mirror: mirror, refr: refr, tir: tir, lens: lens, prism: prism, inst: inst };
