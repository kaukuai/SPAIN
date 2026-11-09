import { THREE } from './kit.js';
import { PARTY } from './team.js';

export { PARTY };

const matCache = new Map();
let gradient;
export function setPartyGradient(g) { gradient = g; }
const mat = color => {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradient }));
  return matCache.get(color);
};
const outlineMat = new THREE.MeshBasicMaterial({ color: '#2b2433', side: THREE.BackSide });
const sphereGeo = new THREE.SphereGeometry(1, 18, 14);
const capGeo = new THREE.CapsuleGeometry(1, 1, 4, 10);
const cylGeo = new THREE.CylinderGeometry(1, 1, 1, 10);

function part(geo, color, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, outline = false, rx = 0, ry = 0, rz = 0 } = {}) {
  const m = new THREE.Mesh(geo, mat(color));
  m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  if (outline) {
    const o = new THREE.Mesh(geo, outlineMat);
    o.scale.setScalar(1.09);
    m.add(o);
  }
  return m;
}

function flagTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd23f'; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#e8463c'; g.fillRect(0, 0, 256, 34); g.fillRect(0, 126, 256, 34);
  g.fillStyle = '#c0262d'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = 'bold 22px "Arial Rounded MT Bold",sans-serif'; g.fillStyle = '#fff'; g.fillText('HOLYMAN TOUR', 128, 18);
  g.fillStyle = '#c0262d'; g.font = 'bold 60px "PingFang TC","Noto Sans TC",sans-serif'; g.fillText('西班牙團', 128, 82);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class Member {
  constructor(def, index) {
    this.def = def; this.index = index;
    this.root = new THREE.Group();
    this.root.userData.member = this;
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.phase = Math.random() * 6; this.blink = 2 + Math.random() * 3; this.jumpT = -1; this.speed = 0; this.facing = 0;
    const s = def.scale;
    const legY = .42;
    // legs
    this.legs = [-1, 1].map(side => {
      const pivot = new THREE.Group(); pivot.position.set(side * .15, legY, 0);
      pivot.add(part(capGeo, def.pants, { y: -.18, sx: .1, sy: .12, sz: .1 }));
      pivot.add(part(sphereGeo, '#ffffff', { y: -.38, z: .04, sx: .13, sy: .09, sz: .17, outline: true }));
      this.body.add(pivot); return pivot;
    });
    // torso
    this.torso = part(sphereGeo, def.shirt, { y: .66, sx: .32, sy: .34, sz: .28, outline: true });
    this.body.add(this.torso);
    if (def.girl) {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(.24, .38, .3, 14), mat(def.skirt));
      skirt.position.y = .42; skirt.castShadow = true; this.body.add(skirt);
      const rim = new THREE.Mesh(skirt.geometry, outlineMat); rim.scale.setScalar(1.06); skirt.add(rim);
    } else this.body.add(part(cylGeo, def.pants, { y: .45, sx: .3, sy: .12, sz: .26 }));
    // arms
    this.arms = [-1, 1].map(side => {
      const pivot = new THREE.Group(); pivot.position.set(side * .33, .82, 0);
      pivot.add(part(capGeo, def.shirt, { y: -.14, sx: .08, sy: .1, sz: .08 }));
      pivot.add(part(sphereGeo, def.skin, { y: -.32, sx: .085, sy: .085, sz: .085 }));
      pivot.rotation.z = side * .25;
      this.body.add(pivot); return pivot;
    });
    // head
    const head = this.head = new THREE.Group(); head.position.y = 1.28;
    head.add(part(sphereGeo, def.skin, { sx: .44, sy: .41, sz: .41, outline: true }));
    this.eyes = [-1, 1].map(side => {
      const e = part(capGeo, '#2b2433', { x: side * .14, y: .02, z: .37, sx: .045, sy: .045, sz: .03 });
      e.add(part(sphereGeo, '#ffffff', { x: .5, y: .9, z: .6, sx: .45, sy: .35, sz: .4 }));
      head.add(e); return e;
    });
    for (const side of [-1, 1]) head.add(part(sphereGeo, '#ff9aa2', { x: side * .25, y: -.1, z: .32, sx: .07, sy: .04, sz: .03 }));
    head.add(part(sphereGeo, '#c9705a', { y: -.15, z: .39, sx: .06, sy: .025, sz: .02 }));
    if (def.girl) {
      head.add(part(sphereGeo, def.hair, { y: .1, z: -.05, sx: .47, sy: .38, sz: .44 }));
      head.add(part(sphereGeo, def.hair, { y: -.12, z: -.16, sx: .42, sy: .42, sz: .3 }));
      head.add(part(sphereGeo, def.hair, { y: .26, z: .26, sx: .36, sy: .12, sz: .16, rx: .3 }));
      for (const side of [-1, 1]) {
        head.add(part(sphereGeo, def.hair, { x: side * .46, y: -.08, z: -.06, sx: .14, sy: .22, sz: .14, outline: true }));
        head.add(part(sphereGeo, def.bow, { x: side * .42, y: .08, z: -.04, sx: .07, sy: .07, sz: .07 }));
      }
      head.add(part(sphereGeo, def.bow, { x: .22, y: .38, z: .1, sx: .12, sy: .08, sz: .06, rz: .4 }));
      head.add(part(sphereGeo, def.bow, { x: .36, y: .34, z: .1, sx: .12, sy: .08, sz: .06, rz: -.4 }));
      for (const side of [-1, 1]) head.add(part(new THREE.BoxGeometry(1, 1, 1), '#2b2433', { x: side * .2, y: .1, z: .37, sx: .05, sy: .015, sz: .02, rz: side * -.5 }));
    } else if (def.hood) {
      head.add(part(sphereGeo, def.hood, { y: .06, z: -.06, sx: .5, sy: .48, sz: .47 }));
      head.children.at(-1).scale.z = .42;
      head.add(part(sphereGeo, def.skin, { y: -.02, z: .14, sx: .38, sy: .35, sz: .32 }));
      for (const side of [-1, 1]) head.add(part(sphereGeo, def.hood, { x: side * .28, y: .42, sx: .1, sy: .12, sz: .08 }));
    } else {
      head.add(part(sphereGeo, def.hair, { y: .12, z: -.05, sx: .46, sy: .36, sz: .43 }));
      if (def.spiky) for (let i = 0; i < 5; i++) head.add(part(new THREE.ConeGeometry(.09, .25, 6), def.hair, { x: -.24 + i * .12, y: .42, z: .05 - Math.abs(i - 2) * .04, rz: (i - 2) * -.25 }));
      else head.add(part(sphereGeo, def.hair, { x: .12, y: .3, z: .26, sx: .2, sy: .08, sz: .12, rz: -.3 }));
    }
    if (def.hat) {
      head.add(part(cylGeo, def.hat, { y: .36, sx: .4, sy: .14, sz: .4 }));
      head.add(part(sphereGeo, def.hat, { y: .38, sx: .41, sy: .2, sz: .41 }));
      head.add(part(cylGeo, def.hat, { y: .3, z: .3, sx: .3, sy: .03, sz: .24 }));
    }
    if (def.glasses) for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.085, .018, 6, 14), mat('#2b2433'));
      ring.position.set(side * .14, .03, .4); head.add(ring);
    }
    this.body.add(head);
    if (def.backpack) {
      this.body.add(part(sphereGeo, def.backpack, { y: .72, z: -.28, sx: .26, sy: .28, sz: .16, outline: true }));
      this.body.add(part(sphereGeo, '#ffd23f', { y: .62, z: -.43, sx: .12, sy: .08, sz: .05 }));
    }
    if (def.camera) {
      const cam = part(new THREE.BoxGeometry(1, 1, 1), '#2b2433', { y: .62, z: .29, sx: .2, sy: .13, sz: .08 });
      cam.add(part(cylGeo, '#7d8aa3', { z: .7, rx: Math.PI / 2, sx: .3, sy: .6, sz: .3 }));
      this.body.add(cam);
    }
    if (def.flag) {
      const pole = part(cylGeo, '#b8bec9', { y: .6, sx: .02, sy: 1.9, sz: .02 });
      this.flagPivot = new THREE.Group(); this.flagPivot.position.set(.02, -.3, .05);
      this.flagPivot.add(pole);
      const geo = new THREE.PlaneGeometry(.75, .47, 10, 3); geo.translate(.375, 0, 0);
      this.flagGeo = geo; this.flagBase = geo.attributes.position.array.slice();
      const cloth = new THREE.Mesh(geo, new THREE.MeshToonMaterial({ map: flagTexture(), side: THREE.DoubleSide, gradientMap: gradient }));
      cloth.position.set(0, 1.3, 0); cloth.castShadow = true;
      this.flagPivot.add(cloth);
      this.arms[1].add(this.flagPivot);
      this.arms[1].rotation.z = -.4;
    }
    this.root.scale.setScalar(s * 1.25);
    // invisible, generous hit target for tapping a member
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 1.8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = .9; hit.userData.member = this; this.root.add(hit); this.hit = hit;
  }

  jump() { this.jumpT = 0; }

  update(dt, t) {
    const moving = this.speed > .2;
    const run = Math.min(1, this.speed / 5);
    this.phase += dt * (moving ? 6 + this.speed * 1.6 : 2);
    const sw = moving ? Math.sin(this.phase) * (.5 + run * .5) : 0;
    this.legs[0].rotation.x = sw; this.legs[1].rotation.x = -sw;
    this.arms[0].rotation.x = -sw * .9;
    if (!this.def.flag) this.arms[1].rotation.x = sw * .9;
    else { this.arms[1].rotation.x = -.35 + Math.sin(t * 2) * .05; this.flagPivot.rotation.x = .35; }
    let y = moving ? Math.abs(Math.sin(this.phase)) * .1 : 0;
    let sq = moving ? 1 : 1 + Math.sin(t * 2.4 + this.index) * .02;
    this.body.rotation.x = moving ? .12 + run * .1 : 0;
    if (this.jumpT >= 0) {
      this.jumpT += dt;
      const j = this.jumpT / .55;
      if (j < 1) {
        y += Math.sin(j * Math.PI) * .9;
        sq = j < .12 ? 1 - (j / .12) * .25 : j > .88 ? .75 + (1 - j) / .12 * .25 : 1.08;
        this.arms[0].rotation.z = -1.9; if (!this.def.flag) this.arms[1].rotation.z = 1.9;
      } else { this.jumpT = -1; this.arms[0].rotation.z = -.25; if (!this.def.flag) this.arms[1].rotation.z = .25; }
    }
    this.body.position.y = y;
    this.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    this.head.rotation.z = moving ? 0 : Math.sin(t * 1.3 + this.index * 2) * .06;
    this.blink -= dt;
    const closed = this.blink < .12;
    for (const e of this.eyes) e.scale.y = closed ? .008 : .045;
    if (this.blink < 0) this.blink = 2 + Math.random() * 3.5;
    if (this.flagGeo) {
      const p = this.flagGeo.attributes.position.array, base = this.flagBase;
      for (let i = 0; i < p.length; i += 3) { const x = base[i]; p[i + 2] = Math.sin(x * 7 - t * (moving ? 12 : 5)) * x * .22; }
      this.flagGeo.attributes.position.needsUpdate = true;
      this.flagGeo.computeVertexNormals();
    }
    let d = this.facing - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * Math.min(1, dt * 10);
  }
}

