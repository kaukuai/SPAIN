// "冒險" home screen: a toy-diorama Spain where the four-person team runs to each stop.
import { THREE, Batch, toonGradient, roundedRect, rng } from './kit.js';
import { worldLayout, BLOCKS, CITY_ORDER, doorPoint, souvenirKey, cityOf, blockAt, portPoint } from './layout.js';
import { LANDMARKS, shop, shopStyle, filler, tree, lamp, C, planeModel, trainModel, busModel } from './models.js';
import { Party, PARTY, setPartyGradient } from './party.js';
import { NavGrid } from './nav.js';
import { DioramaCamera } from './controls.js';
import { sfx } from './sfx.js';
import { dailyMapPlaces, venueKey } from '../map-data.js';
import { places } from '../map-places.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const LABELS = {
  'granada|Alhambra / Generalife': '夏宮花園', 'granada|Alhambra / Palacios Nazaríes': '納斯里德宮', 'granada|Alhambra / Partal': '帕塔爾花園',
  'granada|Alhambra / Alcazaba': '阿爾卡薩瓦堡壘', 'barcelona|Margherita': 'Margherita 披薩', 'barcelona|El Furacu Restaurant': 'El Furacu',
  'barcelona|Sartoria Panatieri - Pizzeria Barcelona': 'Sartoria 披薩', 'barcelona|Restaurant Galisteo': 'Galisteo 早餐',
  'barcelona|Mercat de la Boqueria': '博蓋利亞市場', 'barcelona|Re-Cuir': 'Re-Cuir 皮件', 'madrid|Consejo Superior de Investigaciones Científicas (CSIC)': '紙房子外景（CSIC）',
  'barcelona|Arenas de Barcelona': '鬥牛場購物中心', 'madrid|Chocolatería San Ginés': '聖吉內斯油條店',
};
const RIDE = { train: '🚄', bus: '🚌', plane: '✈️' };
const PALETTES = {
  day: { sky: ['#62c6ff', '#d6f3ff'], sea: '#45bdf0', hemi: ['#ffffff', '#a9c48a', 1.6], sun: ['#fffaf0', 2.3], light: .38, fog: '#bfe8ff' },
  sunset: { sky: ['#ff8f70', '#ffe0a8'], sea: '#4aa3d8', hemi: ['#ffd7c2', '#8a7a6b', 1.4], sun: ['#ffb27a', 2.1], light: .7, fog: '#ffd0b0' },
  night: { sky: ['#141d46', '#3c4f8f'], sea: '#24508e', hemi: ['#8ea2ff', '#2a3044', .95], sun: ['#a9bcff', .9], light: 1, fog: '#2a3a70' },
};

