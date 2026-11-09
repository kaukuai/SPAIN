// Pure layout maths for the 3D trip world (no WebGL), so it can be unit-tested in Node.
// Islands follow each city's real municipal outline; buildings sit at their real
// (zoomed) positions and are nudged apart only as much as needed to fit.
import { places } from '../map-places.js';
import { CITIES, TAIWAN, DECOR, project, projectPath, chaikin, pointInPolygon, distToPolygonEdge, closestOnPolygon } from './geo.js';

export const CITY_ORDER = ['madrid', 'sevilla', 'granada', 'barcelona'];

export const BLOCKS = {};
for (const id of CITY_ORDER) {
  const c = CITIES[id];
  BLOCKS[id] = { id, name: c.name, en: c.en, top: c.top, side: c.side, accent: c.accent, cx: c.cx, cz: c.cz, R: c.R, poly: chaikin(projectPath(id, c.outline), 2), islets: [] };
}
BLOCKS.tpe = { id: 'tpe', name: TAIWAN.name, en: TAIWAN.en, top: TAIWAN.top, side: TAIWAN.side, accent: TAIWAN.accent, cx: TAIWAN.at.x, cz: TAIWAN.at.z, R: TAIWAN.R, poly: chaikin(projectPath('tpe', TAIWAN.outline), 2), islets: [] };
for (const b of Object.values(BLOCKS)) {
  const xs = b.poly.map(p => p.x), zs = b.poly.map(p => p.z);
  b.minX = Math.min(...xs); b.maxX = Math.max(...xs); b.minZ = Math.min(...zs); b.maxZ = Math.max(...zs);
}

// How the team travels between islands (matches the real tickets in the itinerary).
export const CONNECTORS = [
  { id: 'mad-svq', a: 'madrid', b: 'sevilla', mode: 'train', label: 'AVE 高鐵', stations: ['transport|atocha', 'transport|santa-justa'] },
  { id: 'svq-grx', a: 'sevilla', b: 'granada', mode: 'bus', label: 'ALSA 巴士', stations: ['transport|plaza-armas', 'transport|granada-bus'] },
  { id: 'grx-bcn', a: 'granada', b: 'barcelona', mode: 'plane', label: '國內線班機', stations: ['transport|grx', 'transport|bcn'] },
  { id: 'tpe-mad', a: 'tpe', b: 'madrid', mode: 'plane', label: '國際航班（上海轉機）', stations: ['transport|tpe', 'transport|mad'] },
  { id: 'bcn-tpe', a: 'barcelona', b: 'tpe', mode: 'plane', label: '國際航班（上海轉機）', stations: ['transport|bcn', 'transport|tpe'] },
];

const TRANSPORT_CITY = {
  'transport|tpe': 'tpe', 'transport|pvg': 'tpe', 'transport|mad': 'madrid', 'transport|atocha': 'madrid',
  'transport|santa-justa': 'sevilla', 'transport|plaza-armas': 'sevilla', 'transport|granada-bus': 'granada',
  'transport|grx': 'granada', 'transport|bcn': 'barcelona', 'transport|fgc-guell': 'barcelona', 'transport|fgc-espanya': 'barcelona',
};

