// HEPGO tanıtım: sektöre özel düşük-poligon 3D sahneler (Three.js, yerel kopya).
// 4 sahne tamamen koddan üretilir — Fabrika (dişli/konveyör/baca), Bakkal (raf/ürün/sepet),
// Berber (koltuk/ayna/dönen direk/makas), Lokanta (masa/tabak/sandalye/servis kapağı).
// Sahneler yavaşça döner, imleci hafifçe izler; sektör değişince eski sahne küçülüp kaybolur, yeni açılır.
// Görünmezken (sekme arkada / ekran dışı) çizim durur. WebGL yoksa çağıran CSS'e düşer.
const LIB = '/static/vendor/three/';
let _T = null;
const loadThree = () => (_T ??= Promise.all([import(LIB + 'three.module.min.js'), import(LIB + 'RoomEnvironment.js')])
  .then(([T, R]) => ({ T, RoomEnvironment: R.RoomEnvironment }))
  .catch(e => { _T = null; throw e; }));

export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export const SECTOR_KEYS = ['factory', 'grocery', 'barber', 'restaurant'];

export async function mountScene(canvas) {
  const { T, RoomEnvironment } = await loadThree();

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;   // sinematik ton eşleme
  renderer.toneMappingExposure = 1.08;
  if ('outputColorSpace' in renderer) renderer.outputColorSpace = T.SRGBColorSpace;
  const scene = new T.Scene();
  scene.fog = new T.Fog(0x0b1322, 12, 21);          // uzakta yumuşak kararma (derinlik)
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.4, 9);
  camera.lookAt(0, 0.4, 0);

  // ---- PBR ortam yansıması (metal/krom parlamaları gerçekçi olur) ----
  const pmrem = new T.PMREMGenerator(renderer);
  try { scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; if ('environmentIntensity' in scene) scene.environmentIntensity = 0.75; } catch { /* ortam yoksa düz ışıkla devam */ }

  // ---- ışıklar ----
  scene.add(new T.HemisphereLight(0xcfe0ff, 0x0a1120, 0.85));
  const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(4, 7, 6); scene.add(key);
  const rim = new T.DirectionalLight(0x7c5cf5, 1.0); rim.position.set(-6, 3, -4); scene.add(rim);
  const accent = new T.PointLight(0x2f6fed, 0, 16, 2); accent.position.set(0, 1.2, 3); scene.add(accent);
  const ACCENT = { factory: 0xf59e0b, grocery: 0x16a34a, barber: 0xef4444, restaurant: 0xf59e0b };

  // ---- yardımcılar ----
  const mat = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.2, flatShading: true, envMapIntensity: 0.7, ...o });
  const metal = (color, o = {}) => new T.MeshStandardMaterial({ color, roughness: 0.22, metalness: 1.0, flatShading: true, envMapIntensity: 1.35, ...o });
  const glow = (color, k = 1.3) => new T.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.4, flatShading: true });
  const M = (geo, m) => new T.Mesh(geo, m);
  const box = (w, h, d, m) => M(new T.BoxGeometry(w, h, d), m);
  const cyl = (rt, rb, h, m, s = 24) => M(new T.CylinderGeometry(rt, rb, h, s), m);
  const cone = (r, h, m, s = 20) => M(new T.ConeGeometry(r, h, s), m);
  const sph = (r, m, s = 18) => M(new T.SphereGeometry(r, s, Math.round(s * 0.7)), m);
  const tor = (r, t, m, s = 10, ts = 24) => M(new T.TorusGeometry(r, t, s, ts), m);
  const at = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); return o; };
  const rot = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
  const grp = (...k) => { const g = new T.Group(); k.filter(Boolean).forEach(x => g.add(x)); return g; };
  const COL = { steel: 0x9fb3c8, dark: 0x3b4758, blue: 0x2f6fed, blue2: 0x4f8ff7, violet: 0x7c5cf5, lime: 0xa3e635,
    amber: 0xf59e0b, red: 0xef4444, white: 0xf8fafc, wood: 0xb4794b, green: 0x16a34a, pink: 0xf472b6, cream: 0xf5e9d8 };

  // dönen platform (her sahnenin altında)
  const disc = () => at(cyl(2.7, 2.9, 0.25, mat(0x141c2b, { roughness: 0.9, metalness: 0 }), 48), 0, -1.35, 0);

  // ---------- SAHNELER ----------
  const spinners = [];   // {mesh, speed} her karede döner
  function gear(r, teeth, color, tube = 0.12) {
    const g = grp();
    g.add(tor(r, tube, metal(color), 8, teeth * 2));
    for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; g.add(at(box(0.16, 0.16, 0.26, metal(color)), Math.cos(a) * r, Math.sin(a) * r, 0)); }
    g.add(cyl(r * 0.35, r * 0.35, 0.34, metal(0x6b7a8d), 20));
    rot(g, Math.PI / 2, 0, 0);
    return g;
  }

  function factory() {
    const g = grp(disc());
    // konveyör
    const belt = at(box(3.6, 0.18, 0.9, mat(COL.dark)), 0, -0.7, 0.2); g.add(belt);
    for (let i = 0; i < 4; i++) { const bx = at(box(0.5, 0.5, 0.5, mat([COL.blue, COL.amber, COL.lime, COL.blue2][i])), -1.4 + i * 0.95, -0.35, 0.2); g.add(bx); }
    // dişliler (dönen)
    const g1 = at(gear(0.9, 12, COL.steel), -1.3, 0.9, -0.6); g.add(g1); spinners.push({ o: g1, s: 0.5 });
    const g2 = at(gear(0.6, 9, COL.blue2), -0.25, 1.35, -0.6); g.add(g2); spinners.push({ o: g2, s: -0.75 });
    // baca + duman
    const stack = at(cyl(0.3, 0.38, 1.8, mat(COL.steel), 16), 1.6, 0.4, -0.4); g.add(stack);
    for (let i = 0; i < 3; i++) g.add(at(sph(0.22 + i * 0.07, mat(0xd7dee8, { roughness: 1, metalness: 0, transparent: true, opacity: 0.5 })), 1.6, 1.5 + i * 0.5, -0.4));
    // bina gövdesi
    g.add(at(box(1.1, 1.0, 1.0, mat(COL.dark)), 1.6, -0.35, -0.4));
    return g;
  }

  function grocery() {
    const g = grp(disc());
    // raf iskeleti
    const shelf = grp();
    [-0.75, 0, 0.75].forEach(y => shelf.add(at(box(3.2, 0.1, 1.0, mat(COL.wood)), 0, y, 0)));
    [-1.5, 1.5].forEach(x => shelf.add(at(box(0.1, 1.8, 1.0, mat(0x8a5a35)), x, 0, 0)));
    g.add(at(shelf, 0, 0.1, -0.3));
    // ürünler (renkli kutular/konserve)
    const prodC = [COL.red, COL.amber, COL.lime, COL.blue2, COL.pink, COL.green, COL.violet];
    let n = 0;
    [-0.68, 0.07, 0.82].forEach(y => { for (let i = 0; i < 5; i++) { const x = -1.2 + i * 0.6; const cnd = i % 2; const m = mat(prodC[n++ % prodC.length]); g.add(at(cnd ? cyl(0.16, 0.16, 0.42, m, 14) : box(0.32, 0.42, 0.3, m), x, y + 0.31, -0.3)); } });
    // alışveriş sepeti (önde, tel) + barkod okuyucu
    const cart = at(box(0.9, 0.55, 0.6, new T.MeshStandardMaterial({ color: COL.blue, wireframe: true })), -1.1, -0.7, 1.1); g.add(cart);
    g.add(at(box(0.5, 0.25, 0.3, mat(COL.dark)), 1.1, -0.72, 1.1));   // yazarkasa
    g.add(at(box(0.44, 0.02, 0.24, glow(COL.lime, 0.8)), 1.1, -0.58, 1.1));
    return g;
  }

  function barber() {
    const g = grp(disc());
    // koltuk
    const seat = grp();
    seat.add(at(cyl(0.45, 0.55, 0.3, metal(0x5a6775), 24), 0, -1.0, 0));   // ayak
    seat.add(at(box(1.0, 0.25, 1.0, mat(COL.dark)), 0, -0.55, 0));          // oturak
    seat.add(at(box(1.0, 1.1, 0.22, mat(0x2b3542)), 0, 0.05, -0.45));       // sırt
    seat.add(at(box(1.15, 0.18, 0.18, mat(COL.steel)), 0, -0.4, 0.5));       // kol dayama ön
    g.add(at(seat, -0.9, 0.2, 0.2));
    // ayna (çerçeveli)
    g.add(at(box(1.0, 1.6, 0.08, metal(0xc9d3df)), 1.3, 0.35, -0.6));
    g.add(at(box(1.15, 1.75, 0.05, mat(0x1b2330)), 1.3, 0.3, -0.66));
    // dönen berber direği (kırmızı/beyaz/mavi bantlar)
    const pole = grp();
    const bands = [COL.red, COL.white, COL.blue, COL.white, COL.red, COL.white];
    bands.forEach((c, i) => pole.add(at(cyl(0.16, 0.16, 0.2, glow(c, 0.25), 18), 0, 0.6 - i * 0.2, 0)));
    pole.add(at(sph(0.18, metal(0xd7dee8)), 0, 0.85, 0)); pole.add(at(sph(0.18, metal(0xd7dee8)), 0, -0.65, 0));
    at(pole, 2.0, 0.1, 0.4); g.add(pole); spinners.push({ o: pole, s: 1.1, axis: 'y' });
    // makas (çapraz, önde)
    const sc = grp(rot(at(box(0.7, 0.07, 0.07, metal(0xe2e8f0)), 0, 0, 0), 0, 0, 0.5), rot(at(box(0.7, 0.07, 0.07, metal(0xe2e8f0)), 0, 0, 0), 0, 0, -0.5));
    sc.add(at(tor(0.12, 0.03, metal(0xcbd5e1), 8, 18), -0.3, -0.16, 0)); sc.add(at(tor(0.12, 0.03, metal(0xcbd5e1), 8, 18), -0.3, 0.16, 0));
    at(sc, -0.9, 1.05, 0.7); g.add(sc); spinners.push({ o: sc, s: 0.4, axis: 'z' });
    return g;
  }

  function restaurant() {
    const g = grp(disc());
    // yuvarlak masa
    g.add(at(cyl(1.3, 1.3, 0.12, mat(COL.cream), 36), 0, -0.3, 0));
    g.add(at(cyl(0.18, 0.25, 1.0, metal(0x6b7a8d), 20), 0, -0.85, 0));
    // tabaklar + bardaklar + servis kapağı
    const spots = [[-0.7, 0.4], [0.7, 0.4], [-0.7, -0.5], [0.7, -0.5]];
    spots.forEach(([x, z]) => {
      g.add(at(cyl(0.3, 0.32, 0.05, mat(COL.white), 24), x, -0.2, z));
      g.add(at(cyl(0.1, 0.08, 0.22, glow(COL.blue2, 0.3), 16), x + 0.45, -0.12, z));
    });
    // servis kapağı (yarım küre) ortada, kalkar-iner
    const clMesh = new T.Mesh(new T.SphereGeometry(0.42, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), metal(0xe2e8f0));
    const cl = grp(clMesh, at(sph(0.07, glow(COL.amber, 0.6)), 0, 0.44, 0)); at(cl, 0, -0.15, 0); g.add(cl);
    spinners.push({ o: cl, s: 0, bob: true });
    // sandalye sırtları
    [[-0.7, 1.2], [0.7, 1.2], [-0.7, -1.2], [0.7, -1.2]].forEach(([x, z]) => g.add(at(box(0.5, 0.8, 0.1, mat(COL.wood)), x, -0.5, z)));
    // aşçı şapkası (önde)
    const hat = grp(at(cyl(0.35, 0.3, 0.3, mat(COL.white), 20), 0, 0, 0), at(sph(0.42, mat(COL.white), 18), 0, 0.28, 0));
    at(hat, 1.6, 0.7, 0.8); g.add(hat); spinners.push({ o: hat, s: 0.5, axis: 'y' });
    return g;
  }

  const builders = { factory, grocery, barber, restaurant };
  const scenes = {};
  for (const k of SECTOR_KEYS) { const s = builders[k](); s.visible = false; s.scale.setScalar(0.001); scene.add(s); scenes[k] = s; }

  let active = 'factory';
  scenes[active].visible = true; scenes[active].scale.setScalar(1);
  const targetScale = { ...Object.fromEntries(SECTOR_KEYS.map(k => [k, k === active ? 1 : 0.001])) };
  accent.color.setHex(ACCENT[active]); accent.intensity = 22;

  function show(key) {
    if (!scenes[key] || key === active) return;
    active = key;
    accent.color.setHex(ACCENT[key] || 0x2f6fed);
    SECTOR_KEYS.forEach(k => { targetScale[k] = k === key ? 1 : 0.001; if (k === key) scenes[k].visible = true; });
  }

  // ---- pointer parallax ----
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = e => { const r = canvas.getBoundingClientRect(); ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; ptr.ty = ((e.clientY - r.top) / r.height - 0.5) * 2; };
  window.addEventListener('pointermove', onMove, { passive: true });

  // ---- boyut ----
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  // ---- görünürlük (ekran dışıysa / sekme arkadaysa durdur) ----
  let onScreen = true, running = true;
  const io = new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }, { threshold: 0.01 }); io.observe(canvas);

  const clock = new T.Clock();
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!onScreen || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    for (const k of SECTOR_KEYS) {
      const s = scenes[k], cur = s.scale.x, tgt = targetScale[k];
      const ns = cur + (tgt - cur) * 0.12; s.scale.setScalar(ns);
      if (ns < 0.01 && tgt < 0.01) s.visible = false;
      s.rotation.y = Math.sin(t * 0.15) * 0.5 + ptr.x * 0.35;
      s.rotation.x = -0.05 + ptr.y * 0.12;
    }
    for (const sp of spinners) {
      if (sp.bob) { sp.o.position.y = -0.15 + Math.sin(t * 1.6) * 0.12; continue; }
      const ax = sp.axis || 'z'; sp.o.rotation[ax] += sp.s * dt;
    }
    renderer.render(scene, camera);
  }
  frame();

  return {
    show,
    dispose() {
      running = false; ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose()); });
      renderer.dispose();
    },
  };
}