export class TravelWorld {
  constructor(ctx) {
    this.ctx = ctx;
    this.root = document.createElement('section');
    this.root.className = 'world';
    this.root.setAttribute('aria-label', '西班牙冒險地圖');
    this.root.innerHTML = `
      <canvas class="world-canvas" aria-hidden="true"></canvas>
      <div class="world-labels" aria-hidden="true"></div>
      <div class="world-bubble" hidden></div>
      <header class="world-top">
        <div class="world-day">
          <button class="wbtn round" data-w="prev" aria-label="前一天">◀</button>
          <button class="world-day-label" data-w="today"><small></small><strong></strong></button>
          <button class="wbtn round" data-w="next" aria-label="後一天">▶</button>
        </div>
        <div class="world-tools">
          <button class="wbtn round" data-w="sound" aria-label="音效"></button>
          <button class="wbtn round" data-w="night" aria-label="白天／夜晚"></button>
          <button class="wbtn round" data-w="party" aria-label="回到隊伍">⌖</button>
          <button class="wbtn round" data-w="overview" aria-label="看全地圖">🗺️</button>
        </div>
      </header>
      <nav class="world-cities" aria-label="城市"></nav>
      <section class="world-quest" aria-live="polite"></section>
      <div class="world-ride" hidden></div>
      <aside class="world-card" hidden aria-live="polite"></aside>
      <div class="world-title" hidden></div>
      <div class="world-loading"><div class="world-spinner"></div><p>正在搭建西班牙小鎮…</p></div>`;
    this.$ = s => this.root.querySelector(s);
    this.root.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b && this.root.contains(b)) this.command(b); });
    this.visited = new Set();
    this.questIndex = 0;
    this.token = 0;
    this.nightMode = 'auto';
    this.cardKey = null;
  }

  mount(slot) {
    slot.replaceChildren(this.root);
    if (!this.started) {
      this.started = true;
      requestAnimationFrame(() => setTimeout(() => this.init(), 30));
    } else if (this.ready) { this.resize(); this.start(); this.refresh(); }
  }
  detach() { this.running = false; this.root.remove(); }

  init() {
    const tb = performance.now();
    try { this.build(); console.info(`[world] built in ${Math.round(performance.now() - tb)}ms`); } catch (error) {
      console.error(error);
      this.$('.world-loading').innerHTML = `<p>這台裝置暫時無法顯示 3D 地圖。</p><button class="wbtn" data-action="tab" data-tab="now">改看行程首頁</button>`;
      return;
    }
    this.ready = true;
    this.$('.world-loading').remove();
    const t0 = performance.now();
    this.resize(); this.start(); this.refresh(true);
    this.renderer.render(this.scene, this.camera);
    console.info(`[world] ready in ${Math.round(performance.now() - t0)}ms render, ${this.renderer.info.render.triangles} triangles, ${this.renderer.info.render.calls} draw calls`);
    let shown = false;
    try { shown = sessionStorage.getItem('spain-title') === '1'; } catch {}
    if (!shown) this.showTitle(); else this.controls.flyTo(this.party.position.x, this.party.position.z, 52);
  }

  // ---------------------------------------------------------------- scene
  build() {
    const canvas = this.$('.world-canvas');
    const coarse = matchMedia('(pointer: coarse)').matches;
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 1500);
    const gradient = this.gradient = toonGradient([120, 200, 255]);
    setPartyGradient(gradient);
    this.mats = {
      toon: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient }),
      light: new THREE.MeshBasicMaterial({ vertexColors: true }),
      glass: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, transparent: true, opacity: .55, depthWrite: false }),
    };
    this.hemi = new THREE.HemisphereLight('#ffffff', '#88aa66', 1.6);
    scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff1d6', 2.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 220 });
    sun.shadow.bias = -.0008; sun.shadow.normalBias = .04;
    scene.add(sun, sun.target);

    const sea = this.sea = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1600), new THREE.MeshToonMaterial({ color: '#45bdf0', gradientMap: gradient }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -2.6; sea.receiveShadow = true;
    scene.add(sea);

    this.layout = worldLayout();
    this.names = this.placeNames();
    this.mounds = this.makeMounds();
    this.heightAt = (x, z) => { let h = 0; for (const m of this.mounds) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.rb) h = Math.max(h, d <= m.rt ? m.h : m.h * (1 - smooth((d - m.rt) / (m.rb - m.rt)))); } return h; };

    this.nav = {};
    this.proxies = [];
    this.foams = [];
    for (const block of Object.values(BLOCKS)) this.buildBlock(block);
    this.buildLinks();
    this.buildClouds();
    this.buildMarkers();

    this.party = new Party();
    this.party.heightAt = this.heightAt;
    scene.add(this.party.group);
    this.vehicles = {};
    for (const [mode, make] of Object.entries({ train: trainModel(), bus: busModel(), plane: planeModel('#ffcc33') })) {
      const b = new Batch(); make(b); const g = b.build(this.mats); g.visible = false; scene.add(g); this.vehicles[mode] = g;
    }
    const xs = Object.values(BLOCKS).flatMap(b => [b.cx - b.hw, b.cx + b.hw]), zs = Object.values(BLOCKS).flatMap(b => [b.cz - b.hd, b.cz + b.hd]);
    this.controls = new DioramaCamera(this.camera, canvas, {
      onTap: (x, y) => this.tap(x, y),
      bounds: { minX: Math.min(...xs) - 10, maxX: Math.max(...xs) + 10, minZ: Math.min(...zs) - 10, maxZ: Math.max(...zs) + 10 },
    });
    this.controls.flyTo(BLOCKS.madrid.cx, BLOCKS.madrid.cz, 210); this.controls.update(1);
    this.buildLabels();
    this.$('.world-cities').innerHTML = [...CITY_ORDER, 'tpe'].map(id => `<button class="wchip" data-w="city" data-city="${id}" style="--c:${BLOCKS[id].accent}">${BLOCKS[id].name}</button>`).join('');
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock(); this.time = 0;
    new ResizeObserver(() => this.resize()).observe(this.root);
    this.applyPalette();
    this.updateTools();
  }

  placeNames() {
    const names = new Map();
    const offer = (key, zh, en, category) => {
      if (!key) return;
      const short = String(zh || '').split(/[・／]/)[0].trim();
      const prior = names.get(key);
      if (!prior || (short && short.length < prior.zh.length)) names.set(key, { zh: short || en, en, category: category || prior?.category || '' });
    };
    for (const day of this.ctx.getTrip()?.days || []) {
      for (const e of day.events) for (const o of e.mealOptions?.length ? e.mealOptions.map(m => ({ ...e, ...m })) : [e]) if (o.venue) offer(venueKey(o.venue), o.venue.nameZh, o.venue.nameEn, o.category);
      for (const s of day.optionalStops || []) if (s.venue) offer(venueKey(s.venue), s.venue.nameZh, s.venue.nameEn, '備選');
    }
    for (const [key, p] of Object.entries(places)) if (p.title && !names.has(key)) names.set(key, { zh: p.title.replace(/（.*?）/, ''), en: '', category: '交通' });
    for (const city of CITY_ORDER) names.set(souvenirKey(city), { zh: `${BLOCKS[city].name}伴手禮小舖`, en: 'SOUVENIR', category: '願望清單' });
    for (const [key, zh] of Object.entries(LABELS)) if (names.has(key)) names.get(key).zh = zh;
    for (const it of this.layout.items) if (!names.has(it.key)) names.set(it.key, { zh: it.key.split('|')[1], en: '', category: '' });
    return names;
  }

  makeMounds() {
    const list = [];
    const cluster = (city, keys, h, pad = 2) => {
      const its = keys.map(k => this.layout.byKey.get(k)).filter(Boolean);
      if (!its.length) return;
      const x = its.reduce((s, i) => s + i.x, 0) / its.length, z = its.reduce((s, i) => s + i.z, 0) / its.length;
      const rt = Math.max(...its.map(i => Math.hypot(i.x - x, i.z - z) + i.r * .9)) + pad;
      const b = BLOCKS[city];
      list.push({ city, x, z, h, rt: Math.min(rt, Math.min(b.hw, b.hd) - 5), rb: Math.min(rt + 4.5, Math.min(b.hw, b.hd) - 1.5) });
    };
    cluster('granada', ['granada|Alhambra / Alcazaba', 'granada|Alhambra / Palacios Nazaríes', 'granada|Alhambra / Partal', 'granada|Alhambra / Generalife'], 2.2, .5);
    cluster('granada', ['granada|Mirador de San Nicolás'], 1.6, .8);
    cluster('barcelona', ['barcelona|Park Güell'], 1.4, .4);
    return list;
  }

  buildBlock(block) {
    const scene = this.scene;
    // island: dirt body + rounded grass slab
    const body = new THREE.ExtrudeGeometry(roundedRect(block.hw * 2 - 1, block.hd * 2 - 1, 7), { depth: 6, bevelEnabled: true, bevelSize: .6, bevelThickness: .6, bevelSegments: 2, curveSegments: 10 });
    body.rotateX(-Math.PI / 2);
    const island = new THREE.Mesh(body, new THREE.MeshToonMaterial({ color: block.side, gradientMap: this.gradient }));
    island.position.set(block.cx, -6.9, block.cz); island.receiveShadow = true;
    const slab = new THREE.ExtrudeGeometry(roundedRect(block.hw * 2, block.hd * 2, 7.5), { depth: .3, bevelEnabled: true, bevelSize: .7, bevelThickness: .5, bevelSegments: 3, curveSegments: 12 });
    slab.rotateX(-Math.PI / 2);
    const grass = new THREE.Mesh(slab, new THREE.MeshToonMaterial({ color: block.top, gradientMap: this.gradient }));
    grass.position.set(block.cx, -.8, block.cz); grass.receiveShadow = true;
    const foam = new THREE.Mesh(new THREE.ShapeGeometry(roundedRect(block.hw * 2 + 4, block.hd * 2 + 4, 9)), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .45 }));
    foam.rotation.x = -Math.PI / 2; foam.position.set(block.cx, -2.55, block.cz);
    this.foams.push(foam);
    scene.add(island, grass, foam);

    const nav = this.nav[block.id] = new NavGrid(block);
    const R = rng(block.id);
    const b = new Batch();
    const items = this.layout.items.filter(i => i.city === block.id);
    for (const m of this.mounds.filter(m => m.city === block.id)) {
      const pts = []; for (let i = 0; i <= 10; i++) { const d = m.rb * (1 - i / 10); pts.push([d, this.heightAt(m.x + d, m.z)]); }
      pts.push([0, m.h]);
      b.lathe(pts.reverse().map(([x, y]) => [x, y]).reverse(), shade(block.top, -.06), { x: m.x, z: m.z, y: .001 }, 28);
    }
    for (const it of items) {
      const y = this.heightAt(it.x, it.z);
      const lm = LANDMARKS[it.key];
      b.push({ x: it.x, y, z: it.z });
      if (lm) lm.build(b, R);
      else {
        b.cyl(it.r + .2, it.r + .2, .06, '#f2e2c4', { y: .01 }, 20);
        shop(b, shopStyle(it.key, this.names.get(it.key)?.category || ''), R, block.id);
      }
      b.pop();
      nav.blockCircle(it.x, it.z, it.r * .82);
      const h = lm?.h || 6;
      const proxy = new THREE.Mesh(new THREE.CylinderGeometry(it.r * .95, it.r * .95, h, 10), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(it.x, y + h / 2, it.z); proxy.userData.key = it.key;
      scene.add(proxy); this.proxies.push(proxy);
      it.y = y; it.h = h;
    }
    // filler town, trees and lamps between the stops
    const doors = items.map(doorPoint);
    const ports = this.layout.connectors.filter(c => c.mode !== 'plane' && (c.a === block.id || c.b === block.id)).map(c => c.a === block.id ? c.from : c.to);
    const step = 4.6;
    for (let x = block.cx - block.hw + 4; x < block.cx + block.hw - 3; x += step) for (let z = block.cz - block.hd + 4; z < block.cz + block.hd - 3; z += step) {
      const px = x + (R() - .5) * 1.4, pz = z + (R() - .5) * 1.4;
      if (items.some(i => Math.hypot(i.x - px, i.z - pz) < i.r + 2.6)) continue;
      if (doors.some(d => Math.hypot(d.x - px, d.z - pz) < 3)) continue;
      if (ports.some(p => Math.hypot(p.x - px, p.z - pz) < 7)) continue;
      if (this.mounds.some(m => m.city === block.id && Math.hypot(m.x - px, m.z - pz) < m.rb + 1)) { if (R() > .6) tree(b, px, pz, .7, block.id === 'granada' ? 'cypress' : 'pine', R); continue; }
      const roll = R();
      if (roll < .34) continue;
      const y = this.heightAt(px, pz);
      if (roll < .52) {
        const kind = block.id === 'sevilla' ? (R() > .4 ? 'orange' : 'palm') : block.id === 'granada' ? (R() > .5 ? 'cypress' : 'round') : block.id === 'barcelona' ? (R() > .6 ? 'palm' : 'round') : block.id === 'tpe' ? 'palm' : (R() > .7 ? 'pine' : 'round');
        tree(b, px, pz, .75 + R() * .35, kind, R); nav.blockCircle(px, pz, .5);
      } else if (roll < .58) { lamp(b, px, pz); }
      else {
        const w = 2.6 + R() * 1.2, d = 2.6 + R() * 1;
        b.group({ x: px, y, z: pz, ry: (R() - .5) * .3 }, g => filler(g, R, block.id, w, d));
        nav.blockRect(px, pz, w + .4, d + .4);
      }
    }
    if (block.id === 'granada') { // Sierra Nevada backdrop
      for (const [dx, dz, h, r] of [[.62, -.78, 9, 6], [.82, -.55, 7, 5], [.4, -.88, 6, 4.5]]) {
        const x = block.cx + dx * block.hw, z = block.cz + dz * block.hd;
        b.cone(r, h, '#8aa0b8', { x, z }, 9); b.cone(r * .42, h * .42, C.snow, { x, z, y: h * .58 }, 9);
        nav.blockCircle(x, z, r);
      }
    }
    // airport aprons get a little runway decal; harbour-side Barcelona gets a beach strip
    if (block.id === 'barcelona') {
      b.box(block.hw * 1.1, .05, 3.2, '#ffe39a', { x: block.cx + block.hw * .38, z: block.cz + block.hd - 2.2, y: .01 });
    }
    // the island name sign at the front edge
    b.group({ x: block.cx - block.hw + 6, z: block.cz + block.hd - 1.6 }, g => {
      g.box(.25, 2.2, .25, C.wood, { x: -1.8 }); g.box(.25, 2.2, .25, C.wood, { x: 1.8 });
      g.box(4.6, 1.3, .25, block.accent, { y: 1.3 }); g.box(4.2, .9, .27, C.white, { y: 1.5 });
    });
    const group = b.build(this.mats);
    scene.add(group);
  }

  buildLinks() {
    const b = new Batch();
    for (const c of this.layout.connectors) {
      if (c.mode === 'plane') {
        const a = this.layout.byKey.get(c.stations[0]), z = this.layout.byKey.get(c.stations[1]);
        if (!a || !z) continue;
        const pts = this.flightCurve(a, z).getSpacedPoints(Math.round(Math.hypot(a.x - z.x, a.z - z.z) / 3.2));
        for (const p of pts.slice(2, -2)) b.sphere(.22, '#ffffff', { x: p.x, y: p.y, z: p.z }, 6, 'light');
        continue;
      }
      const { from, to } = c;
      const len = Math.hypot(to.x - from.x, to.z - from.z), ang = Math.atan2(to.x - from.x, to.z - from.z);
      b.group({ x: (from.x + to.x) / 2, z: (from.z + to.z) / 2, ry: ang }, g => {
        g.box(3.2, .5, len + 2, c.mode === 'train' ? '#c9b79a' : '#8d8a96', { y: -.45 });
        g.box(3.6, .2, len + 2, '#ffffff', { y: .02, sx: .06, x: 1.75 }); g.box(3.6, .2, len + 2, '#ffffff', { y: .02, sx: .06, x: -1.75 });
        for (let k = -len / 2; k <= len / 2; k += 6) { g.box(1.4, 2.6, 1.4, '#d8c6a6', { z: k, y: -3 }); g.torus(1.6, .3, '#d8c6a6', { z: k + 3, y: -3, ry: Math.PI / 2 }, Math.PI, 10); }
        if (c.mode === 'train') {
          for (let k = -len / 2; k <= len / 2; k += .9) g.box(2.2, .1, .3, C.wood, { z: k, y: .05 });
          g.box(.12, .14, len + 2, '#6b6f7f', { x: -.6, y: .12 }); g.box(.12, .14, len + 2, '#6b6f7f', { x: .6, y: .12 });
        } else for (let k = -len / 2; k <= len / 2; k += 2) g.box(.15, .06, 1, C.yellow, { z: k, y: .06 });
      });
    }
    this.scene.add(b.build(this.mats));
  }

  flightCurve(a, z) {
    const dx = z.x - a.x, dz = z.z - a.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, peak = 8 + d * .14;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.x - ux * 2, 1, a.z + 3.6 - uz * 2), new THREE.Vector3(a.x + ux * 6, 3, a.z + uz * 6 + 3),
      new THREE.Vector3(a.x + dx / 2, peak, a.z + dz / 2), new THREE.Vector3(z.x - ux * 6, 3, z.z - uz * 6 + 3), new THREE.Vector3(z.x + ux * 1, 1, z.z + 3.6 + uz),
    ], false, 'centripetal');
  }

  buildClouds() {
    const b = new Batch(), R = rng(42);
    for (let i = 0, made = 0; i < 80 && made < 14; i++) {
      const x = -170 + R() * 400, z = -150 + R() * 300, y = 30 + R() * 8;
      if (Object.values(BLOCKS).some(b => Math.abs(x - b.cx) < b.hw + 22 && Math.abs(z - b.cz) < b.hd + 22)) continue;
      made++;
      for (let k = 0; k < 5; k++) b.sphere(2.4 + R() * 2.2, '#ffffff', { x: x + (k - 2) * 2.6, y: y + (k % 2) * 1.1, z: z + (R() - .5) * 2.4, sy: .62 }, 10);
    }
    this.clouds = b.build({ ...this.mats, toon: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: this.gradient, transparent: true, opacity: .92 }) });
    this.clouds.traverse(o => { o.castShadow = false; });
    this.scene.add(this.clouds);
  }

  buildMarkers() {
    const gold = new THREE.MeshToonMaterial({ color: '#ffcc1f', gradientMap: this.gradient, emissive: '#6b4d00' });
    const m = this.marker = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(.9, 1.7, 4), gold); cone.rotation.x = Math.PI; cone.position.y = .85;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(.75, 14, 10), gold); cap.position.y = 2.6;
    const outline = new THREE.MeshBasicMaterial({ color: '#4a3200', side: THREE.BackSide });
    for (const part of [cone, cap]) { const o = new THREE.Mesh(part.geometry, outline); o.scale.setScalar(1.12); part.add(o); m.add(part); }
    const ring = this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, .14, 6, 28), new THREE.MeshBasicMaterial({ color: '#ffe066', transparent: true, opacity: .9 }));
    ring.rotation.x = Math.PI / 2;
    this.scene.add(m, ring);
    this.routeDots = new THREE.InstancedMesh(new THREE.SphereGeometry(.2, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff7c2' }), 900);
    this.routeDots.count = 0; this.routeDots.frustumCulled = false;
    this.scene.add(this.routeDots);
    this.flags = new THREE.Group(); this.scene.add(this.flags);
  }

  buildLabels() {
    const host = this.$('.world-labels');
    this.labels = [];
    for (const it of this.layout.items) {
      const n = this.names.get(it.key);
      const el = document.createElement('div');
      el.className = `wl ${LANDMARKS[it.key] && !it.key.startsWith('transport|') ? 'landmark' : it.souvenir ? 'souvenir' : 'shop'}`;
      el.innerHTML = `<span class="wl-num"></span><b>${esc(n?.zh || it.key)}</b><i class="wl-star">★</i>`;
      el.dataset.key = it.key;
      el.addEventListener('click', e => { e.stopPropagation(); sfx.play('select'); this.goToPlace(it.key); });
      host.append(el);
      this.labels.push({ el, it, pos: new THREE.Vector3(it.x, (it.y || 0) + (it.h || 6) + .8, it.z), num: el.firstChild });
    }
    for (const id of [...CITY_ORDER, 'tpe']) {
      const blk = BLOCKS[id], el = document.createElement('div');
      el.className = 'wl city'; el.style.setProperty('--c', blk.accent);
      el.innerHTML = `<b>${blk.name}</b><small>${blk.en}</small>`;
      el.addEventListener('click', e => { e.stopPropagation(); this.flyCity(id); });
      host.append(el);
      this.labels.push({ el, city: id, pos: new THREE.Vector3(blk.cx, 16, blk.cz) });
    }
  }

  // ---------------------------------------------------------------- loop
  start() {
    if (this.running) return;
    this.running = true; this.clock.getDelta();
    const frame = () => {
      if (!this.running) return;
      requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(.05, this.clock.getDelta());
      this.time += dt;
      this.tick(dt, this.time);
    };
    requestAnimationFrame(frame);
  }
  resize() {
    if (!this.renderer) return;
    const w = this.root.clientWidth || innerWidth, h = this.root.clientHeight || innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.controls.portrait = w < h; this.controls.baseFov = w < h ? 38 : 30;
    this.camera.fov = this.controls.baseFov;
    this.camera.updateProjectionMatrix();
  }
  tick(dt, t) {
    this.party.update(dt, t);
    if (this.riding) this.riding(dt);
    this.controls.update(dt);
    const tg = this.controls.target;
    this.sun.position.set(tg.x + 30, 60, tg.z + 22); this.sun.target.position.set(tg.x, 0, tg.z);
    const s = Math.min(90, Math.max(40, this.controls.dist * .75));
    const sc = this.sun.shadow.camera; if (sc.right !== s) { sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.updateProjectionMatrix(); }
    this.clouds.position.x = ((t * 1.2) % 300) - 60;
    this.foams.forEach((f, i) => { const k = 1 + Math.sin(t * 1.4 + i) * .012; f.scale.set(k, k, 1); f.material.opacity = .32 + Math.sin(t * 1.4 + i) * .1; });
    if (this.markerItem) {
      const it = this.markerItem;
      this.marker.visible = true;
      this.marker.position.set(it.x, it.y + it.h + 1.4 + Math.abs(Math.sin(t * 3)) * .9, it.z);
      this.marker.rotation.y = t * 2;
      const d = doorPoint(it);
      this.ring.visible = true; this.ring.position.set(d.x, this.heightAt(d.x, d.z) + .08, d.z);
      const k = 1 + (t * 1.5 % 1) * .6; this.ring.scale.set(k, k, k); this.ring.material.opacity = 1 - (t * 1.5 % 1);
    } else { this.marker.visible = false; this.ring.visible = false; }
    if (this.routeDots.count) {
      const m = new THREE.Matrix4();
      for (let i = 0; i < this.routeDots.count; i++) {
        const p = this.dotPos[i], k = .55 + Math.max(0, Math.sin(t * 5 - i * .45)) * .6;
        m.makeScale(k, k * .6, k).setPosition(p.x, p.y, p.z); this.routeDots.setMatrixAt(i, m);
      }
      this.routeDots.instanceMatrix.needsUpdate = true;
    }
    this.flags.children.forEach((f, i) => { f.rotation.y = Math.sin(t * 2 + i) * .25; });
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }
  updateLabels() {
    const w = this.root.clientWidth, h = this.root.clientHeight, dist = this.controls.dist, v = new THREE.Vector3();
    const showLandmarks = dist < 95, showShops = dist < 42, showCities = dist > 115;
    for (const L of this.labels) {
      let show;
      if (L.city) show = showCities;
      else show = L.route || (L.it.souvenir ? dist < 70 : LANDMARKS[L.it.key] && !L.it.key.startsWith('transport|') ? showLandmarks : showShops) || L.star && dist < 70;
      if (show) {
        v.copy(L.pos).project(this.camera);
        if (v.z > 1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15) show = false;
        else L.el.style.transform = `translate3d(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px,0) translate(-50%,-100%)`;
      }
      if (L.shown !== show) { L.el.classList.toggle('on', !!show); L.shown = show; }
    }
    if (this.bubble) {
      const p = this.bubble.member.root.position;
      v.set(p.x, p.y + 3.2, p.z).project(this.camera);
      const el = this.$('.world-bubble');
      el.style.transform = `translate3d(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px,0) translate(-50%,-100%)`;
      if (performance.now() > this.bubble.until) { el.hidden = true; this.bubble = null; }
    }
  }

  // ---------------------------------------------------------------- trip state
  refresh(first = false) {
    if (!this.ready) return;
    const trip = this.ctx.getTrip(), date = this.ctx.getDate();
    if (!trip) return;
    const changed = date !== this.date;
    this.date = date;
    const day = trip.days.find(d => d.date === date) || trip.days[0];
    this.day = day;
    this.stops = dailyMapPlaces(day).filter(s => this.layout.byKey.has(s.key));
    if (changed) {
      this.visited = new Set();
      this.questIndex = this.initialQuestIndex();
      this.placeForDay(first);
    }
    this.markRoute();
    this.updateHud();
    if (this.cardKey) this.openCard(this.cardKey, false);
  }
  initialQuestIndex() {
    const now = this.ctx.now(), today = this.ctx.today();
    if (today !== this.date) return 0;
    const ev = id => this.day.events.find(e => e.id === id);
    const i = this.stops.findIndex(s => !s.optional && ev(s.sourceEventId) && Date.parse(ev(s.sourceEventId).end) > now.getTime());
    return i < 0 ? Math.max(0, this.stops.length - 1) : i;
  }
  placeForDay(first) {
    const stop = this.stops[Math.max(0, this.questIndex - 1)] || this.stops[0];
    let item = stop && this.layout.byKey.get(stop.key);
    if (!item) {
      const city = /巴塞/.test(this.day.city) ? 'barcelona' : /格拉/.test(this.day.city) ? 'granada' : /塞維/.test(this.day.city) ? 'sevilla' : /馬德/.test(this.day.city) ? 'madrid' : 'tpe';
      item = { x: BLOCKS[city].cx, z: BLOCKS[city].cz + 4, r: 0, city };
    }
    this.token++;
    this.riding = null; Object.values(this.vehicles).forEach(v => { v.visible = false; }); this.party.group.visible = true;
    this.$('.world-ride').hidden = true;
    const d = item.r ? doorPoint(item) : item;
    this.party.place(d.x, d.z, Math.PI);
    this.partyCity = item.city;
    this.controls.flyTo(d.x, d.z, first ? null : (this.controls.portrait ? 58 : 72), 0);
    if (!first) { this.party.celebrate(); sfx.play('jump'); }
  }
  markRoute() {
    const routeKeys = new Map(this.stops.map(s => [s.key, s]));
    for (const L of this.labels) {
      if (L.city) continue;
      const s = routeKeys.get(L.it.key);
      L.route = !!s;
      L.el.classList.toggle('route', !!s); L.el.classList.toggle('optional', !!s?.optional);
      L.num.textContent = s ? s.label : '';
      const target = this.stops[this.questIndex]?.key === L.it.key;
      L.el.classList.toggle('target', target);
      L.el.classList.toggle('visited', !!s && this.visited.has(L.it.key));
      const stars = this.ctx.wishCount?.(L.it.key) || 0;
      L.star = stars > 0; L.el.classList.toggle('star', stars > 0);
    }
    const target = this.stops[this.questIndex];
    this.markerItem = target ? this.layout.byKey.get(target.key) : null;
    // marching dots between consecutive fixed stops on the same island
    const pts = [];
    const fixed = this.stops.filter(s => !s.optional);
    for (let i = 0; i + 1 < fixed.length; i++) {
      const a = this.layout.byKey.get(fixed[i].key), z = this.layout.byKey.get(fixed[i + 1].key);
      if (!a || !z || a.city !== z.city || a === z) continue;
      const da = doorPoint(a), dz = doorPoint(z);
      const path = [da, ...this.nav[a.city].find(da.x, da.z, dz.x, dz.z)];
      for (let k = 0; k + 1 < path.length; k++) {
        const p = path[k], q = path[k + 1], len = Math.hypot(q.x - p.x, q.z - p.z);
        for (let s = 0; s < len; s += 1.3) { const x = p.x + (q.x - p.x) * s / len, zz = p.z + (q.z - p.z) * s / len; pts.push({ x, y: this.heightAt(x, zz) + .15, z: zz }); }
      }
    }
    this.dotPos = pts.slice(0, 900);
    this.routeDots.count = this.dotPos.length;
  }

  updateHud() {
    const trip = this.ctx.getTrip(), idx = trip.days.indexOf(this.day), d = new Date(this.day.date + 'T12:00:00Z');
    this.$('.world-day-label small').textContent = `DAY ${idx + 1} · ${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEK[d.getUTCDay()]}）${this.ctx.today() === this.day.date ? ' · 今天' : ''}`;
    this.$('.world-day-label strong').textContent = this.day.city;
    this.$('[data-w="prev"]').disabled = idx <= 0; this.$('[data-w="next"]').disabled = idx >= trip.days.length - 1;
    const q = this.$('.world-quest');
    if (!this.stops.length) { q.innerHTML = `<div class="wq-head"><span class="wq-badge">今日任務</span></div><strong class="wq-title">${esc(this.day.title)}</strong><p class="wq-sub">今天以交通移動為主，點地圖上的建築看看介紹吧！</p>`; return; }
    const s = this.stops[this.questIndex] || this.stops[0];
    const fixedTotal = this.stops.length, done = this.stops.filter(x => this.visited.has(x.key)).length;
    q.classList.toggle('collapsed', !!this.questCollapsed);
    q.innerHTML = `<button class="wq-fold" data-w="fold" aria-label="${this.questCollapsed ? '展開任務' : '收合任務'}">${this.questCollapsed ? '▴' : '▾'}</button>
      <div class="wq-head"><span class="wq-badge">${s.optional ? '有空再去' : '今日任務'} ${this.questIndex + 1}/${fixedTotal}</span><span class="wq-time">${esc(s.time)}</span><span class="wq-progress">★ ${done}/${fixedTotal}</span></div>
      <strong class="wq-title"><span class="wq-num ${s.optional ? 'opt' : ''}">${esc(s.label)}</span>${esc(this.names.get(s.key)?.zh || s.title)}</strong>
      <p class="wq-sub">${esc(this.day.title)}</p>
      <div class="wq-pips">${this.stops.map((x, i) => `<button class="wq-pip ${i === this.questIndex ? 'now' : ''} ${this.visited.has(x.key) ? 'done' : ''} ${x.optional ? 'opt' : ''}" data-w="pip" data-i="${i}" aria-label="${esc(x.title)}">${esc(x.label)}</button>`).join('')}</div>
      <div class="wq-actions"><button class="wbtn go" data-w="go">${this.visited.has(s.key) ? '再去一次' : '出發！'}</button><button class="wbtn" data-w="info">看介紹</button><button class="wbtn" data-w="qnext">下一站 ▶</button></div>`;
  }
  updateTools() {
    this.$('[data-w="sound"]').textContent = sfx.muted ? '🔇' : '🔊';
    this.$('[data-w="night"]').textContent = this.nightMode === 'night' ? '🌙' : this.nightMode === 'day' ? '☀️' : '🕒';
    this.$('[data-w="night"]').title = this.nightMode === 'auto' ? '依西班牙時間自動切換' : this.nightMode === 'day' ? '白天' : '夜晚';
  }
  applyPalette() {
    let mode = this.nightMode;
    if (mode === 'auto') {
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: 'numeric', hour12: false }).format(this.ctx.now()));
      mode = hour >= 19 || hour < 8 ? 'night' : hour >= 17 || hour < 9 ? 'sunset' : 'day';
    }
    const p = PALETTES[mode];
    this.root.style.setProperty('--sky1', p.sky[0]); this.root.style.setProperty('--sky2', p.sky[1]);
    this.root.dataset.time = mode;
    this.sea.material.color.set(p.sea);
    this.hemi.color.set(p.hemi[0]); this.hemi.groundColor.set(p.hemi[1]); this.hemi.intensity = p.hemi[2];
    this.sun.color.set(p.sun[0]); this.sun.intensity = p.sun[1];
    this.mats.light.color.setScalar(p.light);
  }

  // ---------------------------------------------------------------- interaction
  command(btn) {
    const w = btn.dataset.w;
    sfx.unlock();
    if (w === 'prev' || w === 'next') {
      const days = this.ctx.getTrip().days, i = days.indexOf(this.day) + (w === 'next' ? 1 : -1);
      if (days[i]) { sfx.play('select'); this.ctx.setDate(days[i].date); }
    } else if (w === 'today') { const t = this.ctx.today(); if (this.ctx.getTrip().days.some(d => d.date === t)) this.ctx.setDate(t); else this.ctx.toast?.('旅程期間會自動跳到今天；可用 ◀ ▶ 換日期。'); }
    else if (w === 'sound') { sfx.setMuted(!sfx.muted); this.updateTools(); sfx.play('select'); }
    else if (w === 'night') { this.nightMode = { auto: 'day', day: 'night', night: 'auto' }[this.nightMode]; this.applyPalette(); this.updateTools(); sfx.play('select'); }
    else if (w === 'party') { this.controls.flyTo(this.party.position.x, this.party.position.z, 56, 0); sfx.play('tap'); }
    else if (w === 'overview') { const portrait = this.root.clientWidth < this.root.clientHeight; this.controls.flyTo(portrait ? -12 : 46, portrait ? 30 : 20, portrait ? 400 : 215, portrait ? -Math.PI / 2 : 0); sfx.play('whoosh'); }
    else if (w === 'city') this.flyCity(btn.dataset.city);
    else if (w === 'pip') { this.questIndex = +btn.dataset.i; sfx.play('tap'); this.markRoute(); this.updateHud(); const it = this.markerItem; if (it) this.controls.flyTo(it.x, it.z, Math.min(this.controls.goalDist, 60)); }
    else if (w === 'go') { const s = this.stops[this.questIndex]; if (s) { sfx.play('go'); this.goToPlace(s.key); } }
    else if (w === 'info') { const s = this.stops[this.questIndex]; if (s) { sfx.play('select'); this.openCard(s.key); } }
    else if (w === 'qnext') { if (this.stops.length) { this.questIndex = (this.questIndex + 1) % this.stops.length; sfx.play('tap'); this.markRoute(); this.updateHud(); const it = this.markerItem; if (it) this.controls.flyTo(it.x, it.z, Math.min(this.controls.goalDist, 60)); } }
    else if (w === 'fold') { this.questCollapsed = !this.questCollapsed; this.updateHud(); }
    else if (w === 'close') this.closeCard();
    else if (w === 'skip') this.skipRide?.();
    else if (w === 'start') this.startGame();
  }
  flyCity(id) {
    const b = BLOCKS[id]; if (!b) return;
    sfx.play('whoosh');
    this.controls.flyTo(b.cx, b.cz + 2, Math.max(b.hw, b.hd) * (this.controls.portrait ? 3.1 : 2.3), 0);
  }
  tap(cx, cy) {
    sfx.unlock();
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2((cx - rect.left) / rect.width * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects([...this.party.members.map(m => m.hit), ...this.proxies], false);
    const hit = hits[0];
    if (hit?.object.userData.member && this.party.group.visible) return this.talk(hit.object.userData.member);
    if (hit?.object.userData.key) { sfx.play('select'); return this.goToPlace(hit.object.userData.key); }
    const ray = this.raycaster.ray, tt = -ray.origin.y / ray.direction.y;
    if (tt > 0) {
      const p = ray.origin.clone().addScaledVector(ray.direction, tt);
      const blk = blockAt(p.x, p.z, 1.5);
      if (blk) { sfx.play('tap'); this.closeCard(); this.travel(blk.id, { x: p.x, z: p.z }); }
    }
  }
  talk(member) {
    sfx.play('jump'); member.jump();
    const next = this.stops[this.questIndex];
    const lines = [member.def.line,
      next ? `下一站：${this.names.get(next.key)?.zh || next.title}（${next.time}）` : `今天：${this.day.title}`,
      `${member.def.role}・${member.def.name}`];
    const el = this.$('.world-bubble');
    el.innerHTML = `<strong>${esc(member.def.name)}</strong><span>${esc(lines[(member.talks = (member.talks || 0) + 1) % 2 ? 0 : 1])}</span>`;
    el.hidden = false;
    this.bubble = { member, until: performance.now() + 3200 };
  }

  async goToPlace(key) {
    const item = this.layout.byKey.get(key); if (!item) return;
    this.closeCard();
    const door = doorPoint(item);
    const ok = await this.travel(item.city, door);
    if (!ok) return;
    this.party.leader.facing = Math.PI; this.party.members.forEach(m => { m.facing = Math.PI; });
    this.party.celebrate(); sfx.play('arrive');
    if (this.stops.some(s => s.key === key)) {
      this.visited.add(key);
      const i = this.stops.findIndex(s => s.key === key);
      if (i === this.questIndex) { const nxt = this.stops.findIndex((s, j) => j > i && !this.visited.has(s.key)); if (nxt >= 0) this.questIndex = nxt; }
      this.markRoute(); this.updateHud();
    }
    setTimeout(() => this.openCard(key), 380);
  }

  // Walk inside an island, hopping on the train / bus / plane when the target is elsewhere.
  async travel(city, point) {
    const my = ++this.token;
    this.controls.follow = this.party.position; this.controls.lastInteract = -1e9;
    if (this.partyCity !== city) {
      const hops = this.route(this.partyCity, city);
      if (!hops) return false;
      for (const hop of hops) {
        const station = this.layout.byKey.get(hop.conn.stations[hop.forward ? 0 : 1]);
        const sd = doorPoint(station);
        if (!(await this.walk(this.partyCity, sd))) return false;
        if (my !== this.token) return false;
        if (!(await this.ride(hop.conn, hop.forward, hops.length > 1))) return false;
        if (my !== this.token) return false;
      }
    }
    return this.walk(city, point, my);
  }
  route(from, to) {
    const graph = new Map();
    for (const c of this.layout.connectors) {
      (graph.get(c.a) || graph.set(c.a, []).get(c.a)).push({ conn: c, forward: true, to: c.b });
      (graph.get(c.b) || graph.set(c.b, []).get(c.b)).push({ conn: c, forward: false, to: c.a });
    }
    const prev = new Map([[from, null]]), queue = [from];
    while (queue.length) {
      const cur = queue.shift();
      if (cur === to) break;
      for (const e of graph.get(cur) || []) if (!prev.has(e.to)) { prev.set(e.to, { ...e, from: cur }); queue.push(e.to); }
    }
    if (!prev.has(to)) return null;
    const hops = [];
    for (let c = to; prev.get(c); c = prev.get(c).from) hops.unshift(prev.get(c));
    return hops;
  }
  walk(city, point, my = this.token) {
    const P = this.party.position;
    const path = this.nav[city].find(P.x, P.z, point.x, point.z);
    let len = 0, last = { x: P.x, z: P.z };
    for (const p of path) { len += Math.hypot(p.x - last.x, p.z - last.z); last = p; }
    if (len < .3) return Promise.resolve(my === this.token);
    const speed = Math.max(6.5, len / 3.2);
    return new Promise(resolve => {
      this.party.walk(path, speed, () => resolve(my === this.token));
      const guard = this.token;
      const check = () => { if (this.token !== guard) resolve(false); else if (this.party.moving) setTimeout(check, 200); };
      setTimeout(check, 200);
    });
  }
  ride(conn, forward, quick) {
    const [ka, kb] = forward ? conn.stations : [...conn.stations].reverse();
    const a = this.layout.byKey.get(ka), z = this.layout.byKey.get(kb);
    const [ca, cb] = forward ? [conn.a, conn.b] : [conn.b, conn.a];
    let curve;
    if (conn.mode === 'plane') curve = this.flightCurve(a, z);
    else {
      const pa = portPoint(ca, cb), pb = portPoint(cb, ca);
      curve = new THREE.CatmullRomCurve3([new THREE.Vector3(a.x, .2, a.z), new THREE.Vector3(pa.x, .2, pa.z), new THREE.Vector3(pb.x, .2, pb.z), new THREE.Vector3(z.x, .2, z.z)], false, 'centripetal');
    }
    const vehicle = this.vehicles[conn.mode];
    const duration = (conn.mode === 'plane' ? 3.8 : 3.3) * (quick ? .7 : 1);
    const my = this.token;
    this.party.group.visible = false; vehicle.visible = true;
    this.closeCard();
    sfx.play(conn.mode === 'plane' ? 'whoosh' : 'go');
    const banner = this.$('.world-ride');
    banner.innerHTML = `<span>${RIDE[conn.mode]}</span><b>搭乘${esc(conn.label)}</b><small>${esc(BLOCKS[ca].name)} → ${esc(BLOCKS[cb].name)}</small><button class="wbtn" data-w="skip">略過 ⏩</button>`;
    banner.hidden = false;
    const look = new THREE.Vector3();
    return new Promise(resolve => {
      let t = 0;
      const finish = ok => {
        this.riding = null; this.skipRide = null; vehicle.visible = false; this.party.group.visible = true; banner.hidden = true;
        if (ok) { const d = doorPoint(z); this.party.place(d.x, d.z, Math.PI); this.partyCity = cb; this.controls.follow = this.party.position; sfx.play('jump'); this.party.celebrate(); }
        resolve(ok);
      };
      this.skipRide = () => { t = duration; };
      this.riding = dt => {
        if (my !== this.token) return finish(false);
        t += dt;
        const k = Math.min(1, t / duration), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        const p = curve.getPointAt(e), q = curve.getPointAt(Math.min(1, e + .01));
        vehicle.position.copy(p);
        look.copy(q).sub(p);
        if (look.lengthSq() > 1e-6) { vehicle.rotation.y = Math.atan2(look.x, look.z) - Math.PI / 2; vehicle.rotation.z = conn.mode === 'plane' ? Math.atan2(look.y, Math.hypot(look.x, look.z)) : 0; }
        this.controls.follow = vehicle.position;
        if (conn.mode === 'plane') this.controls.goalDist = Math.max(this.controls.goalDist, 70);
        if (k >= 1) finish(true);
      };
    });
  }

  openCard(key, animate = true) {
    const card = this.$('.world-card');
    const n = this.names.get(key) || { zh: key };
    const item = this.layout.byKey.get(key);
    this.cardKey = key;
    const stop = this.stops.find(s => s.key === key);
    card.innerHTML = `<div class="wc-head" style="--c:${BLOCKS[item?.city]?.accent || '#ffd23f'}">
        <div><small>${esc(BLOCKS[item?.city]?.name || '')}${stop ? ` · 今日第 ${esc(stop.label)} 站` : ''}</small><h2>${esc(n.zh)}</h2>${n.en && n.en !== n.zh ? `<p>${esc(n.en)}</p>` : ''}</div>
        <button class="wbtn round" data-w="close" aria-label="關閉">✕</button></div>
      <div class="wc-body">${this.ctx.placeCard(key)}</div>`;
    card.hidden = false;
    if (animate) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); }
  }
  closeCard() {
    if (!this.cardKey) return;
    this.cardKey = null;
    const card = this.$('.world-card'); card.hidden = true; card.innerHTML = '';
  }

  showTitle() {
    const el = this.$('.world-title');
    el.innerHTML = `<div class="wt-inner">
      <div class="wt-logo"><span>¡</span>VAMOS<span>!</span></div>
      <h1>西班牙大冒險</h1>
      <p>2026.12.23 – 2027.01.04 · 四人旅行團</p>
      <div class="wt-party">${PARTY.map(m => `<span class="wt-face ${m.id}" style="--shirt:${m.shirt};--skin:${m.skin};--hair:${m.hood || m.hair}" title="${esc(m.name)}"><i></i></span>`).join('')}</div>
      <button class="wbtn go big" data-w="start">點一下開始旅程</button>
      <small>拖曳移動・雙指縮放旋轉・點建築看資料</small></div>`;
    el.hidden = false;
  }
  startGame() {
    const el = this.$('.world-title');
    el.classList.add('leaving');
    try { sessionStorage.setItem('spain-title', '1'); } catch {}
    sfx.unlock(); sfx.play('levelup');
    setTimeout(() => { el.hidden = true; el.classList.remove('leaving'); }, 500);
    this.controls.flyTo(this.party.position.x, this.party.position.z, 52);
    setTimeout(() => { this.party.celebrate(); this.talk(this.party.leader); }, 1400);
  }
}

function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
function shade(hex, amt) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt))); return '#' + c.getHexString(); }
