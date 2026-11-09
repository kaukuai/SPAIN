// Low-poly toy-diorama toolkit: every static model is painted with vertex colours and
// merged into a few draw calls per island, so phones can render the whole trip at once.
import * as THREE from '../vendor/three/three.module.min.js';

export { THREE };

const geoCache = new Map();
const cached = (key, make) => {
  let g = geoCache.get(key);
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
};

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3();
const _c = new THREE.Color();

export function toonGradient(steps = [110, 190, 255]) {
  const tex = new THREE.DataTexture(new Uint8Array(steps), steps.length, 1, THREE.RedFormat);
  tex.minFilter = tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function localMatrix(o = {}) {
  _v.set(o.x || 0, o.y || 0, o.z || 0);
  _e.set(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ');
  _q.setFromEuler(_e);
  const s = o.s ?? 1;
  _s.set((o.sx ?? 1) * s, (o.sy ?? 1) * s, (o.sz ?? 1) * s);
  return new THREE.Matrix4().compose(_v, _q, _s);
}

// Batch collects painted, transformed geometry and merges it per material kind.
export class Batch {
  constructor() {
    this.lists = { toon: [], light: [], glass: [] };
    this.stack = [new THREE.Matrix4()];
  }
  get matrix() { return this.stack[this.stack.length - 1]; }
  push(o = {}) { this.stack.push(this.matrix.clone().multiply(localMatrix(o))); return this; }
  pop() { if (this.stack.length > 1) this.stack.pop(); return this; }
  group(o, fn) { this.push(o); try { fn(this); } finally { this.pop(); } return this; }

  add(geo, color, o = {}, kind = 'toon') {
    const g = geo.clone();
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    if (g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    g.applyMatrix4(this.matrix.clone().multiply(localMatrix(o)));
    const n = g.attributes.position.count;
    const arr = new Float32Array(n * 3);
    _c.set(color);
    for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    (this.lists[kind] || this.lists.toon).push(g);
    return this;
  }

  // Primitives are bottom-aligned (y = base) unless noted, which keeps stacking simple.
  box(w, h, d, color, o = {}, kind) {
    const g = cached('box', () => new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0));
    return this.add(g, color, { ...o, sx: w * (o.sx ?? 1), sy: h * (o.sy ?? 1), sz: d * (o.sz ?? 1) }, kind);
  }
  cyl(rTop, rBot, h, color, o = {}, seg = 14, kind) {
    const key = `cyl:${rTop}:${rBot}:${seg}`;
    const g = cached(key, () => new THREE.CylinderGeometry(rTop, rBot, 1, seg).translate(0, .5, 0));
    return this.add(g, color, { ...o, sy: h * (o.sy ?? 1) }, kind);
  }
  cone(r, h, color, o = {}, seg = 14, kind) { return this.cyl(0.0001, r, h, color, o, seg, kind); }
  sphere(r, color, o = {}, seg = 10, kind) {
    const g = cached(`sph:${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(6, Math.round(seg * .65))));
    return this.add(g, color, { ...o, s: r * (o.s ?? 1) }, kind);
  }
  dome(r, color, o = {}, seg = 16, kind) { // half sphere sitting on y
    const g = cached(`dome:${seg}`, () => new THREE.SphereGeometry(1, seg, Math.max(5, seg >> 1), 0, Math.PI * 2, 0, Math.PI / 2));
    return this.add(g, color, { ...o, s: r * (o.s ?? 1) }, kind);
  }
  torus(R, r, color, o = {}, arc = Math.PI * 2, seg = 24, kind) {
    const g = cached(`tor:${R}:${r}:${arc.toFixed(3)}:${seg}`, () => new THREE.TorusGeometry(R, r, 6, seg, arc));
    return this.add(g, color, o, kind);
  }
  lathe(points, color, o = {}, seg = 18, kind) {
    const g = new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), seg);
    return this.add(g, color, o, kind);
  }
  extrude(shape, depth, color, o = {}, bevel = 0, kind) {
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 10 });
    return this.add(g, color, o, kind);
  }
  // Front-facing window/door insets: drawn in the "light" batch so they glow at night.
  win(w, h, o = {}, color = '#ffd36b') { return this.box(w, h, .12, color, o, 'light'); }

  build(materials) {
    const group = new THREE.Group();
    for (const [kind, list] of Object.entries(this.lists)) {
      if (!list.length) continue;
      const mesh = new THREE.Mesh(mergeGeometries(list), materials[kind]);
      mesh.castShadow = kind === 'toon';
      mesh.receiveShadow = kind !== 'light';
      mesh.matrixAutoUpdate = false;
      group.add(mesh);
      list.forEach(g => g.dispose());
    }
    this.lists = { toon: [], light: [], glass: [] };
    return group;
  }
}

export function mergeGeometries(list) {
  let total = 0, totalIdx = 0;
  for (const g of list) { total += g.attributes.position.count; totalIdx += g.index.count; }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  const idx = new Uint32Array(totalIdx);
  let off = 0, ioff = 0;
  for (const g of list) {
    const n = g.attributes.position.count, src = g.index.array;
    pos.set(g.attributes.position.array, off * 3);
    nor.set(g.attributes.normal.array, off * 3);
    col.set(g.attributes.color.array, off * 3);
    for (let i = 0; i < src.length; i++) idx[ioff + i] = src[i] + off;
    off += n; ioff += src.length;
  }
  const out = new THREE.BufferGeometry();
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

export function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function textTexture(text, { bg = '#ffd34d', fg = '#d6262d', w = 256, h = 160, font = 'bold 78px sans-serif', border = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 14; ctx.strokeRect(7, 7, w - 14, h - 14); }
  ctx.fillStyle = fg; ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Deterministic pseudo-random numbers so the world looks identical on every phone.
export function rng(seed = 1) {
  let s = (typeof seed === 'string' ? [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) : seed) || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return (s % 100000) / 100000; };
}
