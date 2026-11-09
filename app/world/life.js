// Ambient life: cars and people on the avenues, boats, seagulls, live weather,
// New Year's fireworks and collectible coins.
import { THREE, Batch, rng } from './kit.js';

const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3(1, 1, 1), tmpP = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
const CAR_COLORS = ['#ff5a5f', '#ffd23f', '#3fa7ff', '#ffffff', '#5fc15a', '#ff9a3c', '#9d70e0', '#2b2b33'];
const SHIRTS = ['#ff6b6b', '#3fa7ff', '#ffd23f', '#6be675', '#ff9de2', '#ffffff', '#9d70e0', '#ff9a3c', '#2fc4b2'];

function pathInfo(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
  return { pts, cum, len: cum[cum.length - 1] };
}
function sample(info, d) {
  const { pts, cum, len } = info;
  d = ((d % len) + len) % len;
  let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
  const a = pts[i - 1], b = pts[i], t = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, ang: Math.atan2(b.x - a.x, b.z - a.z) };
}

export class Traffic {
  constructor(scene, mats, roads, heightAt) {
    this.heightAt = heightAt;
    this.paths = roads.filter(r => r.pts.length > 3).map(r => ({ ...pathInfo(r.pts), w: r.w })).filter(p => p.len > 12);
    const R = rng('traffic');
    const carB = new Batch();
    carB.box(1.1, .45, .6, '#ffffff', { y: .12 }); carB.box(.6, .35, .55, '#d8f1ff', { y: .55, x: -.05 });
    for (const x of [-.35, .35]) for (const z of [-.3, .3]) carB.cyl(.14, .14, .1, '#2b2b33', { x, z, y: .14, rx: Math.PI / 2 }, 8);
    const carGeo = carB.build({ toon: mats.toon }).children[0].geometry;
    const pedB = new Batch();
    pedB.cyl(.13, .16, .45, '#ffffff', { y: .15 }, 7); pedB.sphere(.14, '#ffd8b5', { y: .75 }, 7); pedB.box(.08, .18, .08, '#3b3f52', { x: -.07 }); pedB.box(.08, .18, .08, '#3b3f52', { x: .07 });
    const pedGeo = pedB.build({ toon: mats.toon }).children[0].geometry;
    const carCount = Math.min(70, this.paths.length * 4), pedCount = Math.min(150, this.paths.length * 8);
    const carMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: mats.toon.gradientMap });
    this.cars = new THREE.InstancedMesh(carGeo, carMat, Math.max(1, carCount));
    this.peds = new THREE.InstancedMesh(pedGeo, carMat, Math.max(1, pedCount));
    this.cars.castShadow = true;
    this.carState = []; this.pedState = [];
    for (let i = 0; i < carCount; i++) {
      const p = this.paths[i % this.paths.length];
      this.carState.push({ p, d: R() * p.len, v: (3 + R() * 3) * (R() > .5 ? 1 : -1), lane: .32 });
      this.cars.setColorAt(i, new THREE.Color(CAR_COLORS[i % CAR_COLORS.length]));
    }
    for (let i = 0; i < pedCount; i++) {
      const p = this.paths[(i * 7) % this.paths.length];
      this.pedState.push({ p, d: R() * p.len, v: (.6 + R() * .7) * (R() > .5 ? 1 : -1), side: R() > .5 ? 1 : -1, ph: R() * 6 });
      this.peds.setColorAt(i, new THREE.Color(SHIRTS[i % SHIRTS.length]));
    }
    this.cars.count = carCount; this.peds.count = pedCount;
    this.cars.frustumCulled = this.peds.frustumCulled = false;
    scene.add(this.cars, this.peds);
  }
  update(dt, t) {
    this.carState.forEach((c, i) => {
      c.d += c.v * dt;
      const s = sample(c.p, c.d), dir = Math.sign(c.v), nx = Math.cos(s.ang) * dir, nz = -Math.sin(s.ang) * dir;
      tmpP.set(s.x + nx * c.lane * c.p.w * .55, this.heightAt(s.x, s.z) + .06, s.z + nz * c.lane * c.p.w * .55);
      tmpQ.setFromAxisAngle(up, s.ang - Math.PI / 2 + (dir < 0 ? Math.PI : 0));
      this.cars.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
    });
    this.pedState.forEach((p, i) => {
      p.d += p.v * dt;
      const s = sample(p.p, p.d), nx = Math.cos(s.ang), nz = -Math.sin(s.ang), off = p.p.w / 2 + .25;
      tmpP.set(s.x + nx * p.side * off, this.heightAt(s.x, s.z) + .05 + Math.abs(Math.sin(t * 8 + p.ph)) * .06, s.z + nz * p.side * off);
      tmpQ.setFromAxisAngle(up, s.ang + (p.v < 0 ? Math.PI : 0));
      this.peds.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS));
    });
    this.cars.instanceMatrix.needsUpdate = true; this.peds.instanceMatrix.needsUpdate = true;
  }
}

