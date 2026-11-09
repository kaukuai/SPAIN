// "冒險" home screen: a toy-diorama Spain. Each city is an island cut to its real outline,
// sitting at its true position on a map of Spain; the four-person team runs between stops.
import { THREE, Batch, toonGradient, rng } from './kit.js';
import { worldLayout, BLOCKS, CITY_ORDER, doorPoint, souvenirKey, blockAt, portPoint, insideBlock } from './layout.js';
import { CITIES, DECOR, ROUTES, MAP_RIVERS, MAP_MOUNTAINS, mapXY, project, scaleAt, pointInPolygon } from './geo.js';
import { SPAIN_BORDER, PROVINCES } from './spain-map.js';
import { C, planeModel, trainModel, busModel, tree } from './models.js';
import { Party, PARTY, setPartyGradient } from './party.js';
import { DioramaCamera } from './controls.js';
import { sfx, music } from './sfx.js';
import { buildCity } from './city-builder.js';
import { Traffic, Boats, Birds, Precipitation, Fireworks, Coins, fetchWeather, weatherLabel, precipKind } from './life.js';
import { QUIZ } from './quiz.js';
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
  day: { sky: ['#62c6ff', '#d6f3ff'], sea: '#45bdf0', hemi: ['#ffffff', '#a9c48a', 1.6], sun: ['#fffaf0', 2.3], light: .38, fog: '#cdeeff' },
  sunset: { sky: ['#ff8f70', '#ffe0a8'], sea: '#4aa3d8', hemi: ['#ffd7c2', '#8a7a6b', 1.4], sun: ['#ffb27a', 2.1], light: .7, fog: '#ffd9b8' },
  night: { sky: ['#141d46', '#3c4f8f'], sea: '#24508e', hemi: ['#8ea2ff', '#2a3044', .95], sun: ['#a9bcff', .9], light: 1, fog: '#34477f' },
};
const ARRIVE_LINES = {
  dining: ['開飯囉！大家點菜！', '聞起來好香～', '先拍食物再開動！'],
  sight: ['到了！大家集合拍照！', '哇～比照片還壯觀！', '旗子舉高，來張團體照！'],
  transport: ['車站到了，票拿好！', '準備出發去下一座城市！'],
  shop: ['來看看伴手禮！', '買買買！清單拿出來！'],
};
const COIN_KEY = 'spain-passport';

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
          <button class="wbtn round" data-w="music" aria-label="背景音樂"></button>
          <button class="wbtn round" data-w="night" aria-label="白天／夜晚"></button>
          <button class="wbtn round" data-w="photo" aria-label="拍紀念照">📷</button>
          <button class="wbtn round" data-w="party" aria-label="回到隊伍">⌖</button>
          <button class="wbtn round" data-w="overview" aria-label="看全地圖">🗺️</button>
        </div>
      </header>
      <nav class="world-cities" aria-label="城市"></nav>
      <div class="world-status"><span class="ws-coins" title="收集的金幣">🪙 0</span><span class="ws-weather" hidden></span></div>
      <section class="world-quest" aria-live="polite"></section>
      <div class="world-ride" hidden></div>
      <div class="world-banner" hidden></div>
      <div class="world-stamp" hidden></div>
      <aside class="world-card" hidden aria-live="polite"></aside>
      <div class="world-photo" hidden></div>
      <div class="world-title" hidden></div>
      <div class="world-loading"><div class="world-spinner"></div><p>正在搭建西班牙小鎮…</p></div>`;
    this.$ = s => this.root.querySelector(s);
    this.root.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (b && this.root.contains(b)) this.command(b); });
    this.visited = new Set();
    this.questIndex = 0;
    this.token = 0;
    this.nightMode = 'auto';
    this.cardKey = null;
    try { this.passport = new Set(JSON.parse(localStorage.getItem(COIN_KEY) || '[]')); } catch { this.passport = new Set(); }
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
    this.resize(); this.start(); this.refresh(true);
    this.renderer.render(this.scene, this.camera);
    console.info(`[world] ${this.renderer.info.render.triangles} triangles, ${this.renderer.info.render.calls} draw calls`);
    let shown = false;
    try { shown = sessionStorage.getItem('spain-title') === '1'; } catch {}
    if (!shown) this.showTitle(); else this.controls.flyTo(this.party.position.x, this.party.position.z, 70);
    this.loadWeather();
    if (music.on) music.set(true);
  }

  // ---------------------------------------------------------------- scene
  build() {
    const canvas = this.$('.world-canvas');
    const coarse = matchMedia('(pointer: coarse)').matches;
    const renderer = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2);
    renderer.setPixelRatio(this.pixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = this.scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#cdeeff', 200, 900);
    this.camera = new THREE.PerspectiveCamera(30, 1, 1, 2400);
    const gradient = this.gradient = toonGradient([120, 200, 255]);
    setPartyGradient(gradient);
    this.mats = {
      toon: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient }),
      light: new THREE.MeshBasicMaterial({ vertexColors: true }),
      glass: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradient, transparent: true, opacity: .6, depthWrite: false }),
    };
    this.hemi = new THREE.HemisphereLight('#ffffff', '#88aa66', 1.6);
    scene.add(this.hemi);
    const sun = this.sun = new THREE.DirectionalLight('#fff1d6', 2.5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
    Object.assign(sun.shadow.camera, { left: -55, right: 55, top: 55, bottom: -55, near: 1, far: 260 });
    sun.shadow.bias = -.0008; sun.shadow.normalBias = .04;
    scene.add(sun, sun.target);

    const sea = this.sea = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000), new THREE.MeshToonMaterial({ color: '#45bdf0', gradientMap: gradient }));
    sea.rotation.x = -Math.PI / 2; sea.position.y = -2.6; sea.receiveShadow = true;
    scene.add(sea);

    this.layout = worldLayout();
    this.names = this.placeNames();
    this.mounds = this.makeMounds();
    this.heightAt = (x, z) => { let h = 0; for (const m of this.mounds) { const d = Math.hypot(x - m.x, z - m.z); if (d < m.rb) h = Math.max(h, d <= m.rt ? m.h : m.h * (1 - smooth((d - m.rt) / (m.rb - m.rt)))); } return h; };

    this.nav = {}; this.roads = {}; this.rivers = []; this.bridgeAt = [];
    this.proxies = [];
    this.foams = [];
    this.buildMainland();
    for (const block of Object.values(BLOCKS)) buildCity(this, block);
    for (const it of this.layout.items) {
      const proxy = new THREE.Mesh(new THREE.CylinderGeometry(it.r * .95, it.r * .95, it.h, 10), new THREE.MeshBasicMaterial({ visible: false }));
      proxy.position.set(it.x, it.y + it.h / 2, it.z); proxy.userData.key = it.key;
      scene.add(proxy); this.proxies.push(proxy);
    }
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
    // ambient life
    this.traffic = new Traffic(scene, this.mats, Object.values(this.roads).flat(), this.heightAt);
    const bcn = BLOCKS.barcelona, coast = bcn.poly.filter(p => p.x > bcn.cx + 8 && p.z > bcn.cz - 6);
    const off = (p, k) => ({ x: p.x + (p.x - bcn.cx) / Math.hypot(p.x - bcn.cx, p.z - bcn.cz) * k, z: p.z + (p.z - bcn.cz) / Math.hypot(p.x - bcn.cx, p.z - bcn.cz) * k });
    const boatRoutes = [];
    if (coast.length > 3) { boatRoutes.push({ kind: 'sail', pts: [...coast.map(p => off(p, 9)), ...coast.slice().reverse().map(p => off(p, 15))], speed: 2.4 }); boatRoutes.push({ kind: 'sail', color: '#ffd23f', pts: [...coast.map(p => off(p, 20)), ...coast.slice().reverse().map(p => off(p, 26))], speed: 3 }); boatRoutes.push({ kind: 'ferry', color: '#ff5a5f', pts: [off(coast[0], 30), { x: bcn.cx + 120, z: bcn.cz + 60 }, off(coast[coast.length - 1], 30)], speed: 5 }); }
    for (const r of this.rivers.filter(r => r.city === 'sevilla' && r.pts.length > 6)) boatRoutes.push({ kind: 'ferry', color: '#2d6fa8', pts: [...r.pts, ...r.pts.slice().reverse()], speed: 1.6, y: .08 });
    this.boats = new Boats(scene, this.mats, boatRoutes);
    this.birds = new Birds(scene, [{ x: bcn.cx + bcn.R * .7, z: bcn.cz + bcn.R * .4, y: 12, r: 14 }, { x: bcn.cx + bcn.R, z: bcn.cz - 10, y: 14, r: 10 }, { x: BLOCKS.sevilla.cx - 10, z: BLOCKS.sevilla.cz, y: 11, r: 9 }]);
    this.precip = new Precipitation(scene);
    this.fireworks = new Fireworks(scene);
    const fw = this.layout.byKey.get('barcelona|MNAC') || this.layout.byKey.get('barcelona|Plaça d’Espanya');
    if (fw) this.fireworks.at = { x: fw.x, z: fw.z };
    this.coins = new Coins(scene, this.coinSpots());

    const xs = [-200, 340], zs = [-160, 200];
    this.controls = new DioramaCamera(this.camera, canvas, {
      onTap: (x, y) => this.tap(x, y),
      bounds: { minX: xs[0], maxX: xs[1], minZ: zs[0], maxZ: zs[1] },
    });
    this.controls.maxDist = 640;
    this.controls.flyTo(BLOCKS.madrid.cx, BLOCKS.madrid.cz, 260); this.controls.update(1);
    this.buildLabels();
    this.$('.world-cities').innerHTML = [...CITY_ORDER, 'tpe'].map(id => `<button class="wchip" data-w="city" data-city="${id}" style="--c:${BLOCKS[id].accent}">${BLOCKS[id].name}</button>`).join('');
    this.raycaster = new THREE.Raycaster();
    this.clock = new THREE.Clock(); this.time = 0;
    new ResizeObserver(() => this.resize()).observe(this.root);
    this.applyPalette();
    this.updateTools();
    this.updateCoins();
  }

  // The Iberian Peninsula as a flat painted map under the city islands.
  buildMainland() {
    const b = new Batch();
    const R = rng('mainland');
    const covered = (x, z, pad = 2) => Object.values(BLOCKS).some(bl => insideBlock(bl, x, z, -pad));
    for (const ring of SPAIN_BORDER) {
      const s = new THREE.Shape();
      ring.forEach(([lo, la], i) => { const p = mapXY(la, lo); i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z); });
      b.extrude(s, .5, '#eadfb4', { rx: -Math.PI / 2, y: -2.55 });
    }
    for (const ring of PROVINCES) for (let i = 0; i + 1 < ring.length; i++) {
      const a = mapXY(ring[i][1], ring[i][0]), c = mapXY(ring[i + 1][1], ring[i + 1][0]);
      const len = Math.hypot(c.x - a.x, c.z - a.z); if (len < .05) continue;
      b.box(.22, .05, len, '#d3c493', { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2, y: -2.05, ry: Math.atan2(c.x - a.x, c.z - a.z) });
    }
    for (const r of MAP_RIVERS) for (let i = 0; i + 1 < r.pts.length; i++) {
      const a = mapXY(...r.pts[i]), c = mapXY(...r.pts[i + 1]), len = Math.hypot(c.x - a.x, c.z - a.z);
      const m = { x: (a.x + c.x) / 2, z: (a.z + c.z) / 2 }; if (covered(m.x, m.z)) continue;
      b.box(1.2, .06, len + .6, '#5ec2f2', { x: m.x, z: m.z, y: -2.04, ry: Math.atan2(c.x - a.x, c.z - a.z) });
    }
    for (const mtn of MAP_MOUNTAINS) for (let i = 0; i < mtn.n; i++) {
      const [sla, slo] = mtn.spread || [.5, .9];
      const p = mapXY(mtn.at[0] + (R() - .5) * sla, mtn.at[1] + (i / Math.max(1, mtn.n - 1) - .5) * slo * 2 + (R() - .5) * .3);
      if (covered(p.x, p.z, 4)) continue;
      const h = mtn.h * (.7 + R() * .5), r = h * .75;
      b.cone(r, h, '#a99a7f', { x: p.x, z: p.z, y: -2.05 }, 7);
      if (mtn.snow) b.cone(r * .42, h * .42, '#ffffff', { x: p.x, z: p.z, y: -2.05 + h * .58 }, 7);
    }
    // olive groves of Andalucía and La Mancha's windmills
    for (let i = 0; i < 260; i++) {
      const la = 37.35 + R() * .9, lo = -5.1 + R() * 2.1, p = mapXY(la, lo);
      if (covered(p.x, p.z, 3)) continue;
      b.sphere(.55, R() > .5 ? '#6f9a4a' : '#7fa858', { x: p.x, z: p.z, y: -1.8, sy: .8 }, 6);
    }
    for (let i = 0; i < 5; i++) {
      const p = mapXY(39.45 + (R() - .5) * .25, -3.61 + i * .12);
      b.group({ x: p.x, z: p.z, y: -2.05, s: 1.4 }, g => { g.cyl(.55, .7, 2.2, '#ffffff', {}, 10); g.cone(.75, .9, '#5a4a6a', { y: 2.2 }, 10); for (let k = 0; k < 4; k++) g.box(.2, 1.9, .05, '#8a6a4a', { y: 2.3, z: .7, rz: k * Math.PI / 2 + .3 }); });
    }
    // land routes: rails and road between islands
    this.landRoutes = {};
    for (const c of this.layout.connectors.filter(c => c.mode !== 'plane')) {
      const pts = ROUTES[c.id].map(([la, lo]) => mapXY(la, lo)).filter(p => !covered(p.x, p.z, 1));
      const from = portPoint(c.a, c.b), to = portPoint(c.b, c.a);
      const out = (p, bl) => { const blk = BLOCKS[bl], dx = p.x - blk.cx, dz = p.z - blk.cz, L = Math.hypot(dx, dz) || 1; return { x: p.x + dx / L * 5, z: p.z + dz / L * 5 }; };
      const path = [out(from, c.a), ...pts, out(to, c.b)];
      this.landRoutes[c.id] = { from, to, path };
      for (let i = 0; i + 1 < path.length; i++) {
        const a = path[i], e = path[i + 1], len = Math.hypot(e.x - a.x, e.z - a.z), ang = Math.atan2(e.x - a.x, e.z - a.z), m = { x: (a.x + e.x) / 2, z: (a.z + e.z) / 2 };
        b.group({ x: m.x, z: m.z, y: -2.05, ry: ang }, g => {
          g.box(2.4, .12, len + .4, c.mode === 'train' ? '#c9b79a' : '#7d7f8c');
          if (c.mode === 'train') { for (let k = -len / 2; k < len / 2; k += 1) g.box(1.8, .06, .25, C.wood, { z: k, y: .12 }); g.box(.1, .1, len + .4, '#5b5f6f', { x: -.5, y: .16 }); g.box(.1, .1, len + .4, '#5b5f6f', { x: .5, y: .16 }); }
          else for (let k = -len / 2; k < len / 2; k += 2.2) g.box(.14, .04, 1, C.yellow, { z: k, y: .14 });
        });
      }
      for (const [p, q] of [[from, path[0]], [to, path[path.length - 1]]]) {
        const len = Math.hypot(q.x - p.x, q.z - p.z), ang = Math.atan2(q.x - p.x, q.z - p.z);
        b.group({ x: (p.x + q.x) / 2, z: (p.z + q.z) / 2, y: -1.05, ry: ang, rx: Math.atan2(2, len) }, g => g.box(2.4, .3, len + 1, c.mode === 'train' ? '#c9b79a' : '#7d7f8c'));
      }
    }
    const g = b.build(this.mats);
    g.traverse(o => { o.castShadow = false; });
    this.scene.add(g);
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
    for (const [key, d] of Object.entries(DECOR)) names.set(key, { zh: d.zh, en: d.en, category: '城市地標', decor: true });
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
      list.push({ city, x, z, h, rt, rb: rt + 4.5, color: city === 'granada' ? '#c7a173' : undefined });
    };
    cluster('granada', ['granada|Alhambra / Alcazaba', 'granada|Alhambra / Palacios Nazaríes', 'granada|Alhambra / Partal', 'granada|Alhambra / Generalife'], 2.4, .5);
    cluster('granada', ['granada|Mirador de San Nicolás'], 1.7, .8);
    cluster('barcelona', ['barcelona|Park Güell'], 1.6, .4);
    for (const city of Object.values(CITIES)) for (const hill of city.hills) {
      const p = project(city.id, ...hill.at), r = hill.r * scaleAt(city.id, ...hill.at, hill.r);
      if (list.some(m => Math.hypot(m.x - p.x, m.z - p.z) < Math.max(m.rt, r * .5))) continue;
      list.push({ city: city.id, x: p.x, z: p.z, h: hill.h, rt: r * .35, rb: Math.max(4, r) });
    }
    return list;
  }

  coinSpots() {
    const spots = [];
    for (const block of Object.values(BLOCKS)) {
      const R = rng('coins-' + block.id), nav = this.nav[block.id], want = block.id === 'tpe' ? 3 : block.id === 'barcelona' || block.id === 'madrid' ? 10 : 8;
      let tries = 0;
      while (spots.filter(s => s.city === block.id).length < want && tries++ < 600) {
        const x = block.minX + R() * (block.maxX - block.minX), z = block.minZ + R() * (block.maxZ - block.minZ);
        if (!nav.isFree(x, z) || !insideBlock(block, x, z, 2.5)) continue;
        if (spots.some(s => Math.hypot(s.x - x, s.z - z) < 7)) continue;
        spots.push({ id: `${block.id}-${spots.length}`, city: block.id, x, z, y: this.heightAt(x, z) });
      }
    }
    return spots;
  }

  buildLinks() {
    const b = new Batch();
    for (const c of this.layout.connectors.filter(c => c.mode === 'plane')) {
      const a = this.layout.byKey.get(c.stations[0]), z = this.layout.byKey.get(c.stations[1]);
      if (!a || !z) continue;
      const pts = this.flightCurve(a, z).getSpacedPoints(Math.round(Math.hypot(a.x - z.x, a.z - z.z) / 3.4));
      for (const p of pts.slice(2, -2)) b.sphere(.24, '#ffffff', { x: p.x, y: p.y, z: p.z }, 6, 'light');
    }
    for (const block of Object.values(BLOCKS)) for (const islet of block.islets) if (islet.bridge) {
      const { a, b: e, w } = islet.bridge, len = Math.hypot(e.x - a.x, e.z - a.z), ang = Math.atan2(e.x - a.x, e.z - a.z);
      b.group({ x: (a.x + e.x) / 2, z: (a.z + e.z) / 2, ry: ang }, g => {
        g.box(w, .4, len, '#c9b79a', { y: -.35 }); g.box(.15, .5, len, C.white, { x: w / 2, y: -.05 }); g.box(.15, .5, len, C.white, { x: -w / 2, y: -.05 });
        for (let k = -len / 2; k <= len / 2; k += 5) g.box(1, 2.4, 1, '#d8c6a6', { z: k, y: -2.6 });
      });
    }
    this.scene.add(b.build(this.mats));
  }

  flightCurve(a, z) {
    const dx = z.x - a.x, dz = z.z - a.z, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, peak = 10 + d * .12;
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(a.x - ux * 2, 1, a.z + 3.4 - uz * 2), new THREE.Vector3(a.x + ux * 6, 3, a.z + uz * 6 + 3),
      new THREE.Vector3(a.x + dx / 2, peak, a.z + dz / 2), new THREE.Vector3(z.x - ux * 6, 3, z.z - uz * 6 + 3), new THREE.Vector3(z.x + ux * 1, 1, z.z + 3.4 + uz),
    ], false, 'centripetal');
  }

  buildClouds() {
    const b = new Batch(), R = rng(42);
    for (let i = 0, made = 0; i < 200 && made < 22; i++) {
      const x = -220 + R() * 580, z = -180 + R() * 400, y = 34 + R() * 10;
      if (Object.values(BLOCKS).some(bl => Math.abs(x - bl.cx) < bl.R + 18 && Math.abs(z - bl.cz) < bl.R + 18)) continue;
      made++;
      for (let k = 0; k < 5; k++) b.sphere(2.6 + R() * 2.4, '#ffffff', { x: x + (k - 2) * 2.8, y: y + (k % 2) * 1.2, z: z + (R() - .5) * 2.6, sy: .62 }, 10);
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
      const kind = it.decor ? 'decor' : it.souvenir ? 'souvenir' : it.transport ? 'shop' : (it.r >= 3.6 ? 'landmark' : 'shop');
      el.className = `wl ${kind}`;
      el.innerHTML = `<span class="wl-num"></span><b>${esc(n?.zh || it.key)}</b><i class="wl-star">★</i>`;
      el.dataset.key = it.key;
      el.addEventListener('click', e => { e.stopPropagation(); sfx.play('select'); this.goToPlace(it.key); });
      host.append(el);
      this.labels.push({ el, it, kind, pos: new THREE.Vector3(it.x, (it.y || 0) + (it.h || 6) + .8, it.z), num: el.firstChild });
    }
    for (const id of [...CITY_ORDER, 'tpe']) {
      const blk = BLOCKS[id], el = document.createElement('div');
      el.className = 'wl city'; el.style.setProperty('--c', blk.accent);
      el.innerHTML = `<b>${blk.name}</b><small>${blk.en}</small>`;
      el.addEventListener('click', e => { e.stopPropagation(); this.flyCity(id); });
      host.append(el);
      this.labels.push({ el, city: id, pos: new THREE.Vector3(blk.cx, 18, blk.cz) });
    }
    this.tags = PARTY.map((m, i) => { const el = document.createElement('div'); el.className = 'wtag'; el.textContent = m.name; el.style.setProperty('--c', m.shirt); host.append(el); return { el, member: this.party.members[i] }; });
  }

  // ---------------------------------------------------------------- loop
  start() {
    if (this.running) return;
    this.running = true; this.clock.getDelta();
    this.perf = { frames: 0, time: 0, checked: false };
    const frame = () => {
      if (!this.running) return;
      requestAnimationFrame(frame);
      if (document.hidden) return;
      const raw = this.clock.getDelta(), dt = Math.min(.05, raw);
      this.time += dt;
      this.tick(dt, this.time);
      this.adapt(raw);
    };
    requestAnimationFrame(frame);
  }
  // Drop resolution on slow phones so the world stays smooth.
  adapt(raw) {
    const p = this.perf; if (p.checked) return;
    p.frames++; p.time += raw;
    if (p.time > 3) {
      p.checked = true;
      const fps = p.frames / p.time;
      if (fps < 32 && this.pixelRatio > 1) { this.pixelRatio = 1; this.renderer.setPixelRatio(1); this.resize(); console.info('[world] low fps, pixel ratio 1'); }
    }
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
    const tg = this.controls.target, dist = this.controls.dist;
    this.sun.position.set(tg.x + 30, 60, tg.z + 22); this.sun.target.position.set(tg.x, 0, tg.z);
    const s = Math.min(95, Math.max(40, dist * .75));
    const sc = this.sun.shadow.camera; if (sc.right !== s) { sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.updateProjectionMatrix(); }
    this.scene.fog.near = dist * 1.5; this.scene.fog.far = dist * 4.2;
    this.clouds.position.x = ((t * 1.2) % 300) - 60;
    this.foams.forEach((f, i) => { f.material.opacity = .3 + Math.sin(t * 1.4 + i) * .1; });
    if (this.markerItem) {
      const it = this.markerItem;
      this.marker.visible = true;
      this.marker.position.set(it.x, it.y + it.h + 1.4 + Math.abs(Math.sin(t * 3)) * .9, it.z);
      this.marker.rotation.y = t * 2;
      const d = doorPoint(it);
      this.ring.visible = true; this.ring.position.set(d.x, this.heightAt(d.x, d.z) + .1, d.z);
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
    const near = dist < 260;
    this.traffic.cars.visible = this.traffic.peds.visible = near;
    if (near) this.traffic.update(dt, t);
    this.boats.update(dt, t);
    this.birds.update(dt, t);
    this.precip.update(dt, t, tg);
    this.fireworks.update(dt);
    this.coins.update(dt, t, this.party.group.visible ? this.party.position : null, c => this.collectCoin(c));
    this.watchRegion();
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
  }
  updateLabels() {
    const w = this.root.clientWidth, h = this.root.clientHeight, dist = this.controls.dist, v = new THREE.Vector3();
    const showLandmarks = dist < 110, showShops = dist < 48, showDecor = dist < 80, showCities = dist > 170;
    for (const L of this.labels) {
      let show;
      if (L.city) show = showCities;
      else show = L.route || (L.kind === 'souvenir' ? dist < 75 : L.kind === 'decor' ? showDecor : L.kind === 'landmark' ? showLandmarks : showShops) || (L.star && dist < 75);
      if (show) {
        v.copy(L.pos).project(this.camera);
        if (v.z > 1 || Math.abs(v.x) > 1.15 || Math.abs(v.y) > 1.15) show = false;
        else L.el.style.transform = `translate3d(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px,0) translate(-50%,-100%)`;
      }
      if (L.shown !== show) { L.el.classList.toggle('on', !!show); L.shown = show; }
    }
    const tagsOn = dist < 46 && this.party.group.visible;
    for (const T of this.tags) {
      let show = tagsOn;
      if (show) { const p = T.member.root.position; v.set(p.x, p.y + 2.5 * T.member.def.scale, p.z).project(this.camera); if (v.z > 1) show = false; else T.el.style.transform = `translate3d(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px,0) translate(-50%,-100%)`; }
      if (T.shown !== show) { T.el.classList.toggle('on', show); T.shown = show; }
    }
    if (this.bubble) {
      const p = this.bubble.member.root.position;
      v.set(p.x, p.y + 3.2, p.z).project(this.camera);
      const el = this.$('.world-bubble');
      el.style.transform = `translate3d(${((v.x + 1) / 2 * w).toFixed(1)}px,${((1 - v.y) / 2 * h).toFixed(1)}px,0) translate(-50%,-100%)`;
      if (performance.now() > this.bubble.until) { el.hidden = true; this.bubble = null; }
    }
  }

  // Zelda-style region name card when the camera arrives over another city.
  watchRegion() {
    if (this.controls.dist > 140) { this.region = null; return; }
    const tg = this.controls.target, blk = blockAt(tg.x, tg.z, -6);
    if (!blk || blk.id === this.region) return;
    this.region = blk.id;
    this.updateWeatherChip();
    if (!this.introDone) { this.introDone = true; return; }
    const el = this.$('.world-banner');
    const day = this.ctx.getTrip().days.filter(d => d.city.includes(blk.name.slice(0, 2)));
    el.innerHTML = `<small>¡Bienvenidos a!</small><b>${esc(blk.name)}</b><span>${esc(blk.en)}${day.length ? ` · ${day.length} 天` : ''}</span>`;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(this.bannerTimer); this.bannerTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }
  passportStamp(cityId) {
    if (this.passport.has(cityId) || !BLOCKS[cityId]) return;
    this.passport.add(cityId);
    try { localStorage.setItem(COIN_KEY, JSON.stringify([...this.passport])); } catch {}
    const blk = BLOCKS[cityId], el = this.$('.world-stamp');
    el.innerHTML = `<div style="--c:${blk.accent}"><small>PASSPORT · 入境章</small><b>${esc(blk.en)}</b><span>${esc(blk.name)}</span><em>${new Date().toLocaleDateString('zh-TW')}</em></div>`;
    el.hidden = false; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    sfx.play('stamp'); navigator.vibrate?.(30);
    setTimeout(() => { el.hidden = true; }, 2400);
  }
  collectCoin() {
    sfx.play('coin'); navigator.vibrate?.(12);
    this.updateCoins();
    if (this.coins.mapCount === this.coins.total) this.ctx.toast?.('🏆 全部金幣收集完成！你們是真正的探險家！');
  }
  updateCoins() { this.$('.ws-coins').textContent = `🪙 ${this.coins.count}`; this.$('.ws-coins').title = `地圖金幣 ${this.coins.mapCount}/${this.coins.total}，問答也能賺金幣`; }
  async loadWeather() {
    this.weather = await fetchWeather({ madrid: CITIES.madrid.center, sevilla: CITIES.sevilla.center, granada: CITIES.granada.center, barcelona: CITIES.barcelona.center });
    this.updateWeatherChip();
  }
  updateWeatherChip() {
    const el = this.$('.ws-weather'), w = this.weather?.[this.region];
    if (!w) { el.hidden = true; this.precip.set(null); return; }
    const [icon, text] = weatherLabel(w.code);
    el.textContent = `${icon} ${w.temp}° ${BLOCKS[this.region].name}現在${text}`; el.hidden = false;
    this.precip.set(precipKind(w.code));
  }

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
    this.controls.flyTo(d.x, d.z, first ? null : (this.controls.portrait ? 72 : 80), 0);
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
    this.$('[data-w="music"]').textContent = music.on ? '🎵' : '🎶';
    this.$('[data-w="music"]').classList.toggle('off', !music.on);
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
    this.scene.fog.color.set(p.fog);
    this.fireworks.active = mode === 'night' && ['2026-12-31', '2027-01-01'].includes(this.date);
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
    else if (w === 'overview') { const portrait = this.root.clientWidth < this.root.clientHeight; this.controls.flyTo(portrait ? 30 : 60, portrait ? 25 : 30, portrait ? 610 : 420, portrait ? -Math.PI / 2 : 0); sfx.play('whoosh'); }
    else if (w === 'music') { music.set(!music.on); this.updateTools(); }
    else if (w === 'photo') this.takePhoto();
    else if (w === 'photo-close') { this.$('.world-photo').hidden = true; this.root.classList.remove('photo-mode'); }
    else if (w === 'photo-share') this.sharePhoto();
    else if (w === 'quiz') this.answerQuiz(btn.dataset.key, +btn.dataset.i);
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
    this.controls.flyTo(b.cx, b.cz + 2, b.R * (this.controls.portrait ? 3.2 : 2.3), 0);
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
    member.talks = (member.talks || 0) + 1;
    const text = member.talks % 3 === 2 ? (next ? `下一站：${this.names.get(next.key)?.zh || next.title}（${next.time}）` : `今天：${this.day.title}`) : member.def.lines[member.talks % member.def.lines.length];
    this.say(member, text);
  }
  say(member, text, ms = 3200) {
    const el = this.$('.world-bubble');
    el.innerHTML = `<strong>${esc(member.def.name)}${member.def.flag ? ' 🚩' : ''}</strong><span>${esc(text)}</span>`;
    el.hidden = false;
    this.bubble = { member, until: performance.now() + ms };
  }

  async goToPlace(key) {
    const item = this.layout.byKey.get(key); if (!item) return;
    this.closeCard();
    const door = doorPoint(item);
    const ok = await this.travel(item.city, door);
    if (!ok) return;
    this.party.leader.facing = Math.PI; this.party.members.forEach(m => { m.facing = Math.PI; });
    this.party.celebrate(); sfx.play('arrive'); navigator.vibrate?.(20);
    const cat = this.names.get(key)?.category || '', kind = item.transport ? 'transport' : item.souvenir ? 'shop' : /餐|甜點|酒|早|午|晚|採買/.test(cat) ? 'dining' : 'sight';
    const lines = ARRIVE_LINES[kind], who = kind === 'dining' ? this.party.members[2] : kind === 'shop' ? this.party.members[3] : kind === 'sight' ? this.party.members[1] : this.party.leader;
    this.say(who, lines[Math.floor(Math.random() * lines.length)], 2600);
    if (item.r >= 4.5) { this.controls.goalYaw += .3; this.controls.goalDist = Math.min(this.controls.goalDist, 46); }
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
      const lr = this.landRoutes[conn.id];
      const mid = (forward ? lr.path : lr.path.slice().reverse()).map(p => new THREE.Vector3(p.x, -1.75, p.z));
      const pa = forward ? lr.from : lr.to, pb = forward ? lr.to : lr.from;
      curve = new THREE.CatmullRomCurve3([new THREE.Vector3(a.x, .25, a.z), new THREE.Vector3(pa.x, .25, pa.z), ...mid, new THREE.Vector3(pb.x, .25, pb.z), new THREE.Vector3(z.x, .25, z.z)], false, 'centripetal');
    }
    const vehicle = this.vehicles[conn.mode];
    const duration = (conn.mode === 'plane' ? 4.4 : 4.2) * (quick ? .7 : 1);
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
        if (ok) { const d = doorPoint(z); this.party.place(d.x, d.z, Math.PI); this.partyCity = cb; this.controls.follow = this.party.position; sfx.play('jump'); this.party.celebrate(); setTimeout(() => this.passportStamp(cb), 300); }
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
        this.controls.goalDist = Math.max(this.controls.goalDist, conn.mode === 'plane' ? 90 : 70);
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
      <div class="wc-body">${DECOR[key] ? `<p class="wc-desc">${esc(DECOR[key].desc)}</p>` : ''}${this.quizHtml(key)}${this.ctx.placeCard(key, { decor: !!DECOR[key], en: n.en })}</div>`;
    card.hidden = false;
    if (animate) { card.classList.remove('pop'); void card.offsetWidth; card.classList.add('pop'); }
  }
  quizHtml(key) {
    const q = QUIZ[key]; if (!q) return '';
    let done = {}; try { done = JSON.parse(localStorage.getItem('spain-quiz') || '{}'); } catch {}
    const ans = done[key];
    return `<section class="wc-quiz"><h3>🧠 小知識問答 <small>答對 +3 🪙</small></h3><p>${esc(q.q)}</p><div class="wc-quiz-opts">${q.o.map((o, i) => `<button class="wbtn ${ans !== undefined ? (i === q.a ? 'right' : i === ans ? 'wrong' : '') : ''}" ${ans !== undefined ? 'disabled' : ''} data-w="quiz" data-key="${esc(key)}" data-i="${i}">${esc(o)}</button>`).join('')}</div>${ans !== undefined ? `<p class="wc-quiz-fact">${ans === q.a ? '✅ 答對了！' : '❌ 差一點！'}${esc(q.f)}</p>` : ''}</section>`;
  }
  answerQuiz(key, i) {
    const q = QUIZ[key]; if (!q) return;
    let done = {}; try { done = JSON.parse(localStorage.getItem('spain-quiz') || '{}'); } catch {}
    if (done[key] !== undefined) return;
    done[key] = i; try { localStorage.setItem('spain-quiz', JSON.stringify(done)); } catch {}
    if (i === q.a) { sfx.play('levelup'); for (let k = 0; k < 3; k++) this.coins.got.add(`quiz-${key}-${k}`); try { localStorage.setItem('spain-coins', JSON.stringify([...this.coins.got])); } catch {} this.updateCoins(); this.party.celebrate(); }
    else sfx.play('close');
    this.openCard(key, false);
  }

  // Photo mode: hide the HUD, render a crisp frame and stamp it like a postcard.
  takePhoto() {
    this.closeCard();
    this.root.classList.add('photo-mode');
    sfx.play('stamp');
    requestAnimationFrame(() => {
      this.renderer.render(this.scene, this.camera);
      const src = this.renderer.domElement, out = document.createElement('canvas');
      out.width = src.width; out.height = src.height;
      const g = out.getContext('2d');
      const sky = g.createLinearGradient(0, 0, 0, out.height);
      const cs = getComputedStyle(this.root); sky.addColorStop(0, cs.getPropertyValue('--sky1').trim() || '#62c6ff'); sky.addColorStop(.7, cs.getPropertyValue('--sky2').trim() || '#d6f3ff');
      g.fillStyle = sky; g.fillRect(0, 0, out.width, out.height);
      g.drawImage(src, 0, 0);
      const k = out.width / 800, pad = 22 * k;
      g.lineWidth = 14 * k; g.strokeStyle = '#fffdf5'; g.strokeRect(7 * k, 7 * k, out.width - 14 * k, out.height - 14 * k);
      const blk = BLOCKS[this.region || this.partyCity] || BLOCKS.madrid, d = new Date(this.day.date + 'T12:00:00Z');
      const title = `¡VAMOS! ${blk.en}`, sub = `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${blk.name} · holyman 西班牙團`;
      g.font = `900 ${34 * k}px "Arial Rounded MT Bold",sans-serif`; const tw = Math.max(g.measureText(title).width, 0);
      g.font = `800 ${16 * k}px "PingFang TC","Noto Sans TC",sans-serif`; const sw = g.measureText(sub).width;
      const bw = Math.max(tw, sw) + pad * 2, bh = 80 * k, by = out.height - bh - 28 * k;
      g.fillStyle = 'rgba(255,253,245,.95)'; g.strokeStyle = '#2b2433'; g.lineWidth = 4 * k;
      g.beginPath(); g.roundRect?.(24 * k, by, bw, bh, 18 * k); g.fill(); g.stroke();
      g.fillStyle = blk.accent; g.font = `900 ${34 * k}px "Arial Rounded MT Bold",sans-serif`; g.textBaseline = 'top';
      g.lineWidth = 6 * k; g.strokeText(title, 24 * k + pad, by + 10 * k); g.fillText(title, 24 * k + pad, by + 10 * k);
      g.fillStyle = '#2b2433'; g.font = `800 ${16 * k}px "PingFang TC","Noto Sans TC",sans-serif`; g.fillText(sub, 24 * k + pad, by + 50 * k);
      out.toBlob(blob => {
        this.photoBlob = blob;
        const url = URL.createObjectURL(blob);
        const el = this.$('.world-photo');
        el.innerHTML = `<div class="wp-inner"><img src="${url}" alt="冒險紀念照"><div class="wp-actions"><a class="wbtn go" href="${url}" download="spain-adventure-${this.day.date}.png">儲存照片</a>${navigator.canShare ? '<button class="wbtn" data-w="photo-share">分享</button>' : ''}<button class="wbtn" data-w="photo-close">關閉</button></div></div>`;
        el.hidden = false;
      }, 'image/png');
    });
  }
  async sharePhoto() {
    const file = new File([this.photoBlob], 'spain-adventure.png', { type: 'image/png' });
    try { if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: '西班牙大冒險' }); } catch {}
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
      <p>2026.12.23 – 2027.01.04 · holyman 西班牙團</p>
      <div class="wt-party">${PARTY.map(m => `<span class="wt-face ${m.id}" style="--shirt:${m.shirt};--skin:${m.skin};;--hair:${m.hood || m.hair}" title="${esc(m.name)}"><i></i><b>${esc(m.name)}</b></span>`).join('')}</div>
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
    this.controls.flyTo(this.party.position.x, this.party.position.z, 58);
    setTimeout(() => { this.party.celebrate(); this.talk(this.party.leader); }, 1400);
  }
}

function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
function shade(hex, amt) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt))); return '#' + c.getHexString(); }