// Footprint radius of each model (world units). Everything else is a shop-sized box.
export const SIZES = {
  'madrid|Palacio Real de Madrid': 7.5, 'madrid|Plaza Mayor': 7, 'madrid|Mercado de San Miguel': 4.4, 'madrid|Gran Vía': 5.6,
  'madrid|Puerta de Alcalá': 5, 'madrid|Parque del Retiro': 8, 'madrid|Museo del Prado': 6.5, 'madrid|Plaza de Cibeles': 5.4,
  'madrid|Consejo Superior de Investigaciones Científicas (CSIC)': 5, 'madrid|Supermercado El Corte Inglés': 3.6,
  'sevilla|Plaza de España': 8.4, 'sevilla|Catedral de Sevilla / Giralda': 7, 'sevilla|Real Alcázar de Sevilla': 6.6,
  'sevilla|Iglesia del Salvador': 4.8, 'sevilla|Casa de la Memoria': 3.4,
  'granada|Alhambra / Alcazaba': 4.8, 'granada|Alhambra / Palacios Nazaríes': 5.8, 'granada|Alhambra / Partal': 4.4,
  'granada|Alhambra / Generalife': 6, 'granada|Mirador de San Nicolás': 4.2,
  'barcelona|Basílica de la Sagrada Família': 8.2, 'barcelona|Casa Batlló': 3.8, 'barcelona|Casa Milà / La Pedrera': 4.8,
  'barcelona|Park Güell': 8.4, 'barcelona|Casa Vicens': 3.6, 'barcelona|Recinte Modernista de Sant Pau': 6.6,
  'barcelona|Avinguda de Gaudí': 3.6, 'barcelona|Passeig de Gràcia': 4.8, 'barcelona|Plaça d’Espanya': 6.2,
  'barcelona|Arenas de Barcelona': 4.4, 'barcelona|Port Vell': 6.2, 'barcelona|Platja de la Barceloneta': 7,
  'barcelona|El Born / Santa Maria del Mar': 4.8, 'barcelona|Palau Güell': 3.6, 'barcelona|Museu Picasso': 3.8,
  'barcelona|Mercat de la Boqueria': 4.4, 'barcelona|Cripta de la Colònia Güell': 4.6,
  'transport|atocha': 5.2, 'transport|santa-justa': 4.6, 'transport|plaza-armas': 4, 'transport|granada-bus': 4,
  'transport|mad': 7, 'transport|grx': 6.2, 'transport|bcn': 7, 'transport|tpe': 6, 'transport|pvg': 3.2,
  'transport|fgc-guell': 2.4, 'transport|fgc-espanya': 2.4,
};
export const SHOP_RADIUS = 2.4;

export const souvenirKey = city => `${city}|souvenir`;
export const cityOf = key => TRANSPORT_CITY[key] || key.split('|')[0];

export function insideBlock(block, x, z, margin = 0) {
  if (pointInPolygon(x, z, block.poly) && distToPolygonEdge(x, z, block.poly) >= margin) return true;
  return block.islets.some(i => Math.hypot(x - i.x, z - i.z) <= i.r - margin) || block.islets.some(i => i.bridge && onBridge(i.bridge, x, z, margin));
}
function onBridge(b, x, z, margin) {
  const dx = b.b.x - b.a.x, dz = b.b.z - b.a.z, L = dx * dx + dz * dz || 1e-9;
  const t = ((x - b.a.x) * dx + (z - b.a.z) * dz) / L;
  if (t < 0 || t > 1) return false;
  return Math.hypot(x - (b.a.x + dx * t), z - (b.a.z + dz * t)) <= b.w / 2 - Math.min(margin, b.w / 2 - .2);
}
export function blockAt(x, z, margin = 0) {
  return Object.values(BLOCKS).find(b => insideBlock(b, x, z, margin)) || null;
}

const hash = s => [...s].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);
const onLand = (block, x, z, r) => pointInPolygon(x, z, block.poly) && distToPolygonEdge(x, z, block.poly) >= r + 1;