export class Boats {
  constructor(scene, mats, routes) {
    this.list = [];
    for (const r of routes) {
      const b = new Batch();
      if (r.kind === 'sail') { b.box(1.4, .35, .5, '#ffffff', {}); b.box(.06, 1.6, .06, '#8a5a3a', { y: .3 }); const s = new THREE.Shape(); s.moveTo(0, 0); s.lineTo(.7, 0); s.lineTo(0, 1.3); s.closePath(); b.extrude(s, .03, r.color || '#ffffff', { x: .05, y: .45 }); }
      else { b.box(2, .4, .8, r.color || '#2d6fa8', {}); b.box(1.2, .4, .7, '#ffffff', { y: .4 }); for (let i = 0; i < 3; i++) b.win(.25, .18, { x: -.4 + i * .4, y: .55, z: .36 }, '#9fd9ff'); }
      const g = b.build(mats);
      scene.add(g);
      this.list.push({ g, info: pathInfo(r.pts), d: Math.random() * 50, v: r.speed || 2, y: r.y ?? -2.45, loop: r.loop });
    }
  }
  update(dt, t) {
    for (const b of this.list) {
      b.d += b.v * dt;
      const s = sample(b.info, b.d);
      b.g.position.set(s.x, b.y + Math.sin(t * 2 + b.d) * .06, s.z);
      b.g.rotation.set(Math.sin(t * 1.6 + b.d) * .05, s.ang - Math.PI / 2, 0);
    }
  }
}

export class Birds {
  constructor(scene, centers) {
    this.flocks = [];
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide });
    const wing = new THREE.PlaneGeometry(.7, .22); wing.translate(.35, 0, 0);
    for (const c of centers) {
      const flock = new THREE.Group();
      const birds = [];
      for (let i = 0; i < 5; i++) {
        const bird = new THREE.Group();
        const l = new THREE.Mesh(wing, mat), r = new THREE.Mesh(wing, mat); r.scale.x = -1;
        bird.add(l, r); bird.userData = { l, r, off: i };
        bird.position.set((i % 3) * 1.2, (i % 2) * .5, Math.floor(i / 2) * 1.1);
        flock.add(bird); birds.push(bird);
      }
      scene.add(flock);
      this.flocks.push({ flock, birds, c, ph: Math.random() * 6 });
    }
  }
  update(dt, t) {
    for (const f of this.flocks) {
      const a = t * .25 + f.ph;
      f.flock.position.set(f.c.x + Math.cos(a) * f.c.r, f.c.y + Math.sin(t * .7 + f.ph) * 1.5, f.c.z + Math.sin(a) * f.c.r);
      f.flock.rotation.y = -a;
      for (const b of f.birds) { const flap = Math.sin(t * 9 + b.userData.off) * .6; b.userData.l.rotation.z = flap; b.userData.r.rotation.z = -flap; }
    }
  }
}

