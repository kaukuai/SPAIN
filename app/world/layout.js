// Pure layout maths for the 3D trip world (no WebGL), so it can be unit-tested in Node.
// Real coordinates from map-places.js are squeezed into toy-sized city islands: the
// relative directions stay true, distances are compressed so far stops still fit.
import { places } from '../map-places.js';

export const BLOCKS = {
  madrid:    { id: 'madrid', name: '馬德里', en: 'MADRID', cx: 0, cz: 0, hw: 34, hd: 30, top: '#9fdc6a', side: '#c98b55', accent: '#ffd23f' },
  sevilla:   { id: 'sevilla', name: '塞維亞', en: 'SEVILLA', cx: -84, cz: 64, hw: 29, hd: 26, top: '#b9e07a', side: '#d0915a', accent: '#ff9a3c' },
  granada:   { id: 'granada', name: '格拉納達', en: 'GRANADA', cx: -4, cz: 88, hw: 27, hd: 24, top: '#a6d677', side: '#b97c50', accent: '#e8574a' },
  barcelona: { id: 'barcelona', name: '巴塞隆納', en: 'BARCELONA', cx: 100, cz: -12, hw: 43, hd: 37, top: '#a4dd78', side: '#c48a58', accent: '#3fa7ff' },
  tpe:       { id: 'tpe', name: '台灣', en: 'TAIWAN', cx: 186, cz: -96, hw: 15, hd: 13, top: '#8fd36a', side: '#b8814f', accent: '#ff5a5f' },
};
export const CITY_ORDER = ['madrid', 'sevilla', 'granada', 'barcelona'];

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

// Fixed spots (fraction of half width / half depth) for airports and island ports.
const FIXED = {
  'transport|mad': ['madrid', .66, -.66], 'transport|grx': ['granada', .66, -.5], 'transport|bcn': ['barcelona', -.6, .64],
  'transport|tpe': ['tpe', -.28, .12], 'transport|pvg': ['tpe', .5, -.3],
};

// Footprint radius of each model (world units). Everything else is a shop-sized box.
export const SIZES = {
  'madrid|Palacio Real de Madrid': 8.5, 'madrid|Plaza Mayor': 7.5, 'madrid|Mercado de San Miguel': 4.6, 'madrid|Gran Vía': 6,
  'madrid|Puerta de Alcalá': 5.2, 'madrid|Parque del Retiro': 9, 'madrid|Museo del Prado': 6.8, 'madrid|Plaza de Cibeles': 5.6,
  'madrid|Consejo Superior de Investigaciones Científicas (CSIC)': 5, 'madrid|Supermercado El Corte Inglés': 3.6,
  'sevilla|Plaza de España': 9.5, 'sevilla|Catedral de Sevilla / Giralda': 8, 'sevilla|Real Alcázar de Sevilla': 7.5,
  'sevilla|Iglesia del Salvador': 5, 'sevilla|Casa de la Memoria': 3.6,
  'granada|Alhambra / Alcazaba': 5, 'granada|Alhambra / Palacios Nazaríes': 6, 'granada|Alhambra / Partal': 4.6,
  'granada|Alhambra / Generalife': 6.2, 'granada|Mirador de San Nicolás': 4.4,
  'barcelona|Basílica de la Sagrada Família': 8.5, 'barcelona|Casa Batlló': 4, 'barcelona|Casa Milà / La Pedrera': 5,
  'barcelona|Park Güell': 9, 'barcelona|Casa Vicens': 3.8, 'barcelona|Recinte Modernista de Sant Pau': 7,
  'barcelona|Avinguda de Gaudí': 4, 'barcelona|Passeig de Gràcia': 5.2, 'barcelona|Plaça d’Espanya': 6.5,
  'barcelona|Arenas de Barcelona': 4.6, 'barcelona|Port Vell': 6.5, 'barcelona|Platja de la Barceloneta': 7.5,
  'barcelona|El Born / Santa Maria del Mar': 5, 'barcelona|Palau Güell': 3.8, 'barcelona|Museu Picasso': 4,
  'barcelona|Mercat de la Boqueria': 4.6, 'barcelona|Cripta de la Colònia Güell': 4.8,
  'transport|atocha': 5.4, 'transport|santa-justa': 4.8, 'transport|plaza-armas': 4.2, 'transport|granada-bus': 4.2,
  'transport|mad': 7.5, 'transport|grx': 6.5, 'transport|bcn': 7.5, 'transport|tpe': 6.5, 'transport|pvg': 3.4,
  'transport|fgc-guell': 2.6, 'transport|fgc-espanya': 2.6,
};
export const SHOP_RADIUS = 2.5;

export const souvenirKey = city => `${city}|souvenir`;
export const cityOf = key => TRANSPORT_CITY[key] || key.split('|')[0];

export function portPoint(from, to, inset = 0) {
  const a = BLOCKS[from], b = BLOCKS[to];
  const dx = b.cx - a.cx, dz = b.cz - a.cz, len = Math.hypot(dx, dz) || 1;
  const ux = dx / len, uz = dz / len;
  const t = Math.min(a.hw / Math.abs(ux || 1e-6), a.hd / Math.abs(uz || 1e-6));
  return { x: a.cx + ux * (t - inset), z: a.cz + uz * (t - inset) };
}