export function worldLayout(catalog = places) {
  for (const b of Object.values(BLOCKS)) b.islets = [];
  const items = [];
  const add = item => items.push(item);
  for (const [key, place] of Object.entries(catalog)) {
    const city = cityOf(key);
    if (!BLOCKS[city]) continue;
    add({ key, city, r: SIZES[key] || SHOP_RADIUS, coords: Array.isArray(place.coordinates) ? place.coordinates : null, title: place.title || '', transport: key.startsWith('transport|') });
  }
  for (const [key, d] of Object.entries(DECOR)) add({ key, city: cityOf(key), r: d.r, coords: d.at, decor: true });
  for (const city of CITY_ORDER) add({ key: souvenirKey(city), city, r: 2.6, coords: null, souvenir: true });

  for (const id of Object.keys(BLOCKS)) {
    const block = BLOCKS[id];
    const list = items.filter(i => i.city === id);
    for (const item of list) {
      if (item.key === 'transport|pvg') { item.x = block.cx - 30; item.z = block.cz - 26; item.fixed = true; item.satellite = true; continue; }
      if (item.coords) { const p = project(id, ...item.coords); item.x = p.x; item.z = p.z; }
      else { const h = hash(item.key), a = (h % 360) * Math.PI / 180, rr = block.R * (.12 + (h % 5) / 40); item.x = block.cx + Math.cos(a) * rr; item.z = block.cz + Math.sin(a) * rr; }
      if (!onLand(block, item.x, item.z, item.r)) {
        const edge = closestOnPolygon(item.x, item.z, block.poly);
        const outside = !pointInPolygon(item.x, item.z, block.poly);
        if (outside && edge.d > 2.5) { item.satellite = true; item.fixed = true; }
      }
    }
    relax(list, block);
    for (const sat of list.filter(i => i.satellite)) {
      const edge = closestOnPolygon(sat.x, sat.z, block.poly);
      const islet = { x: sat.x, z: sat.z, r: sat.r + 3.2, key: sat.key };
      const gap = Math.hypot(sat.x - edge.x, sat.z - edge.z) - islet.r;
      if (gap > -1) {
        const ux = (sat.x - edge.x) / (edge.d || 1), uz = (sat.z - edge.z) / (edge.d || 1);
        islet.bridge = { a: { x: edge.x - ux * 2, z: edge.z - uz * 2 }, b: { x: sat.x - ux * (islet.r - 1), z: sat.z - uz * (islet.r - 1) }, w: 3 };
      }
      block.islets.push(islet);
    }
  }
  for (const item of items) {
    item.x = +item.x.toFixed(2); item.z = +item.z.toFixed(2);
    item.ry = facing(item);
    delete item.coords;
  }
  const byKey = new Map(items.map(i => [i.key, i]));
  const connectors = CONNECTORS.map(c => ({ ...c, from: portPoint(c.a, c.b), to: portPoint(c.b, c.a) }));
  return { blocks: BLOCKS, items, byKey, connectors };
}

// Where a land route leaves an island towards another city.
export function portPoint(from, to) {
  const a = BLOCKS[from], b = BLOCKS[to];
  const dx = b.cx - a.cx, dz = b.cz - a.cz, L = Math.hypot(dx, dz) || 1;
  let best = a.poly[0], score = -Infinity;
  for (const p of a.poly) { const s = ((p.x - a.cx) * dx + (p.z - a.cz) * dz) / L - Math.abs(((p.x - a.cx) * dz - (p.z - a.cz) * dx) / L) * .6; if (s > score) { score = s; best = p; } }
  return { x: best.x, z: best.z };
}

// Buildings face the default camera (+z) unless their door would end up in the sea.
function facing(item) {
  const block = BLOCKS[item.city];
  const d = item.r * .82 + 1.1;
  for (const ry of [0, Math.PI / 2, -Math.PI / 2, Math.PI]) {
    const x = item.x + Math.sin(ry) * d, z = item.z + Math.cos(ry) * d;
    if (insideBlock(block, x, z, 1)) return ry;
  }
  return 0;
}
export const doorPoint = item => { const d = item.r * .82 + 1.1, ry = item.ry || 0; return { x: item.x + Math.sin(ry) * d, z: item.z + Math.cos(ry) * d }; };

// Push overlapping footprints apart and keep every building on dry land.
function relax(list, block, gap = 1.4) {
  for (let iter = 0; iter < 600; iter++) {
    let moved = false;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      let dx = b.x - a.x, dz = b.z - a.z;
      let d = Math.hypot(dx, dz);
      const need = a.r + b.r + gap;
      if (d >= need) continue;
      if (d < 1e-3) { dx = Math.cos(i + j); dz = Math.sin(i + j); d = 1; }
      const push = (need - d) / 2 + .01, ux = dx / d, uz = dz / d;
      const wa = a.key === 'transport|pvg' ? 0 : b.key === 'transport|pvg' ? 2 : 1, wb = 2 - wa;
      a.x -= ux * push * wa; a.z -= uz * push * wa; b.x += ux * push * wb; b.z += uz * push * wb;
      moved = true;
    }
    for (const it of list) {
      if (it.satellite || onLand(block, it.x, it.z, it.r)) continue;
      const edge = closestOnPolygon(it.x, it.z, block.poly);
      const ix = block.cx - edge.x, iz = block.cz - edge.z, L = Math.hypot(ix, iz) || 1;
      it.x = edge.x + ix / L * (it.r + 1.3); it.z = edge.z + iz / L * (it.r + 1.3);
      moved = true;
    }
    if (!moved) break;
  }
}