// Live weather from Open-Meteo (free, no key). Silent when offline.
const WMO = c => c === 0 ? ['☀️', '晴'] : c <= 2 ? ['🌤️', '晴時多雲'] : c === 3 ? ['☁️', '陰'] : c <= 48 ? ['🌫️', '霧'] : c <= 57 ? ['🌦️', '毛毛雨'] : c <= 67 ? ['🌧️', '雨'] : c <= 77 ? ['🌨️', '雪'] : c <= 82 ? ['🌧️', '陣雨'] : c <= 86 ? ['🌨️', '陣雪'] : ['⛈️', '雷雨'];
export const weatherLabel = WMO;
export const precipKind = c => (c >= 71 && c <= 77) || c === 85 || c === 86 ? 'snow' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95 ? 'rain' : null;
export async function fetchWeather(cities) {
  const ids = Object.keys(cities);
  const lat = ids.map(id => cities[id][0]).join(','), lon = ids.map(id => cities[id][1]).join(',');
  const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&timezone=auto`, { signal: ctrl.signal });
    if (!res.ok) return null;
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [data];
    return Object.fromEntries(ids.map((id, i) => [id, arr[i]?.current ? { temp: Math.round(arr[i].current.temperature_2m), code: arr[i].current.weather_code } : null]));
  } catch { return null; } finally { clearTimeout(timer); }
}

export class Precipitation {
  constructor(scene) {
    const n = 1400, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - .5) * 90; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = (Math.random() - .5) * 90; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.mat = new THREE.PointsMaterial({ color: '#ffffff', size: .35, transparent: true, opacity: .8, depthWrite: false });
    this.points = new THREE.Points(geo, this.mat); this.points.visible = false; this.points.frustumCulled = false;
    scene.add(this.points); this.kind = null;
  }
  set(kind) {
    this.kind = kind; this.points.visible = !!kind;
    if (kind === 'rain') { this.mat.color.set('#cfe8ff'); this.mat.size = .22; } else if (kind === 'snow') { this.mat.color.set('#ffffff'); this.mat.size = .45; }
  }
  update(dt, t, target) {
    if (!this.kind) return;
    const p = this.points.geometry.attributes.position, a = p.array, fall = this.kind === 'rain' ? 26 : 4;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] -= fall * dt; if (this.kind === 'snow') a[i] += Math.sin(t + i) * dt * .6;
      if (a[i + 1] < -1) a[i + 1] = 40;
    }
    p.needsUpdate = true;
    this.points.position.set(target.x, 0, target.z);
  }
}

export class Fireworks {
  constructor(scene) {
    this.scene = scene; this.bursts = []; this.clock = 0; this.active = false; this.at = { x: 0, z: 0 };
    this.geo = new THREE.BufferGeometry();
    const n = 60, dir = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); dir[i * 3] = r * Math.cos(th); dir[i * 3 + 1] = u; dir[i * 3 + 2] = r * Math.sin(th); }
    this.dir = dir; this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  }
  update(dt) {
    if (this.active) {
      this.clock -= dt;
      if (this.clock < 0) {
        this.clock = .35 + Math.random() * .5;
        const mat = new THREE.PointsMaterial({ color: new THREE.Color().setHSL(Math.random(), 1, .6), size: .8, transparent: true, depthWrite: false });
        const pts = new THREE.Points(this.geo.clone(), mat);
        pts.position.set(this.at.x + (Math.random() - .5) * 18, 14 + Math.random() * 8, this.at.z + (Math.random() - .5) * 12);
        pts.frustumCulled = false; this.scene.add(pts); this.bursts.push({ pts, life: 0 });
      }
    }
    for (const b of this.bursts) {
      b.life += dt;
      const r = Math.min(1, b.life * 1.6) * 6, a = b.pts.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i++) a[i] = this.dir[i] * r - (i % 3 === 1 ? b.life * b.life * 2 : 0);
      b.pts.geometry.attributes.position.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - b.life / 1.6);
      if (b.life > 1.6) { this.scene.remove(b.pts); b.pts.geometry.dispose(); b.pts.material.dispose(); b.dead = true; }
    }
    this.bursts = this.bursts.filter(b => !b.dead);
  }
}

// Gold coins scattered on every island; each phone remembers what it collected.
export class Coins {
  constructor(scene, spots) {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem('spain-coins') || '[]'); } catch {}
    this.got = new Set(saved);
    const geo = new THREE.CylinderGeometry(.55, .55, .14, 18); geo.rotateX(Math.PI / 2);
    const mat = new THREE.MeshToonMaterial({ color: '#ffcc1f', emissive: '#7a5600' });
    const rim = new THREE.MeshBasicMaterial({ color: '#7a4f00', side: THREE.BackSide });
    this.list = spots.map(s => {
      const m = new THREE.Mesh(geo, mat); const o = new THREE.Mesh(geo, rim); o.scale.setScalar(1.12); m.add(o);
      m.position.set(s.x, s.y + 1, s.z); m.visible = !this.got.has(s.id); m.castShadow = true;
      scene.add(m); return { ...s, m, pop: -1 };
    });
  }
  get total() { return this.list.length; }
  get count() { return this.got.size; }
  get mapCount() { return this.list.filter(c => this.got.has(c.id)).length; }
  update(dt, t, party, onCollect) {
    for (const c of this.list) {
      if (c.pop >= 0) { c.pop += dt; c.m.position.y += dt * 6; c.m.scale.setScalar(1 + c.pop * 2); if (c.pop > .45) { c.m.visible = false; c.pop = -1; c.m.scale.setScalar(1); } continue; }
      if (!c.m.visible) continue;
      c.m.rotation.y = t * 3 + c.x;
      c.m.position.y = c.y + 1 + Math.sin(t * 3 + c.z) * .2;
      if (party && Math.hypot(party.x - c.x, party.z - c.z) < 1.8) {
        this.got.add(c.id); c.pop = 0;
        try { localStorage.setItem('spain-coins', JSON.stringify([...this.got])); } catch {}
        onCollect?.(c);
      }
    }
  }
}