// Leader walks the path; the others trail the leader's footsteps, then gather round.
export class Party {
  constructor() {
    this.group = new THREE.Group();
    this.members = PARTY.map((def, i) => new Member(def, i));
    this.members.forEach(m => this.group.add(m.root));
    this.leader = this.members[0];
    this.path = []; this.trail = []; this.onArrive = null; this.speed = 7; this.heightAt = () => 0;
    this.puffs = [];
    const puffGeo = new THREE.SphereGeometry(.18, 8, 6), puffMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .8 });
    for (let i = 0; i < 24; i++) { const p = new THREE.Mesh(puffGeo, puffMat.clone()); p.visible = false; p.userData.life = 0; this.group.add(p); this.puffs.push(p); }
    this.puffClock = 0;
  }
  get position() { return this.leader.root.position; }
  place(x, z, facing = 0) {
    this.members.forEach((m, i) => {
      const slot = this.slot(i, x, z, facing);
      m.root.position.set(slot.x, this.heightAt(slot.x, slot.z), slot.z); m.facing = m.root.rotation.y = facing; m.speed = 0;
    });
    this.path = []; this.trail = [{ x, z }];
  }
  slot(i, x, z, facing) {
    const offsets = [[0, 0], [-1.05, -.9], [1.05, -.9], [0, -1.6]];
    const [ox, oz] = offsets[i];
    const c = Math.cos(facing), s = Math.sin(facing);
    return { x: x + ox * c + oz * s, z: z - ox * s + oz * c };
  }
  walk(path, speed = 7, onArrive = null) {
    this.path = path.slice(); this.speed = speed; this.onArrive = onArrive;
  }
  get moving() { return this.path.length > 0; }
  celebrate() { this.members.forEach((m, i) => setTimeout(() => m.jump(), i * 90)); }
  update(dt, t) {
    const L = this.leader.root.position;
    if (this.path.length) {
      const target = this.path[0];
      const dx = target.x - L.x, dz = target.z - L.z, d = Math.hypot(dx, dz);
      const step = this.speed * dt;
      if (d <= step) { L.x = target.x; L.z = target.z; this.path.shift(); }
      else { L.x += dx / d * step; L.z += dz / d * step; this.leader.facing = Math.atan2(dx, dz); }
      this.leader.speed = this.speed;
      const last = this.trail[this.trail.length - 1];
      if (!last || Math.hypot(L.x - last.x, L.z - last.z) > .12) { this.trail.push({ x: L.x, z: L.z }); if (this.trail.length > 400) this.trail.shift(); }
      if (!this.path.length) {
        this.leader.speed = 0;
        const cb = this.onArrive; this.onArrive = null;
        cb?.();
      }
    } else this.leader.speed = 0;
    L.y = this.heightAt(L.x, L.z);
    // followers
    for (let i = 1; i < this.members.length; i++) {
      const m = this.members[i], P = m.root.position;
      let goal;
      if (this.path.length) goal = this.trailPoint(i * 1.15);
      else goal = this.slot(i, L.x, L.z, this.leader.facing);
      const dx = goal.x - P.x, dz = goal.z - P.z, d = Math.hypot(dx, dz);
      const want = this.path.length ? this.speed * (d > 1 ? 1.15 : d) : Math.min(this.speed, d * 4);
      const v = Math.min(want, d / Math.max(dt, 1e-3));
      if (d > .05) { P.x += dx / d * v * dt; P.z += dz / d * v * dt; m.facing = Math.atan2(dx, dz); }
      else if (!this.path.length) m.facing = this.leader.facing;
      m.speed = d > .08 ? v : 0;
      P.y = this.heightAt(P.x, P.z);
    }
    // dust puffs while running
    this.puffClock -= dt;
    if (this.puffClock < 0 && this.members.some(m => m.speed > 3)) {
      this.puffClock = .07;
      const m = this.members[Math.floor(Math.random() * 4)];
      if (m.speed > 3) { const p = this.puffs.find(q => !q.visible); if (p) { p.visible = true; p.userData.life = .5; p.position.set(m.root.position.x + (Math.random() - .5) * .3, m.root.position.y + .1, m.root.position.z + (Math.random() - .5) * .3); p.scale.setScalar(.6); } }
    }
    for (const p of this.puffs) if (p.visible) { p.userData.life -= dt; const k = p.userData.life / .5; p.scale.setScalar(.6 + (1 - k) * 1.2); p.position.y += dt * .6; p.material.opacity = k * .7; if (k <= 0) p.visible = false; }
    this.members.forEach(m => m.update(dt, t));
  }
  trailPoint(dist) {
    let remaining = dist;
    for (let i = this.trail.length - 1; i > 0; i--) {
      const a = this.trail[i], b = this.trail[i - 1], seg = Math.hypot(a.x - b.x, a.z - b.z);
      if (seg >= remaining) { const t = remaining / seg; return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }; }
      remaining -= seg;
    }
    return this.trail[0] || { x: this.position.x, z: this.position.z };
  }
}