export function insideBlock(block, x, z, margin = 0) {
  return Math.abs(x - block.cx) <= block.hw - margin && Math.abs(z - block.cz) <= block.hd - margin;
}

export function blockAt(x, z, margin = 0) {
  return Object.values(BLOCKS).find(b => insideBlock(b, x, z, margin)) || null;
}

const hash = s => [...s].reduce((a, c) => (a * 33 + c.charCodeAt(0)) >>> 0, 5381);

export function worldLayout(catalog = places) {
  const items = [];
  const byCity = new Map();
  const add = item => { items.push(item); if (!byCity.has(item.city)) byCity.set(item.city, []); byCity.get(item.city).push(item); };
  for (const [key, place] of Object.entries(catalog)) {
    const city = cityOf(key);
    if (!BLOCKS[city]) continue;
    add({ key, city, r: SIZES[key] || SHOP_RADIUS, coords: Array.isArray(place.coordinates) ? place.coordinates : null, title: place.title || '', transport: key.startsWith('transport|') });
  }
  for (const city of CITY_ORDER) add({ key: souvenirKey(city), city, r: 2.8, coords: null, souvenir: true });

  // Station keys that sit on an island port facing the next city.
  const portStations = new Map();
  for (const c of CONNECTORS) {
    if (c.mode === 'plane') continue;
    portStations.set(c.stations[0], [c.a, c.b]);
    portStations.set(c.stations[1], [c.b, c.a]);
  }

  for (const [city, list] of byCity) {
    const block = BLOCKS[city];
    const geo = list.filter(i => i.coords && !FIXED[i.key] && !portStations.has(i.key));
    const lats = geo.map(i => i.coords[0]).sort((a, b) => a - b), lons = geo.map(i => i.coords[1]).sort((a, b) => a - b);
    const lat0 = lats[lats.length >> 1] ?? 0, lon0 = lons[lons.length >> 1] ?? 0;
    const k = Math.cos(lat0 * Math.PI / 180);
    const S = 320;
    const meters = i => [(i.coords[1] - lon0) * k * 111320, -(i.coords[0] - lat0) * 110540];
    const rawMax = Math.max(1, ...geo.map(i => Math.asinh(Math.hypot(...meters(i)) / S)));
    const span = Math.min(block.hw, block.hd) * .8;
    for (const item of list) {
      if (FIXED[item.key]) {
        const [, fx, fz] = FIXED[item.key];
        item.x = block.cx + fx * block.hw; item.z = block.cz + fz * block.hd; item.fixed = true;
      } else if (portStations.has(item.key)) {
        const [a, b] = portStations.get(item.key);
        const p = portPoint(a, b, item.r + 2.5);
        item.x = p.x; item.z = p.z; item.fixed = true;
      } else if (item.coords) {
        const [mx, mz] = meters(item);
        const r = Math.hypot(mx, mz) || 1;
        const rr = Math.asinh(r / S) / rawMax * span;
        item.x = block.cx + mx / r * rr * (block.hw / Math.min(block.hw, block.hd));
        item.z = block.cz + mz / r * rr * (block.hd / Math.min(block.hw, block.hd));
      } else {
        const h = hash(item.key), a = (h % 360) * Math.PI / 180, rr = span * (.25 + (h % 7) / 20);
        item.x = block.cx + Math.cos(a) * rr; item.z = block.cz + Math.sin(a) * rr;
      }
    }
    relax(list, block);
  }
  for (const item of items) { item.x = +item.x.toFixed(2); item.z = +item.z.toFixed(2); delete item.coords; }

  const connectors = CONNECTORS.map(c => ({ ...c, from: portPoint(c.a, c.b), to: portPoint(c.b, c.a) }));
  return { blocks: BLOCKS, items, byKey: new Map(items.map(i => [i.key, i])), connectors };
}

// Push overlapping footprints apart, keeping fixed ports/airports in place.
function relax(list, block, gap = 1.6) {
  for (let iter = 0; iter < 260; iter++) {
    let moved = false;
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      let dx = b.x - a.x, dz = b.z - a.z;
      let d = Math.hypot(dx, dz);
      const need = a.r + b.r + gap;
      if (d >= need) continue;
      if (d < 1e-3) { dx = Math.cos(i + j); dz = Math.sin(i + j); d = 1; }
      const push = (need - d) / 2 + .01;
      const ux = dx / d, uz = dz / d;
      const wa = a.fixed ? 0 : b.fixed ? 2 : 1, wb = b.fixed ? 0 : a.fixed ? 2 : 1;
      a.x -= ux * push * wa; a.z -= uz * push * wa;
      b.x += ux * push * wb; b.z += uz * push * wb;
      moved = true;
    }
    for (const it of list) {
      if (it.fixed) continue;
      const mx = block.hw - it.r - 1.8, mz = block.hd - it.r - 1.8;
      it.x = Math.min(block.cx + mx, Math.max(block.cx - mx, it.x));
      it.z = Math.min(block.cz + mz, Math.max(block.cz - mz, it.z));
    }
    if (!moved) break;
  }
}

// Front door: models face +z (towards the default camera).
export const doorPoint = item => ({ x: item.x, z: item.z + item.r * .82 + 1.1 });
