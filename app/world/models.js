// Hand-built toy models of the places on our itinerary. Each builder draws in a local
// frame: origin on the ground at the footprint centre, front façade facing +z.
import { THREE, roundedRect } from './kit.js';

export const C = {
  cream: '#fff1d0', white: '#fffaf2', ivory: '#f7e7c4', sand: '#f1d199', stone: '#e6d3ad', grey: '#cfc9bf', slate: '#5f6b84',
  dark: '#3b3f52', ink: '#2c2f3d', brick: '#d0603f', terracotta: '#e5683f', roof: '#e2553a', ochre: '#f0b44c', gold: '#ffc83a',
  green: '#5fc15a', leaf: '#3faa55', deep: '#2f8a4a', grass: '#8fd46a', blue: '#45a8ff', sky: '#8ad8ff', water: '#4fc3f7',
  teal: '#2fc4b2', pink: '#ff8fb1', rose: '#f6a28a', purple: '#9d70e0', orange: '#ff9a3c', red: '#ef4b4b', yellow: '#ffdd4a',
  wood: '#b36f3e', trunk: '#9c6438', choco: '#7a4a2a', iron: '#3f8d6b', glass: '#bfefff', black: '#2b2b33', snow: '#ffffff',
};
const MOSAIC = ['#ff6b6b', '#ffd23f', '#3fc5ff', '#6be675', '#ff9de2', '#ff9a3c', '#8f7cff', '#ffffff'];

// ---------- small reusable pieces ----------
export function gable(b, w, h, d, color, o = {}, kind) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
  b.group(o, g => g.extrude(s, d, color, { z: -d / 2 }, 0, kind));
}
export function hipRoof(b, w, h, d, color, o = {}) { // four-sided pyramid roof
  b.group(o, g => g.group({ sx: w, sz: d }, gg => gg.cyl(.001, .7071, h, color, { ry: Math.PI / 4 }, 4)));
}
export function windows(b, { w, y0, rows, cols, h = .7, ww = .5, z, rowGap = 1.1, x0 = 0, color }) {
  const step = w / cols;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++)
    b.win(ww, h, { x: x0 - w / 2 + step * (c + .5), y: y0 + r * rowGap, z }, color);
}
export function colonnade(b, n, span, h, r, color, o = {}) {
  b.group(o, g => {
    for (let i = 0; i < n; i++) g.cyl(r, r * 1.08, h, color, { x: n > 1 ? -span / 2 + span * i / (n - 1) : 0 }, 10);
  });
}
export function crenels(b, w, d, y, color, size = .45) {
  const nx = Math.max(2, Math.round(w / (size * 2))), nz = Math.max(2, Math.round(d / (size * 2)));
  for (let i = 0; i < nx; i++) {
    const x = -w / 2 + (i + .5) * w / nx;
    b.box(size, size, size, color, { x, y, z: d / 2 - size / 2 }); b.box(size, size, size, color, { x, y, z: -d / 2 + size / 2 });
  }
  for (let i = 0; i < nz; i++) {
    const z = -d / 2 + (i + .5) * d / nz;
    b.box(size, size, size, color, { x: w / 2 - size / 2, y, z }); b.box(size, size, size, color, { x: -w / 2 + size / 2, y, z });
  }
}
export function tree(b, x, z, s = 1, kind = 'round', R = Math.random) {
  b.group({ x, z, s }, g => {
    if (kind === 'cypress') {
      g.cyl(.12, .14, .5, C.trunk, {}, 6);
      g.sphere(.55, C.deep, { y: 1.6, sx: .8, sy: 2.1, sz: .8 }, 10);
    } else if (kind === 'palm') {
      for (let i = 0; i < 5; i++) g.cyl(.13, .16, .62, C.trunk, { y: i * .58, x: i * i * .02, rz: -i * .04 }, 6);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        g.box(.28, .08, 1.5, C.leaf, { x: .32 + Math.cos(a) * .55, y: 2.85, z: Math.sin(a) * .55, ry: -a + Math.PI / 2, rx: .45 });
      }
      g.sphere(.2, C.trunk, { x: .32, y: 2.95 }, 8);
    } else if (kind === 'orange') {
      g.cyl(.12, .15, .7, C.trunk, {}, 6);
      g.sphere(.85, C.leaf, { y: 1.3 }, 12);
      for (let i = 0; i < 6; i++) { const a = i * 1.1; g.sphere(.14, C.orange, { x: Math.cos(a) * .72, y: 1.25 + (i % 3) * .25, z: Math.sin(a) * .72 }, 6); }
    } else if (kind === 'pine') {
      g.cyl(.12, .15, .6, C.trunk, {}, 6);
      g.cone(.9, 1.4, C.deep, { y: .5 }, 8); g.cone(.7, 1.2, C.deep, { y: 1.2 }, 8); g.cone(.45, 1, C.deep, { y: 1.9 }, 8);
    } else if (kind === 'xmas') {
      g.cyl(.15, .18, .5, C.trunk, {}, 6);
      g.cone(1.3, 1.6, C.deep, { y: .4 }, 10); g.cone(1, 1.4, C.deep, { y: 1.3 }, 10); g.cone(.65, 1.2, C.deep, { y: 2.2 }, 10);
      for (let i = 0; i < 9; i++) { const a = i * 2.4, yy = .7 + i * .26, rr = 1.05 - i * .09; g.sphere(.12, MOSAIC[i % 6], { x: Math.cos(a) * rr, y: yy, z: Math.sin(a) * rr }, 6, 'light'); }
      g.sphere(.26, C.gold, { y: 3.5 }, 8, 'light');
    } else {
      g.cyl(.13, .17, .8, C.trunk, {}, 6);
      g.sphere(.8, C.leaf, { y: 1.35 }, 10);
      g.sphere(.55, C.green, { y: 1.85, x: .25, z: .15 }, 10);
    }
  });
}
export function lamp(b, x, z, o = {}) {
  b.group({ x, z, ...o }, g => {
    g.cyl(.07, .1, 2.2, C.dark, {}, 6);
    g.sphere(.2, '#fff2a8', { y: 2.35 }, 8, 'light');
    g.cone(.24, .2, C.dark, { y: 2.48 }, 6);
  });
}
export function bench(b, x, z, ry = 0, color = C.wood) {
  b.group({ x, z, ry }, g => { g.box(1.2, .12, .4, color, { y: .35 }); g.box(1.2, .35, .08, color, { y: .45, z: -.18 }); g.box(.08, .35, .35, C.dark, { x: -.5 }); g.box(.08, .35, .35, C.dark, { x: .5 }); });
}
export function fountain(b, r = 1.4, o = {}, tiers = 2) {
  b.group(o, g => {
    g.cyl(r, r * 1.05, .45, C.stone, {}, 18);
    g.cyl(r * .86, r * .86, .48, C.water, {}, 18);
    let y = .45;
    for (let t = 0; t < tiers; t++) {
      const rr = r * (.45 - t * .15);
      g.cyl(.14, .2, .7, C.stone, { y }, 8); y += .7;
      g.cyl(rr, rr * .6, .22, C.stone, { y }, 14); g.cyl(rr * .85, rr * .85, .24, C.water, { y: y + .02 }, 14); y += .22;
    }
    g.sphere(.18, '#dff7ff', { y: y + .25 }, 8, 'light');
  });
}
export function flag(b, colors = [C.red, C.yellow, C.red], o = {}, h = 2.2) {
  b.group(o, g => {
    g.cyl(.05, .05, h, C.grey, {}, 6);
    colors.forEach((c, i) => g.box(1, .5 / colors.length * (i === 1 && colors.length === 3 ? 2 : 1), .05, c, { x: .52, y: h - .55 + (colors.length - 1 - i) * (.5 / colors.length) * (i === 0 ? 1.5 : 1) }));
  });
}
export function spanishFlag(b, o = {}, h = 2.4) {
  b.group(o, g => { g.cyl(.05, .05, h, C.grey, {}, 6); g.box(1.1, .18, .05, C.red, { x: .58, y: h - .2 }); g.box(1.1, .3, .05, C.yellow, { x: .58, y: h - .5 }); g.box(1.1, .18, .05, C.red, { x: .58, y: h - .68 }); });
}
function plaza(b, r, color = '#f3e3c3') { b.cyl(r, r, .06, color, { y: .01 }, 28); }
function lights(b, x1, z1, x2, z2, y = 3.2, n = 10) { // a Christmas light string between two posts
  for (let i = 0; i <= n; i++) {
    const t = i / n, sag = Math.sin(t * Math.PI) * .55;
    b.sphere(.13, MOSAIC[i % 7], { x: x1 + (x2 - x1) * t, y: y - sag, z: z1 + (z2 - z1) * t }, 6, 'light');
  }
}
function awning(b, w, y, z, c1, c2 = C.white) {
  const n = Math.max(3, Math.round(w / .45));
  for (let i = 0; i < n; i++) b.box(w / n + .01, .1, 1, i % 2 ? c2 : c1, { x: -w / 2 + (i + .5) * w / n, y, z: z + .38, rx: .45 });
}
function door(b, w, h, z, color = C.choco) { b.box(w, h, .14, color, { z }); b.cyl(w / 2, w / 2, .14, color, { y: h, z, rx: Math.PI / 2 }, 12); }

// ---------- shop signs ----------
const SIGN = {
  churro(g) { g.cyl(.35, .28, .55, C.white, {}, 12); g.cyl(.3, .3, .05, C.choco, { y: .53 }, 12); for (let i = 0; i < 3; i++) g.cyl(.07, .07, .9, '#e8a64e', { x: -.15 + i * .15, y: .45, rz: -.25 + i * .25 }, 6); },
  cake(g) { g.cyl(.55, .55, .3, '#ffe9a8', {}, 16); g.cyl(.56, .56, .1, '#ffb347', { y: .3 }, 16); g.cyl(.4, .4, .28, '#fff6dd', { y: .4 }, 16); g.sphere(.12, C.red, { y: .78 }, 8); },
  icecream(g) { g.cone(.28, .8, '#e8b06a', { rx: Math.PI, y: .8 }, 10); g.sphere(.32, C.pink, { y: .92 }, 10); g.sphere(.27, '#fff3c4', { y: 1.28 }, 10); },
  burger(g) { g.dome(.45, '#e5a24e', { y: .5 }, 12); g.cyl(.47, .47, .14, C.choco, { y: .32 }, 14); g.cyl(.5, .5, .06, C.green, { y: .44 }, 14); g.cyl(.45, .45, .2, '#e5a24e', { y: .1 }, 14); },
  pizza(g) { g.cyl(.62, .62, .1, '#f2b55c', { rx: 1.1 }, 18); for (let i = 0; i < 5; i++) g.sphere(.08, C.red, { x: Math.cos(i * 1.3) * .35, y: Math.sin(i * 1.3) * .35 * .45 + .05, z: .25 + Math.sin(i * 1.3) * .1 }, 6); },
  pig(g) { g.sphere(.48, '#ffb3c1', { y: .5, sx: 1.25 }, 12); g.sphere(.18, '#ff96ab', { x: .58, y: .55, sx: .5 }, 8); g.cone(.12, .2, '#ff96ab', { x: .3, y: .92, z: .2 }, 6); g.cone(.12, .2, '#ff96ab', { x: .3, y: .92, z: -.2 }, 6); },
  coffee(g) { g.cyl(.38, .3, .55, C.white, {}, 12); g.cyl(.33, .33, .04, C.choco, { y: .53 }, 12); g.torus(.16, .05, C.white, { x: .42, y: .3 }, Math.PI * 2, 10); g.cyl(.55, .55, .05, C.white, { y: -.03 }, 14); },
  croissant(g) { g.torus(.38, .18, '#e9a54b', { y: .45, rx: Math.PI / 2 }, Math.PI * 1.25, 12); },
  wine(g) { g.cyl(.17, .17, .7, '#3b7a3b', {}, 8); g.cyl(.07, .1, .3, '#3b7a3b', { y: .7 }, 8); g.cyl(.18, .02, .3, C.glass, { x: .45, y: .5 }, 8); g.cyl(.18, .18, .1, '#a3263b', { x: .45, y: .58 }, 8); },
  plate(g) { g.cyl(.55, .5, .08, C.white, {}, 16); g.sphere(.22, C.orange, { y: .12, x: -.15, sy: .5 }, 8); g.sphere(.18, C.green, { y: .12, x: .2, z: .1, sy: .5 }, 8); g.box(.06, .7, .06, C.grey, { x: .7, y: -.1 }); },
  paella(g) { g.cyl(.62, .58, .14, C.dark, {}, 16); g.cyl(.55, .55, .05, '#ffcf3d', { y: .12 }, 16); for (let i = 0; i < 5; i++) g.sphere(.08, i % 2 ? C.red : C.dark, { x: Math.cos(i * 1.25) * .3, y: .18, z: Math.sin(i * 1.25) * .3 }, 6); },
  tapas(g) { g.cyl(.2, .2, .12, '#ffcf3d', { x: -.3 }, 10); g.cyl(.2, .2, .12, C.red, { x: .3 }, 10); g.box(.04, .5, .04, C.wood, { x: -.3, y: .1 }); g.sphere(.12, C.green, { x: -.3, y: .55 }, 6); g.box(.04, .5, .04, C.wood, { x: .3, y: .1 }); g.sphere(.12, '#ffcf3d', { x: .3, y: .55 }, 6); },
  cheese(g) { g.cyl(.55, .55, .45, '#ffd64d', { sz: .7, ry: .5 }, 3); g.sphere(.08, '#e7b822', { x: .1, y: .3, z: .32 }, 6); },
  cart(g) { g.box(.9, .45, .55, C.red, { y: .2 }); g.box(.06, .5, .06, C.dark, { x: -.5, y: .35 }); g.sphere(.1, C.dark, { x: -.3, y: .05, z: .28 }, 6); g.sphere(.1, C.dark, { x: .3, y: .05, z: .28 }, 6); },
  bag(g) { g.box(.7, .75, .3, '#c97b46', {}); g.torus(.2, .05, C.choco, { y: .78 }, Math.PI, 10); },
  gift(g) { g.box(.85, .65, .85, C.red, {}); g.box(.95, .2, .95, C.red, { y: .62 }); g.box(.16, .84, .96, C.yellow, { y: .01 }); g.box(.96, .84, .16, C.yellow, { y: .01 }); g.torus(.15, .06, C.yellow, { x: -.12, y: .95, rz: .6 }, Math.PI * 2, 10); g.torus(.15, .06, C.yellow, { x: .12, y: .95, rz: -.6 }, Math.PI * 2, 10); },
  fan(g) { for (let i = 0; i < 7; i++) g.box(.12, .8, .04, i % 2 ? C.red : C.black, { rz: -.9 + i * .3, y: .05 }); g.sphere(.08, C.gold, {}, 6); },
  beer(g) { g.cyl(.3, .27, .7, '#ffc42e', {}, 10); g.sphere(.32, C.white, { y: .75, sy: .55 }, 10); g.torus(.16, .05, C.glass, { x: .34, y: .35 }, Math.PI * 2, 8); },
  bread(g) { g.sphere(.5, '#e2a050', { y: .3, sx: 1.4, sy: .6 }, 12); for (let i = -1; i <= 1; i++) g.box(.06, .05, .5, '#b77731', { x: i * .3, y: .6, rx: .1, ry: .4 }); },
};

// Itinerary venues → shop look (name keywords win over the meal category).
const SHOP_OVERRIDES = [
  [/churr|San Ginés/i, 'churro', '#ff8a65'], [/cheesecake|Cordobés/i, 'cake', '#ffb8d0'], [/gelat|MITO/i, 'icecream', '#ff8fb1'],
  [/Five Guys/i, 'burger', '#ff5252'], [/pizz|Margherita|Sartoria/i, 'pizza', '#5ccf6b'], [/Botín/i, 'pig', '#c0392b'],
  [/Murillo|Mauri|Galisteo/i, 'coffee', '#a1887f'], [/Forn|Puiggròs/i, 'bread', '#f0a04b'], [/7 Portes|Paseíllo/i, 'paella', '#ffb300'],
  [/Vermut|Paradiso|Bodega|Glop/i, 'wine', '#8e44ad'], [/Sexitana/i, 'cheese', '#ffca28'], [/Corte Inglés|Carrefour/i, 'cart', '#26a65b'],
  [/Re-Cuir/i, 'bag', '#8d6e63'], [/Rinconcillo|Postiguillo|Sitarilla|Tapas|Andares|Vinitus|Sagardi|Furacu|Galayos|Puertecillo/i, 'tapas', '#e74c3c'],
];
export function shopStyle(key, category = '') {
  for (const [re, sign, color] of SHOP_OVERRIDES) if (re.test(key)) return { sign, color };
  if (/甜點/.test(category)) return { sign: 'cake', color: '#ffb8d0' };
  if (/早餐/.test(category)) return { sign: 'croissant', color: '#ffb74d' };
  if (/酒吧/.test(category)) return { sign: 'beer', color: '#8e44ad' };
  if (/採買/.test(category)) return { sign: 'cart', color: '#26a65b' };
  return { sign: 'plate', color: '#ef6c57' };
}

const WALLS = {
  madrid: ['#ffe0b3', '#ffd1a1', '#f9e6c8', '#ffc9a3', '#f6dbb0'],
  sevilla: ['#ffffff', '#fff3c9', '#ffe08a', '#ffd7a8', '#ffffff'],
  granada: ['#ffffff', '#fbf3e4', '#ffffff', '#f6e5cc'],
  barcelona: ['#f6dfbf', '#ffe9c9', '#e8d3b5', '#f5cfa8', '#fde3cf'],
  tpe: ['#e8f1ff', '#fff4e0'],
};
const ROOFS = { madrid: ['#e2553a', '#c94a35', '#5f6b84'], sevilla: ['#e2553a', '#f07c45'], granada: ['#d9583a', '#e46c42'], barcelona: ['#c94a35', '#e2703a', '#7a8597'], tpe: ['#ff6b6b'] };
const pick = (arr, R) => arr[Math.floor(R() * arr.length) % arr.length];

export function shop(b, style, R, city = 'madrid') {
  const wall = pick(WALLS[city] || WALLS.madrid, R), roof = pick(ROOFS[city] || ROOFS.madrid, R);
  const w = 3.4, d = 3, h = 3.4 + Math.floor(R() * 2) * .9;
  b.box(w, h, d, wall, {});
  b.box(w + .2, .25, d + .2, '#ffffff', { y: h });
  if (R() > .4) gable(b, w + .3, 1.1, d + .3, roof, { y: h + .2 }); else b.box(w + .2, .35, d + .2, roof, { y: h + .2 });
  b.box(w + .02, 1.25, .1, style.color, { y: 0, z: d / 2 });
  door(b, .9, 1.05, d / 2 + .06, C.choco);
  b.win(.8, .7, { x: -1.05, y: .3, z: d / 2 + .07 }); b.win(.8, .7, { x: 1.05, y: .3, z: d / 2 + .07 });
  windows(b, { w, y0: 1.8, rows: Math.round((h - 1.8) / 1.1), cols: 3, z: d / 2 + .02, h: .6, ww: .55 });
  for (let i = 0; i < 3; i++) b.box(.75, .08, .35, C.dark, { x: -w / 2 + w / 3 * (i + .5), y: 1.55, z: d / 2 + .18 });
  awning(b, w, 1.45, d / 2 - .2, style.color);
  b.group({ y: h + (b.__roofY || 1.4), z: .2, s: 1.15 }, g => (SIGN[style.sign] || SIGN.plate)(g));
}

export function filler(b, R, city, w = 3, d = 3) {
  const wall = pick(WALLS[city] || WALLS.madrid, R), roof = pick(ROOFS[city] || ROOFS.madrid, R);
  const floors = city === 'granada' || city === 'sevilla' ? 1 + Math.floor(R() * 2) : 2 + Math.floor(R() * 3);
  const h = 1.2 + floors * 1.05;
  b.box(w, h, d, wall, {});
  if (city === 'barcelona') { b.box(w + .15, .25, d + .15, C.cream, { y: h }); b.box(w * .5, .6, d * .5, wall, { y: h + .25 }); }
  else if (R() > .25) gable(b, w + .25, .9 + R() * .4, d + .25, roof, { y: h, ry: R() > .5 ? 0 : Math.PI / 2 });
  else b.box(w + .15, .3, d + .15, roof, { y: h });
  windows(b, { w, y0: .9, rows: floors, cols: Math.max(1, Math.round(w / 1.2)), z: d / 2 + .02, h: .55, ww: .45, rowGap: 1.05 });
  if (R() > .55) b.box(.35, .7, .35, '#b5654a', { x: w * .3, y: h + .4, z: -d * .2 });
  if ((city === 'sevilla' || city === 'granada') && R() > .4) for (let i = 0; i < 3; i++) b.sphere(.16, [C.red, C.pink, '#ff7a3c'][i], { x: -w / 2 + .5 + i * (w - 1) / 2, y: 1.85, z: d / 2 + .18 }, 5);
  if (city === 'madrid' && floors > 2 && R() > .5) b.box(w * .7, .45, d * .55, '#6aa84f', { y: h + .05 });
  if (city === 'barcelona' || city === 'madrid') for (let r = 1; r < floors; r++) b.box(w * .9, .07, .3, C.dark, { y: .75 + r * 1.05, z: d / 2 + .15 });
  if (city === 'sevilla' && R() > .5) b.box(w + .02, .22, d + .02, C.ochre, { y: .02 });
  door(b, .55, .7, d / 2 + .05, C.choco);
}

// ---------- landmarks ----------
export const LANDMARKS = {
  // ===== MADRID =====
  'madrid|Palacio Real de Madrid': { h: 9, build(b) {
    plaza(b, 8.3);
    b.box(14, 4.4, 7, C.white, { z: -1.2 });
    b.box(14.3, .35, 7.3, C.stone, { y: 4.4, z: -1.2 });
    b.box(5, 5.2, 7.6, C.ivory, { z: -.9 });
    b.box(5.3, .35, 7.9, C.stone, { y: 5.2, z: -.9 });
    for (const x of [-6, 6]) b.box(2.2, 5, 7.4, C.ivory, { x, z: -1.1 });
    colonnade(b, 6, 4.2, 3.4, .16, C.white, { y: 1.2, z: 3 });
    colonnade(b, 6, 10.5, 3, .13, C.cream, { y: 1.2, z: 2.42 });
    windows(b, { w: 13, y0: .4, rows: 3, cols: 13, z: 2.32, h: .7, ww: .4, rowGap: 1.25 });
    for (let i = 0; i < 18; i++) b.box(.18, .5, .18, C.white, { x: -6.8 + i * .8, y: 4.75, z: 2.2 });
    b.dome(1.1, '#9fb7c9', { y: 5.55, z: -1 }, 14);
    spanishFlag(b, { y: 6.5, z: -1 }, 2.5);
    for (const x of [-3.5, 3.5]) b.group({ x, z: 5.5 }, g => { g.box(.8, 1, .8, C.stone); g.sphere(.35, C.grey, { y: 1.3 }, 8); });
    lamp(b, -6.5, 5.6); lamp(b, 6.5, 5.6);
  } },
  'madrid|Plaza Mayor': { h: 7, build(b) {
    plaza(b, 7.6, '#e9cfa3');
    const brick = '#c95b45', side = 12, d = 2.4, h = 4;
    const sideWall = (o, len, gap = 0) => b.group(o, g => {
      if (gap) { g.box((len - gap) / 2, h, d, brick, { x: -(len + gap) / 4 }); g.box((len - gap) / 2, h, d, brick, { x: (len + gap) / 4 }); }
      else g.box(len, h, d, brick, {});
      g.box(len, .4, d + .2, C.slate, { y: h });
      g.box(len, 1, d + .02, '#7d3a2c', { y: 0 });
      windows(g, { w: len - .4, y0: 1.4, rows: 2, cols: Math.round(len / .9), z: d / 2 + .02, h: .7, ww: .32, rowGap: 1.1 });
    });
    sideWall({ z: -side / 2 + d / 2 }, side);
    sideWall({ z: side / 2 - d / 2, ry: Math.PI }, side, 3.4);
    sideWall({ x: -side / 2 + d / 2, ry: Math.PI / 2 }, side - d * 2);
    sideWall({ x: side / 2 - d / 2, ry: -Math.PI / 2 }, side - d * 2);
    for (const x of [-4.4, 4.4]) { b.box(1.4, 6.2, 1.4, brick, { x, z: -side / 2 + 1 }); b.cone(.95, 2.2, C.slate, { x, y: 6.2, z: -side / 2 + 1, ry: Math.PI / 4 }, 4); b.sphere(.15, C.gold, { x, y: 8.5, z: -side / 2 + 1 }, 6); }
    b.box(1.6, 1.1, 2.6, C.stone, { z: 0 });
    b.group({ y: 1.1 }, g => { g.sphere(.5, C.choco, { y: .7, sx: 1.6, sy: .8 }, 10); g.box(.18, .6, .18, C.choco, { x: .5, y: 0, z: .2 }); g.box(.18, .6, .18, C.choco, { x: -.5, y: 0, z: -.2 }); g.box(.18, .6, .18, C.choco, { x: .5, y: 0, z: -.2 }); g.box(.18, .6, .18, C.choco, { x: -.5, y: 0, z: .2 }); g.sphere(.32, C.choco, { y: 1.45, x: .1 }, 8); });
    tree(b, -2.5, -2.4, .9, 'xmas');
    for (const [x, z, c] of [[-3.4, 1.6, C.red], [3.4, 1.6, C.green], [3.4, -1.8, C.red], [-1, 3.5, C.green], [1.2, 3.5, C.red]]) b.group({ x, z }, g => { g.box(1.3, 1.1, 1, C.wood); g.box(1.5, .1, 1.3, c, { y: 1.5, rx: .25 }); g.box(.08, .5, .08, C.wood, { x: -.6, y: 1.05, z: .5 }); g.box(.08, .5, .08, C.wood, { x: .6, y: 1.05, z: .5 }); g.box(1.2, .25, .2, C.yellow, { y: .9, z: .55 }, 'light'); });
  } },
  'madrid|Mercado de San Miguel': { h: 5.8, build(b) {
    b.box(7.6, .3, 5, C.stone, {});
    b.box(7, 3.2, 4.4, C.glass, { y: .3 }, 'glass');
    for (let i = 0; i <= 7; i++) b.box(.16, 3.2, .16, C.iron, { x: -3.5 + i, y: .3, z: 2.2 });
    for (let i = 0; i <= 7; i++) b.box(.16, 3.2, .16, C.iron, { x: -3.5 + i, y: .3, z: -2.2 });
    b.box(7.2, .22, 4.6, C.iron, { y: 3.5 });
    gable(b, 4.6, 1.5, 7.2, '#7fd0e8', { y: 3.7, ry: Math.PI / 2 }, 'glass');
    b.box(7.3, .18, .18, C.iron, { y: 5.15 });
    for (let i = 0; i < 4; i++) b.box(1.2, .9, .8, MOSAIC[i], { x: -2.4 + i * 1.6, y: .3, z: .4 }, 'light');
    b.box(3.2, .55, .12, C.iron, { y: 2.6, z: 2.3 });
    b.box(2.9, .35, .14, C.gold, { y: 2.7, z: 2.33 }, 'light');
  } },
  'madrid|Gran Vía': { h: 9, build(b) {
    b.box(13, .05, 3.2, '#5a5f6e', { y: .02, ry: -.25 });
    b.box(13, .07, .5, '#e8e1d4', { y: .02, z: 1.8, ry: -.25 }); b.box(13, .07, .5, '#e8e1d4', { y: .02, z: -1.8, ry: -.25 });
    b.group({ x: 1.2, z: -3.4 }, g => { // Metropolis-style corner building
      g.cyl(2.2, 2.2, 5, C.white, {}, 20);
      colonnade(g, 4, 2.6, 1.6, .12, C.white, { y: 3.2, z: 2.1 });
      g.cyl(2.3, 2.3, .3, C.cream, { y: 5 }, 20);
      g.cyl(1.6, 1.9, 1, C.white, { y: 5.3 }, 20);
      g.dome(1.7, C.black, { y: 6.2, sy: 1.2 }, 18);
      for (let i = 0; i < 8; i++) g.box(.08, 1.9, .08, C.gold, { x: Math.cos(i * .785) * 1.2, y: 6.3, z: Math.sin(i * .785) * 1.2, rz: Math.cos(i * .785) * .5, rx: -Math.sin(i * .785) * .5 });
      g.cyl(.1, .15, .8, C.gold, { y: 8.1 }, 6); g.sphere(.25, C.gold, { y: 8.9 }, 8);
      g.box(1.4, .1, .35, C.gold, { y: 8.95, rz: .3 }); g.box(1.4, .1, .35, C.gold, { y: 8.95, rz: -.3 });
      windows(g, { w: 2.4, y0: .5, rows: 3, cols: 3, z: 2.22, h: .6, ww: .4, rowGap: 1.1 });
    });
    b.group({ x: -4, z: -3.2, ry: -.25 }, g => { g.box(3.4, 6.5, 2.6, '#f4dcb8'); g.box(3.6, .3, 2.8, C.cream, { y: 6.5 }); windows(g, { w: 3, y0: .6, rows: 5, cols: 3, z: 1.32, h: .6, ww: .5 }); g.box(1.6, .7, .12, C.red, { y: 4.8, z: 1.4 }, 'light'); });
    b.group({ x: -4.5, z: 3.2, ry: -.25 }, g => { g.box(3, 4.6, 2.4, '#ffd7b0'); g.box(3.2, .3, 2.6, C.cream, { y: 4.6 }); windows(g, { w: 2.6, y0: .6, rows: 3, cols: 3, z: 1.22, h: .6, ww: .5 }); });
    b.group({ x: 4.4, z: 2.4, ry: -.25 }, g => { g.box(3, 5.4, 2.4, '#f6e1c4'); g.box(3.2, .3, 2.6, C.cream, { y: 5.4 }); windows(g, { w: 2.6, y0: .6, rows: 4, cols: 3, z: 1.22, h: .6, ww: .5 }); });
    for (let i = -2; i <= 2; i++) { const x = i * 2.4, z = -x * .255; b.box(.08, 3.4, .08, C.dark, { x: x, z: z - 2 }); b.box(.08, 3.4, .08, C.dark, { x: x, z: z + 2 }); lights(b, x, z - 2, x, z + 2, 3.4, 7); }
  } },
  'madrid|Puerta de Alcalá': { h: 6.5, build(b) {
    b.cyl(5, 5, .12, C.grass, { y: .01 }, 26);
    for (let i = 0; i < 14; i++) b.sphere(.22, MOSAIC[i % 6], { x: Math.cos(i * .45) * 4.4, y: .2, z: Math.sin(i * .45) * 4.4 }, 6);
    const g0 = '#efe4cf';
    const piers = [[-4.15, .7], [-2.85, .8], [-1.05, .5], [1.05, .5], [2.85, .8], [4.15, .7]];
    for (const [x, w] of piers) b.box(w, 3.4, 1.6, g0, { x });
    for (const x of [-3.5, 3.5]) b.box(.62, 1.3, 1.6, g0, { x, y: 2.1 });
    for (const [x, r] of [[-1.95, .65], [0, .8], [1.95, .65]]) { b.torus(r - .12, .16, g0, { x, y: 2.5, z: .72 }, Math.PI, 12); b.torus(r - .12, .16, g0, { x, y: 2.5, z: -.72 }, Math.PI, 12); b.box(r * 2, 3.4 - 2.5 - r + .5, 1.6, g0, { x, y: 2.5 + r - .5 }); }
    b.box(9.3, .3, 1.9, C.stone, { y: 4.3 });
    b.box(3.4, 1.2, 1.3, g0, { y: 4.6 });
    b.box(2.6, .4, 1.4, C.stone, { y: 5.8 });
    b.sphere(.4, C.grey, { y: 6.4, sx: 1.4 }, 8);
    for (const x of [-3, 3]) b.sphere(.3, C.grey, { x, y: 4.85 }, 8);
    for (const x of [-2.6, -1.5, 1.5, 2.6]) b.cyl(.13, .13, 2.6, C.white, { x, y: .4, z: .86 }, 8);
  } },
  'madrid|Parque del Retiro': { h: 5, build(b, R) {
    b.cyl(9, 9, .14, '#7fcf5c', { y: .01 }, 30);
    b.box(9, .1, 4.6, C.water, { z: -1.4, y: .05 });
    b.box(9.4, .2, .3, C.stone, { z: .95, y: .03 }); b.box(9.4, .2, .3, C.stone, { z: -3.75, y: .03 });
    for (const [x, z, c] of [[-2, -1, C.red], [1.2, -2.2, C.blue], [3, -.6, C.yellow]]) b.group({ x, z, y: .1, ry: x }, g => { g.box(1, .25, .45, c); g.box(.9, .06, .1, C.wood, { y: .25 }); });
    b.group({ z: -4.6 }, g => { // Alfonso XII monument
      for (let i = 0; i < 9; i++) { const a = Math.PI + i / 8 * Math.PI; g.cyl(.12, .12, 1.8, C.stone, { x: Math.cos(a) * 3.2, z: Math.sin(a) * 1.2 + .2 }, 8); }
      g.box(6.8, .3, 1.2, C.stone, { y: 1.8, z: -.6 });
      g.box(1.4, 1.4, 1.4, C.stone, { z: -.2 }); g.cyl(.3, .35, 3, C.stone, { y: 1.4, z: -.2 }, 10); g.sphere(.35, '#9a7b52', { y: 4.7, z: -.2, sx: 1.4 }, 8);
    });
    b.group({ x: -5.2, z: 4, ry: .4 }, g => { // Crystal palace
      g.box(3.2, .3, 2.2, C.stone); g.box(3, 1.6, 2, C.glass, { y: .3 }, 'glass'); g.dome(.9, C.glass, { y: 1.9 }, 12, 'glass');
      for (let i = 0; i < 5; i++) g.box(.08, 1.6, .08, C.white, { x: -1.4 + i * .7, y: .3, z: 1 });
      g.box(3.1, .14, 2.1, C.white, { y: 1.9 });
    });
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + R() * .2, r = 6.6 + R() * 1.6; if (Math.abs(Math.sin(a)) < .25 && Math.cos(a) < 0) continue; tree(b, Math.cos(a) * r, Math.sin(a) * r, .8 + R() * .4, i % 4 ? 'round' : 'pine'); }
    bench(b, 2, 2.5); bench(b, -1, 3, .4); lamp(b, 4, 2.2); lamp(b, -2.5, 1.6);
  } },
  'madrid|Museo del Prado': { h: 6, build(b) {
    plaza(b, 6.6);
    b.box(13, 3.4, 4.6, '#d47e5c', { z: -1 });
    b.box(13.3, .3, 4.9, C.stone, { y: 3.4, z: -1 });
    b.box(4, 4.2, 5.2, C.stone, { z: -.8 });
    colonnade(b, 6, 3.2, 3.1, .17, C.white, { y: .5, z: 2.1 });
    b.box(4.2, .4, 1.2, C.white, { y: 3.6, z: 1.7 });
    b.box(4.2, .5, 1, C.stone, { z: 2.2 });
    windows(b, { w: 12, y0: .7, rows: 2, cols: 10, z: 1.32, h: .8, ww: .45, rowGap: 1.4, color: '#ffe6a6' });
    for (const x of [-4.4, -2.7, 2.7, 4.4]) b.box(.7, 1.5, .2, C.stone, { x, y: .9, z: 1.35 });
    b.dome(1, '#9fb7c9', { y: 4.2, z: -1 }, 12);
    b.group({ z: 4.4 }, g => { g.box(1, 1.3, 1, C.stone); g.sphere(.3, '#4e6a5a', { y: 1.65 }, 8); g.box(.5, .7, .3, '#4e6a5a', { y: 1.3 }); });
    tree(b, -5.5, 3.6, .8); tree(b, 5.5, 3.6, .8);
    b.box(1.8, 1.1, .1, C.red, { x: -4.6, y: .2, z: 1.45 }, 'light');
  } },
  'madrid|Plaza de Cibeles': { h: 9, build(b) {
    b.group({ z: -2.6 }, g => { // Palacio de Cibeles
      g.box(8.4, 4, 3, C.white); g.box(3, 6.6, 3.2, C.white);
      g.box(1.4, 2.2, 1.4, C.white, { y: 6.6 }); g.cone(.9, 1.4, C.slate, { y: 8.8, ry: Math.PI / 4 }, 4);
      for (const x of [-3.6, 3.6]) { g.box(1.2, 5, 3.2, C.white, { x }); g.cone(.8, 1.3, C.slate, { x, y: 5, ry: Math.PI / 4 }, 4); }
      windows(g, { w: 8, y0: .6, rows: 3, cols: 9, z: 1.52, h: .6, ww: .38, rowGap: 1.1 });
      g.box(2.2, .4, .12, C.red, { y: 4.4, z: 1.62 }, 'light');
    });
    b.group({ z: 2.2 }, g => {
      g.cyl(2.6, 2.7, .5, C.stone, {}, 20); g.cyl(2.3, 2.3, .52, C.water, {}, 20);
      g.box(1.8, .8, 1, C.stone, { y: .5 });
      g.sphere(.4, '#e8e2d6', { y: 1.8, sy: 1.6 }, 10); g.sphere(.25, '#e8e2d6', { y: 2.6 }, 8);
      for (const x of [-.5, .5]) { g.sphere(.32, C.gold, { x, y: 1.3, z: .9, sx: .8, sz: 1.3 }, 8); g.sphere(.22, C.gold, { x, y: 1.6, z: 1.25 }, 8); }
      g.torus(.4, .07, C.grey, { y: .9, z: -.4, ry: Math.PI / 2 }, Math.PI * 2, 12); g.torus(.4, .07, C.grey, { y: .9, z: -.4, ry: Math.PI / 2, x: .8 }, Math.PI * 2, 12);
      for (let i = 0; i < 6; i++) g.cyl(.04, .04, 1, '#dff7ff', { x: Math.cos(i) * 1.5, y: .5, z: Math.sin(i) * 1.5, rz: Math.cos(i) * .4, rx: -Math.sin(i) * .4 }, 4, 'light');
    });
  } },
  'madrid|Consejo Superior de Investigaciones Científicas (CSIC)': { h: 6, build(b) {
    plaza(b, 5);
    b.box(9, 3.8, 4.4, '#f1e6d2', { z: -.8 });
    b.box(9.3, .35, 4.7, C.stone, { y: 3.8, z: -.8 });
    colonnade(b, 6, 4.4, 3, .18, C.white, { y: .45, z: 1.75 });
    gable(b, 5.2, 1.2, 1.3, C.white, { y: 3.8, z: 1.4 });
    b.box(5.2, .45, 1.5, C.stone, { z: 1.8 });
    windows(b, { w: 8.4, y0: .7, rows: 2, cols: 9, z: 1.42, h: .7, ww: .4, rowGap: 1.4 });
    spanishFlag(b, { x: -2.2, y: 4.2, z: 1 }); spanishFlag(b, { x: 2.2, y: 4.2, z: 1 });
    for (const x of [-1.6, -.5, .6, 1.7]) b.group({ x, z: 3.4 }, g => { g.cyl(.22, .26, .8, '#d63a2f', {}, 8); g.sphere(.22, '#f7e9d0', { y: .98 }, 8); g.box(.3, .12, .05, C.dark, { y: 1.02, z: .2 }); });
  } },
  'madrid|Supermercado El Corte Inglés': { h: 6, build(b) {
    b.box(6, 4.6, 4, '#ffffff', {});
    b.box(6.2, .3, 4.2, '#1e9b57', { y: 4.6 });
    b.box(6.02, 1.5, .1, C.glass, { y: .2, z: 2.02 }, 'glass');
    b.box(3, .55, .1, '#1e9b57', { y: 3.6, z: 2.05 });
    b.box(2.6, .3, .12, C.white, { y: 3.72, z: 2.08 }, 'light');
    windows(b, { w: 5.4, y0: 2, rows: 1, cols: 6, z: 2.02, h: .9, ww: .6 });
    b.group({ y: 4.9, s: 1.5 }, SIGN.cart);
  } },
  'madrid|souvenir': { h: 5.5, build: souvenirShop('#ffd23f', '#e2553a') },

  // ===== SEVILLA =====
  'sevilla|Plaza de España': { h: 11, build(b) {
    b.cyl(9.4, 9.4, .06, '#f2d7ad', { y: .01 }, 32);
    const R0 = 8, n = 15, brick = '#d9774f';
    for (let i = 0; i < n; i++) {
      const a = Math.PI + (i + .5) / n * Math.PI, x = Math.cos(a) * R0, z = Math.sin(a) * R0 * .82 + 1;
      b.group({ x, z, ry: -a - Math.PI / 2 }, g => {
        g.box(1.75, 3.6, 1.8, brick); g.box(1.8, .3, 1.9, C.cream, { y: 3.6 });
        g.box(1.8, 1.3, .1, C.cream, { y: 0, z: .92 }); door(g, .55, .7, .98, '#2d6fa8');
        g.win(.5, .6, { y: 2, z: .92, x: -.4 }); g.win(.5, .6, { y: 2, z: .92, x: .4 });
        g.box(1.4, .28, .5, MOSAIC[i % 7], { y: .25, z: 1.4 });
      });
    }
    for (const s of [-1, 1]) b.group({ x: s * 8.6, z: 1 }, g => {
      g.box(1.8, 7.5, 1.8, brick); g.box(2, .3, 2, C.cream, { y: 7.5 });
      g.box(1.4, 1.4, 1.4, C.cream, { y: 7.8 }); g.cyl(.6, .7, .8, brick, { y: 9.2 }, 8); g.cone(.6, 1.4, C.cream, { y: 10 }, 8); g.sphere(.15, C.gold, { y: 11.5 }, 6);
      windows(g, { w: 1.4, y0: 1.5, rows: 4, cols: 1, z: .92, h: .7, ww: .4, rowGap: 1.4 });
    });
    b.group({ z: -6.6 }, g => { g.box(3.6, 5.2, 2.2, brick); g.box(3.8, .3, 2.4, C.cream, { y: 5.2 }); g.box(2, 1.2, 1.6, C.cream, { y: 5.5 }); g.dome(.7, '#3f8ccf', { y: 6.7 }, 12); door(g, 1, 1.4, 1.12, C.dark); });
    b.torus(5.4, .55, C.water, { y: .08, rx: -Math.PI / 2, z: 1, sy: .82 }, Math.PI, 30);
    for (const a of [.35, .95, 2.2, 2.8]) b.group({ x: Math.cos(Math.PI + a) * -5.4 * -1, z: 1 + Math.sin(Math.PI + a) * 5.4 * .82, ry: a + Math.PI / 2 }, g => { g.torus(.8, .18, C.white, { y: .1 }, Math.PI, 10); g.box(1.6, .08, .5, '#3f8ccf', { y: .7 }); });
    fountain(b, 1.2, { z: 3.4 }, 2);
    tree(b, -8.6, 6, .7, 'orange'); tree(b, 8.6, 6, .7, 'orange');
  } },
  'sevilla|Catedral de Sevilla / Giralda': { h: 15.5, build(b) {
    plaza(b, 7.9);
    const s = '#e9cf9d';
    b.box(11, 4.4, 8, s, { x: -1, z: -.6 });
    b.box(4, 6, 8.4, s, { x: -1, z: -.6 });
    gable(b, 4.2, 1.6, 8.6, '#d6b884', { x: -1, y: 6, z: -.6 });
    for (let i = 0; i < 6; i++) { const x = -6 + i * 2; b.box(.5, 4.9, .6, s, { x, z: 3.5 }); b.cone(.32, 1.2, s, { x, y: 4.9, z: 3.5 }, 6); b.box(.5, 4.9, .6, s, { x, z: -4.7 }); b.cone(.32, 1.2, s, { x, y: 4.9, z: -4.7 }, 6); }
    b.cyl(.75, .75, .12, '#4aa8ff', { x: -1, y: 4, z: 3.42, rx: Math.PI / 2 }, 16, 'light');
    door(b, 1.2, 1.8, 3.42, C.choco);
    b.dome(1.4, '#d6b884', { x: -1, y: 6, z: -.6 }, 14);
    b.group({ x: 4.6, z: -1.2 }, g => { // Giralda
      g.box(2.4, 10, 2.4, '#e2a96c');
      for (let r = 0; r < 4; r++) g.win(.5, .9, { y: 1.8 + r * 2.1, z: 1.22 }, '#ffd99a');
      for (let r = 0; r < 4; r++) g.box(1.6, 1.6, .06, '#c78952', { y: 1.5 + r * 2.1, z: 1.21 });
      g.box(2.7, .3, 2.7, C.white, { y: 10 });
      g.box(2, 1.6, 2, C.cream, { y: 10.3 });
      for (const x of [-.55, .55]) g.box(.4, 1, .06, C.dark, { x, y: 10.5, z: 1.02 });
      g.box(1.5, 1.1, 1.5, C.cream, { y: 11.9 }); g.box(1, .9, 1, C.cream, { y: 13 }); g.dome(.5, C.gold, { y: 13.9 }, 10);
      g.cyl(.05, .05, .8, C.dark, { y: 14.4 }, 4); g.sphere(.16, C.gold, { y: 15.3 }, 6);
    });
    tree(b, -6.4, 5.4, .7, 'orange'); tree(b, 3, 5.6, .7, 'orange'); tree(b, -3.6, 5.8, .65, 'orange');
    b.group({ x: 6.6, z: 5 }, g => { g.box(1.6, .7, .8, C.wood, { y: .35 }); g.sphere(.4, C.white, { x: 1.5, y: 1, sx: 1.5 }, 8); g.torus(.45, .08, C.dark, { z: .45 }, Math.PI * 2, 10); g.torus(.45, .08, C.dark, { z: -.45 }, Math.PI * 2, 10); g.box(.2, .7, .2, C.white, { x: 1.2 }); g.box(.2, .7, .2, C.white, { x: 1.8 }); });
  } },
  'sevilla|Real Alcázar de Sevilla': { h: 6, build(b) {
    const w = '#e8b56f';
    b.box(13, 2.2, .6, w, { z: 5.4 }); b.box(13, 2.2, .6, w, { z: -5.4 }); b.box(.6, 2.2, 11.4, w, { x: 6.2 }); b.box(.6, 2.2, 11.4, w, { x: -6.2 });
    crenels(b, 13, 11.4, 2.2, w, .4);
    b.group({ z: 5.4 }, g => { g.box(2.4, 3.4, 1, '#b44a3a'); g.box(2.6, .3, 1.2, C.cream, { y: 3.4 }); door(g, 1, 1.5, .52, C.dark); g.box(.8, .8, .06, '#4fae58', { y: 2.2, z: .52 }, 'light'); });
    b.box(11.4, .05, 10.4, '#a6dc7a', { y: .02 });
    b.group({ z: -2 }, g => {
      g.box(8, 3.6, 3.4, C.white); g.box(8.2, .3, 3.6, '#e8b56f', { y: 3.6 });
      for (let i = 0; i < 7; i++) { const x = -3.3 + i * 1.1; g.cyl(.09, .09, 1.5, C.cream, { x, z: 1.75 }, 8); g.torus(.48, .09, C.cream, { x: x + .55, y: 1.5, z: 1.75 }, Math.PI, 10); }
      g.box(8, .5, .3, '#4fae58', { y: 2.4, z: 1.72 }); g.box(8, .2, .3, '#2d6fa8', { y: 2.9, z: 1.72 });
    });
    b.box(1.6, .1, 4.4, C.water, { y: .03, z: 1.8 }); b.box(2, .2, 4.8, C.stone, { y: .01, z: 1.8, sy: .5 });
    for (const [x, z] of [[-3, .6], [-3, 3.2], [3, .6], [3, 3.2], [-4.8, 4.2], [4.8, 4.2]]) tree(b, x, z, .65, 'orange');
    tree(b, -5, -4.4, .6, 'palm'); tree(b, 5, -4.4, .6, 'palm');
  } },
  'sevilla|Iglesia del Salvador': { h: 8, build(b) {
    plaza(b, 5);
    const p = '#f2a385';
    b.box(5.4, 4.4, 6, p, { z: -.6 });
    b.box(5.6, .3, 6.2, C.cream, { y: 4.4, z: -.6 });
    b.box(2.6, 5.4, .5, C.cream, { z: 2.55 });
    gable(b, 2.8, 1, .6, C.cream, { y: 5.4, z: 2.6 });
    door(b, 1, 1.6, 2.82, C.choco); b.win(.7, .7, { y: 3.2, z: 2.82 });
    for (const x of [-1.9, 1.9]) b.box(.5, 4.4, .5, C.cream, { x, z: 2.45 });
    b.cyl(1.4, 1.5, 1.2, p, { y: 4.6, z: -1.2 }, 14); b.dome(1.45, '#f0c25a', { y: 5.8, z: -1.2 }, 14);
    b.cyl(.3, .4, .7, C.cream, { y: 7.2, z: -1.2 }, 8); b.sphere(.2, C.gold, { y: 8, z: -1.2 }, 6);
    b.group({ x: 2.6, z: -3 }, g => { g.box(1.4, 6.2, 1.4, p); g.box(1.6, .2, 1.6, C.cream, { y: 6.2 }); g.box(1.1, 1, 1.1, C.cream, { y: 6.4 }); g.cone(.6, .9, '#f0c25a', { y: 7.4 }, 8); });
    tree(b, -3.2, 3.6, .65, 'orange'); tree(b, 3.4, 3.6, .65, 'orange');
  } },
  'sevilla|Casa de la Memoria': { h: 6.5, build(b) {
    b.box(4.4, 4.2, 3.6, C.white, {});
    b.box(4.6, .3, 3.8, C.ochre, { y: 4.2 });
    b.box(4.42, .9, 3.62, C.ochre, {});
    door(b, 1.1, 1.6, 1.84, '#5a2c1c');
    for (const x of [-1.4, 1.4]) { b.win(.6, .9, { x, y: 2.6, z: 1.83 }, '#ffcf6b'); b.box(.9, .1, .4, C.dark, { x, y: 2.4, z: 2 }); for (let i = 0; i < 4; i++) b.box(.05, .5, .05, C.dark, { x: x - .35 + i * .23, y: 2.45, z: 2.18 }); }
    for (let i = 0; i < 4; i++) b.sphere(.22, C.red, { x: -1.6 + i * 1.05, y: 3.6, z: 1.9 }, 6);
    b.group({ y: 4.6, s: 1.8 }, SIGN.fan);
  } },
  'sevilla|souvenir': { h: 5.5, build: souvenirShop('#ff9a3c', '#2d6fa8') },

  // ===== GRANADA =====
  'granada|Alhambra / Alcazaba': { h: 8.5, build(b) {
    const w = '#d98a5c';
    b.box(8, 2.8, .6, w, { z: 3.4 }); b.box(8, 2.8, .6, w, { z: -3.4 }); b.box(.6, 2.8, 7.4, w, { x: 3.7 }); b.box(.6, 2.8, 7.4, w, { x: -3.7 });
    crenels(b, 8, 7.4, 2.8, w, .42);
    b.box(7, .05, 6.4, '#e6c08f', { y: .02 });
    for (const [x, z] of [[-3.7, 3.4], [3.7, 3.4], [-3.7, -3.4]]) { b.box(1.6, 3.8, 1.6, w, { x, z }); crenels(b, 1.6, 1.6, 3.8, w, .36); }
    b.group({ x: 2.6, z: -2.4 }, g => { // Torre de la Vela
      g.box(2.6, 5.6, 2.6, w); crenels(g, 2.6, 2.6, 5.6, w, .4);
      g.win(.4, .8, { y: 3, z: 1.32 }, '#ffd99a'); g.win(.4, .8, { y: 1.6, z: 1.32 }, '#ffd99a');
      g.box(.6, 1.2, .6, '#c87a4c', { y: 5.8 }); g.sphere(.3, C.gold, { y: 7.2 }, 8);
      spanishFlag(g, { x: -.8, y: 5.6 }, 2.3);
    });
    door(b, .9, 1.3, 3.72, C.dark);
  } },
  'granada|Alhambra / Palacios Nazaríes': { h: 7, build(b) {
    const w = '#e3a774';
    b.box(10, 3, 9, w, { z: -.4, sx: 1, sy: 1 });
    b.box(7.6, .05, 6.6, C.white, { y: 3.02, z: -.2 });
    b.box(7.2, .3, 6.2, '#f6ead6', { y: 3, z: -.2 });
    b.group({ y: 3.3, z: -.2 }, g => { // Court of the Lions on top of the palace block so it reads from above
      for (let i = 0; i < 10; i++) { const x = -3 + i * .66; g.cyl(.06, .06, 1.2, C.white, { x, z: 2.6 }, 6); g.cyl(.06, .06, 1.2, C.white, { x, z: -2.6 }, 6); }
      for (let i = 0; i < 8; i++) { const z = -2.3 + i * .66; g.cyl(.06, .06, 1.2, C.white, { x: 3.2, z }, 6); g.cyl(.06, .06, 1.2, C.white, { x: -3.2, z }, 6); }
      g.box(6.8, .3, .8, C.cream, { y: 1.2, z: 2.6 }); g.box(6.8, .3, .8, C.cream, { y: 1.2, z: -2.6 }); g.box(.8, .3, 5.2, C.cream, { y: 1.2, x: 3.2 }); g.box(.8, .3, 5.2, C.cream, { y: 1.2, x: -3.2 });
      g.box(6.6, .45, .9, '#c96b45', { y: 1.5, z: 2.6, sy: 1 }); g.box(6.6, .45, .9, '#c96b45', { y: 1.5, z: -2.6 });
      g.box(.3, .05, 5, C.water, { y: .02 }); g.box(5.6, .05, .3, C.water, { y: .02 });
      g.cyl(.8, .9, .3, C.white, {}, 14); g.cyl(.5, .3, .3, C.white, { y: .5 }, 12); g.sphere(.2, '#dff7ff', { y: .9 }, 8, 'light');
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.sphere(.15, '#efe0b9', { x: Math.cos(a) * .9, y: .2, z: Math.sin(a) * .9 }, 6); }
    });
    b.group({ x: -3.6, z: -3.4 }, g => { g.box(2.6, 5.6, 2.6, w); crenels(g, 2.6, 2.6, 5.6, w, .38); g.win(.4, .7, { y: 3.8, z: 1.32 }, '#ffd99a'); }); // Comares tower
    for (let i = 0; i < 5; i++) b.torus(.38, .08, C.cream, { x: -1.6 + i * .8, y: 1.6, z: 4.12 }, Math.PI, 10);
    for (let i = 0; i < 6; i++) b.box(.12, 1.6, .12, C.cream, { x: -2 + i * .8, z: 4.12 });
    b.box(4.3, 2.5, .1, '#6b3f2a', { z: 4.04, y: 0 });
  } },
  'granada|Alhambra / Partal': { h: 6, build(b) {
    b.box(6.2, .3, 3.8, C.stone, { z: 1.4 });
    b.box(5.6, .32, 3.2, C.water, { z: 1.4, y: .02 });
    const w = '#eab887';
    b.group({ z: -1.4 }, g => {
      g.box(5.4, 3.2, 1.6, w);
      for (let i = 0; i < 5; i++) { const x = -2 + i; g.box(.7, 1.9, .1, '#7a4430', { x, z: .82 }); g.torus(.35, .1, C.cream, { x, y: 1.9, z: .86 }, Math.PI, 10); }
      g.box(5.6, .3, 1.8, C.cream, { y: 3.2 });
      g.box(1.8, 2, 1.8, w, { x: .4, y: 3.2 }); hipRoof(g, 2.1, .9, 2.1, C.roof, { x: .4, y: 5.2 });
    });
    tree(b, -3.6, 1.4, .7, 'cypress'); tree(b, 3.6, 1.4, .7, 'cypress');
  } },
  'granada|Alhambra / Generalife': { h: 6, build(b) {
    b.cyl(6.2, 6.2, .12, '#86cf63', { y: .01 }, 28);
    b.box(1.5, .12, 9, C.stone, { y: .03, z: .4 }); b.box(1, .14, 8.6, C.water, { y: .04, z: .4 });
    for (let i = 0; i < 7; i++) { const z = -3.2 + i * 1.2; b.torus(.5, .025, '#dff7ff', { x: -.5, y: .15, z, ry: 0, rz: 0, rx: 0 }, Math.PI, 10, 'light'); b.torus(.5, .025, '#dff7ff', { x: .5, y: .15, z, ry: Math.PI }, Math.PI, 10, 'light'); }
    for (const x of [-1.6, 1.6]) for (let i = 0; i < 8; i++) b.box(.7, .8, .9, C.deep, { x, z: -3.4 + i * 1.1 });
    for (const x of [-3, 3]) for (let i = 0; i < 4; i++) tree(b, x, -3 + i * 2.2, .7, 'cypress');
    b.group({ z: -4.6 }, g => { g.box(5, 3, 1.6, C.white); for (let i = 0; i < 5; i++) g.torus(.32, .08, C.cream, { x: -1.6 + i * .8, y: 1.6, z: .82 }, Math.PI, 10); for (let i = 0; i < 6; i++) g.box(.1, 1.6, .1, C.cream, { x: -2 + i * .8, z: .82 }); g.box(5.2, .3, 1.8, C.roof, { y: 3 }); g.box(1.6, 1.6, 1.4, C.white, { x: 1.4, y: 3 }); hipRoof(g, 1.8, .8, 1.6, C.roof, { x: 1.4, y: 4.6 }); });
    for (let i = 0; i < 10; i++) b.sphere(.2, MOSAIC[i % 5], { x: (i % 2 ? 2.3 : -2.3), y: .2, z: -4 + i * .9 }, 6);
  } },
  'granada|Mirador de San Nicolás': { h: 7.5, build(b) {
    plaza(b, 4.3, '#efe3cc');
    b.box(6.6, .5, .25, C.dark, { z: 3.9, y: .3 }); for (let i = 0; i < 12; i++) b.box(.06, .6, .06, C.dark, { x: -3.2 + i * .58, z: 3.9 });
    b.group({ z: -2 }, g => { g.box(3.6, 3.4, 2.8, C.white); gable(g, 3.8, 1.2, 3, C.roof, { y: 3.4 }); door(g, .8, 1.2, 1.42, C.choco); g.win(.5, .5, { y: 2.4, z: 1.42 }); });
    b.group({ x: 2.4, z: -2.6 }, g => { g.box(1.3, 5.6, 1.3, C.white); g.box(1.4, .2, 1.4, C.cream, { y: 5.6 }); for (const x of [-.3, .3]) g.box(.3, .7, .06, C.dark, { x, y: 4.6, z: .66 }); hipRoof(g, 1.5, .9, 1.5, C.roof, { y: 5.8 }); });
    bench(b, -2, 2.6); bench(b, 1, 2.6); tree(b, -3.2, -.2, .7, 'round'); tree(b, 3.5, .8, .65, 'cypress');
    for (const x of [-1.5, 1.5]) b.group({ x, z: 1.2 }, g => { g.cyl(.2, .25, .7, MOSAIC[x > 0 ? 2 : 0], {}, 8); g.sphere(.22, '#f7d8b8', { y: .9 }, 8); });
  } },
  'granada|souvenir': { h: 5.5, build: souvenirShop('#e8574a', '#2fc4b2') },

  // ===== BARCELONA =====
  'barcelona|Basílica de la Sagrada Família': { h: 21, build(b) {
    plaza(b, 8.4, '#e9d5b0');
    const s = '#e2c595', s2 = '#d1ad78';
    b.box(9, 5, 6, s, { z: -.6 });
    gable(b, 6.2, 2.4, 9.2, s2, { y: 5, z: -.6, ry: Math.PI / 2 });
    for (let i = 0; i < 4; i++) b.win(.7, 2.6, { x: -3 + i * 2, y: 1.4, z: 2.42 }, MOSAIC[i]);
    const spire = (x, z, h, r, top) => {
      b.lathe([[0, 0], [r, 0], [r * 1.05, h * .45], [r * .8, h * .78], [r * .35, h * .97], [0, h]], s, { x, z }, 12);
      for (let k = 0; k < 6; k++) b.box(.12, .3, .05, C.dark, { x, y: h * (.2 + k * .1), z: z + r * (1 - k * .06) });
      b.sphere(r * .48, top, { x, y: h + r * .2 }, 10);
      for (let k = 0; k < 6; k++) b.sphere(r * .2, MOSAIC[k], { x: x + Math.cos(k) * r * .5, y: h + r * .2 + Math.sin(k * 2) * r * .3, z: z + Math.sin(k) * r * .5 }, 6);
    };
    spire(-3.2, 2.2, 12, .95, C.red); spire(-1.1, 2.6, 14, 1.05, C.yellow); spire(1.1, 2.6, 14, 1.05, '#ff7bc4'); spire(3.2, 2.2, 12, .95, C.teal);
    spire(-3.2, -3.4, 11, .9, C.orange); spire(3.2, -3.4, 11, .9, C.green);
    b.lathe([[0, 0], [1.6, 0], [1.5, 8], [1, 14], [.4, 18], [0, 18.6]], '#ece0c6', { z: -.6 }, 14);
    b.box(.2, 1.6, .2, C.white, { z: -.6, y: 18.4 }, 'light'); b.box(1.2, .2, .2, C.white, { z: -.6, y: 19.4 }, 'light'); b.box(.2, .2, 1.2, C.white, { z: -.6, y: 19.4 }, 'light');
    b.lathe([[0, 0], [1.1, 0], [1, 6], [.5, 11], [0, 11.8]], '#ece0c6', { z: -2.4, x: 1.6 }, 12);
    b.sphere(.5, C.white, { z: -2.4, x: 1.6, y: 12.1 }, 10, 'light');
    b.group({ x: -6.3, z: -3.2 }, g => { // construction crane
      g.box(.5, 13, .5, C.yellow);
      for (let i = 0; i < 13; i++) g.box(.55, .06, .55, C.dark, { y: i + .5 });
      g.box(9, .45, .45, C.yellow, { x: 2.4, y: 13 }); g.box(1.2, .9, .9, C.dark, { x: -1.6, y: 12.4 });
      g.box(.04, 3.2, .04, C.dark, { x: 5, y: 9.9 }); g.box(.5, .4, .5, C.red, { x: 5, y: 9.6 });
    });
    door(b, 1.4, 2, 2.62, '#4e7a3a');
    tree(b, 6.8, 3.4, .8); tree(b, -6.8, 4, .8);
  } },
  'barcelona|Casa Batlló': { h: 9.5, build(b) {
    b.box(4.2, 6.6, 3, '#eaf2f0', {});
    for (let i = 0; i < 70; i++) { const x = -1.9 + (i * 37 % 19) / 19 * 3.8, y = 1.6 + (i * 53 % 23) / 23 * 4.8; b.sphere(.13, MOSAIC[i % 8], { x, y, z: 1.52, sz: .4 }, 6); }
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) b.group({ x: -.9 + c * 1.8, y: 2.5 + r * 1.35, z: 1.55 }, g => { g.win(.8, .8, {}, '#9fd9ff'); g.dome(.42, C.white, { y: -.05, z: .12, rx: Math.PI / 2, sz: .5 }, 10); g.sphere(.08, C.dark, { x: -.15, y: .25, z: .3 }, 6); g.sphere(.08, C.dark, { x: .15, y: .25, z: .3 }, 6); });
    for (let i = 0; i < 4; i++) b.cyl(.12, .2, 1.5, '#efe6d8', { x: -1.5 + i, z: 1.6 }, 8);
    b.box(4.1, 1.5, .1, '#3d5a6c', { z: 1.52 });
    for (let i = 0; i < 9; i++) { const t = i / 8; b.sphere(.55 - Math.abs(t - .5) * .4, ['#5fd0b5', '#3fa7ff', '#8f7cff', '#ff8fb1', '#ffb36b'][i % 5], { x: -2 + t * 4, y: 6.7 + Math.sin(t * Math.PI) * .8, z: .2, sx: .8, sz: 1.8 }, 8); }
    b.cyl(.22, .26, 1.6, '#f3e6c9', { x: -1.6, y: 6.6, z: 1 }, 8); b.sphere(.38, '#ffd23f', { x: -1.6, y: 8.4, z: 1 }, 10); b.box(.1, .6, .1, C.gold, { x: -1.6, y: 8.75, z: 1 }); b.box(.5, .1, .1, C.gold, { x: -1.6, y: 9.05, z: 1 });
  } },
  'barcelona|Casa Milà / La Pedrera': { h: 8.5, build(b) {
    const wavy = (w, d, amp, phase) => { const s = new THREE.Shape(); const pts = 48; for (let i = 0; i <= pts; i++) { const t = i / pts * Math.PI * 2; const r = 1 + Math.sin(t * 6 + phase) * amp; const x = Math.cos(t) * w / 2 * r, y = Math.sin(t) * d / 2 * r; i ? s.lineTo(x, y) : s.moveTo(x, y); } return s; };
    for (let f = 0; f < 6; f++) {
      b.extrude(wavy(8.4, 6.4, .05, f * .6), 1.05, f % 2 ? '#efe2c8' : '#f6ecd6', { y: f * 1.05, rx: -Math.PI / 2 });
      if (f > 0) for (let i = 0; i < 9; i++) { const a = Math.PI * .1 + i / 8 * Math.PI * .8; b.box(.65, .35, .2, C.dark, { x: Math.cos(a) * 4.3, y: f * 1.05 + .1, z: Math.sin(a) * 3.3, ry: -a + Math.PI / 2 }); b.win(.4, .5, { x: Math.cos(a) * 4.15, y: f * 1.05 + .3, z: Math.sin(a) * 3.15, ry: -a + Math.PI / 2 }, '#ffe2a0'); }
    }
    b.extrude(wavy(7.6, 5.6, .07, 1), .6, '#f9f1e0', { y: 6.3, rx: -Math.PI / 2 });
    for (const [x, z] of [[-2.2, -.8], [-.6, 1.2], [1.2, -.6], [2.6, 1], [0, -1.8], [-2.4, 1.4]]) b.group({ x, z, y: 6.9 }, g => { g.cyl(.3, .45, 1.1, C.white, {}, 8); g.cyl(.4, .3, .4, '#f2e2c4', { y: 1.1 }, 8); g.cone(.32, .5, C.white, { y: 1.5 }, 6); g.box(.36, .1, .1, C.dark, { y: 1.25, z: .33 }); });
  } },
  'barcelona|Park Güell': { h: 7, build(b, R) {
    b.cyl(9, 9, .14, '#93d26a', { y: .01 }, 30);
    b.group({ z: -2.2 }, g => {
      g.cyl(4.2, 4.6, 2.4, '#e2c79c', { sz: .8 }, 24);
      for (let i = 0; i < 12; i++) { const a = Math.PI * .1 + i / 11 * Math.PI * .8; g.cyl(.24, .28, 2.4, '#efe1c4', { x: Math.cos(a) * 4.4, z: Math.sin(a) * 3.6 }, 10); }
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2, r = 4.1 + Math.sin(a * 7) * .3; g.box(.62, .55, .32, MOSAIC[i % 8], { x: Math.cos(a) * r, y: 2.4, z: Math.sin(a) * r * .8, ry: -a }); }
      g.cyl(3.7, 3.7, .06, '#f2e1bf', { y: 2.4, sz: .8 }, 22);
    });
    for (let i = 0; i < 6; i++) b.box(2.6 - i * .1, .25, .7, '#e7d3ad', { y: i * .25, z: 4.2 - i * .7 });
    b.group({ z: 2.6, y: .3 }, g => { // mosaic salamander on the stairs
      for (let i = 0; i < 5; i++) g.sphere(.38 - i * .05, MOSAIC[(i * 3) % 8], { z: -i * .45, y: .3 + i * .08, sx: 1.1 }, 8);
      g.sphere(.32, C.green, { z: .45, y: .35 }, 8); g.sphere(.07, C.dark, { x: .18, y: .5, z: .6 }, 6); g.sphere(.07, C.dark, { x: -.18, y: .5, z: .6 }, 6);
      for (const x of [-.4, .4]) for (const z of [0, -1.1]) g.sphere(.12, C.yellow, { x, z, y: .1 }, 6);
    });
    for (const s of [-1, 1]) b.group({ x: s * 5.6, z: 4.6 }, g => { // gingerbread houses
      g.box(2.2, 2.2, 2, '#c88d5c'); g.box(2.2, .2, 2, C.white, { y: 1.4 });
      for (let i = 0; i < 4; i++) g.cone(1.3 - i * .25, .5, i % 2 ? C.white : '#5bb6ff', { y: 2.2 + i * .45 }, 12);
      g.cyl(.1, .14, 1.4, C.white, { y: 4 }, 8); g.sphere(.25, C.red, { y: 5.5, sy: .6 }, 8); for (let i = 0; i < 5; i++) g.sphere(.06, C.white, { x: Math.cos(i * 1.3) * .2, y: 5.6, z: Math.sin(i * 1.3) * .2 }, 4);
      g.win(.5, .6, { y: .8, z: 1.02 }, '#9fd9ff'); door(g, .5, .7, 1.02, C.choco);
    });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + R() * .3, r = 7.4 + R() * 1; tree(b, Math.cos(a) * r, Math.sin(a) * r * .9, .7 + R() * .3, i % 3 ? 'palm' : 'pine'); }
  } },
  'barcelona|Casa Vicens': { h: 7, build(b) {
    b.box(5, .5, 4.4, '#3e8f5c', {}); for (let i = 0; i < 18; i++) b.box(.08, .9, .08, '#3e8f5c', { x: -2.4 + (i % 9) * .6, y: .5, z: i < 9 ? 2.2 : -2.2 });
    b.box(4, 4, 3.4, '#d97b4a', { y: .1 });
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) if ((r + c) % 2 === 0) b.box(.42, .42, .06, r % 3 === 1 ? '#2f9e6b' : C.white, { x: -1.75 + c * .5, y: 1.4 + r * .45, z: 1.72 });
    for (const x of [-1.4, 1.4]) { b.win(.7, 1, { x, y: .6, z: 1.73 }, '#ffe2a0'); b.box(.9, .12, .3, '#2f9e6b', { x, y: .5, z: 1.86 }); }
    b.box(4.2, .3, 3.6, C.white, { y: 4.1 });
    for (const [x, z] of [[-1.8, 1.5], [1.8, 1.5], [-1.8, -1.5], [1.8, -1.5]]) { b.cyl(.38, .38, 1.1, '#d97b4a', { x, z, y: 4.4 }, 10); b.dome(.42, '#2f9e6b', { x, z, y: 5.5 }, 10); b.sphere(.1, C.gold, { x, z, y: 6 }, 6); }
    b.box(2, 1.2, 1.8, '#d97b4a', { y: 4.4 }); b.dome(.8, C.white, { y: 5.6 }, 10);
  } },
  'barcelona|Recinte Modernista de Sant Pau': { h: 9, build(b) {
    plaza(b, 7, '#e9d2b2');
    const brick = '#cf6d48';
    b.group({ z: -2.8 }, g => {
      g.box(8.4, 3.8, 2.6, brick); g.box(8.6, .3, 2.8, C.cream, { y: 3.8 });
      g.box(2.2, 6.2, 2.8, brick); g.box(1.4, 1.8, 1.4, C.cream, { y: 6.2 });
      g.cyl(.55, .55, .12, C.white, { y: 7, z: .72, rx: Math.PI / 2 }, 14, 'light'); g.cyl(.03, .03, .4, C.dark, { y: 7, z: .8, rx: Math.PI / 2 }, 4);
      g.cone(.9, 1.8, '#3fb68a', { y: 8, ry: Math.PI / 4 }, 4); g.sphere(.18, C.gold, { y: 9.9 }, 6);
      windows(g, { w: 8, y0: .6, rows: 3, cols: 8, z: 1.32, h: .7, ww: .45, rowGap: 1.05, color: '#ffe6a6' });
      for (const x of [-3.6, 3.6]) { g.cyl(.6, .6, 1.4, brick, { x, y: 3.8 }, 10); g.dome(.7, '#ffcf3d', { x, y: 5.2 }, 10); }
    });
    for (const s of [-1, 1]) b.group({ x: s * 4.6, z: 2.6, ry: -s * .2 }, g => { g.box(3, 3, 3, brick); g.box(3.2, .25, 3.2, C.cream, { y: 3 }); g.dome(1.3, s > 0 ? '#3fa7ff' : '#3fb68a', { y: 3.25 }, 14); for (let i = 0; i < 8; i++) g.sphere(.16, MOSAIC[i], { x: Math.cos(i * .8) * 1, y: 3.8 + (i % 2) * .3, z: Math.sin(i * .8) * 1 }, 6); windows(g, { w: 2.6, y0: .6, rows: 2, cols: 3, z: 1.52, h: .7, ww: .45, rowGap: 1.1 }); });
    tree(b, 0, 2.6, .8, 'orange'); bench(b, -1.6, 4.8); bench(b, 1.6, 4.8);
  } },
  'barcelona|Avinguda de Gaudí': { h: 4, build(b) {
    b.box(3, .06, 9, '#f1dfc0', { y: .02, ry: .6 });
    for (let i = -2; i <= 2; i++) { const x = Math.sin(.6) * i * 1.8, z = Math.cos(.6) * i * 1.8; b.group({ x: x + Math.cos(.6) * 1.3, z: z - Math.sin(.6) * 1.3 }, g => { g.cyl(.08, .12, 2.6, C.iron, {}, 6); for (let k = 0; k < 4; k++) g.sphere(.18, '#fff2a8', { x: Math.cos(k * 1.57) * .35, y: 2.5, z: Math.sin(k * 1.57) * .35 }, 6, 'light'); g.sphere(.15, MOSAIC[(i + 5) % 8], { y: 2.8 }, 6); }); tree(b, x - Math.cos(.6) * 1.4, z + Math.sin(.6) * 1.4, .65, 'round'); }
  } },
  'barcelona|Passeig de Gràcia': { h: 5, build(b) {
    b.box(4, .05, 11, '#5f6474', { y: .02, ry: .25 });
    b.box(1.4, .06, 11, '#ece0cb', { y: .03, x: 2.6, ry: .25 }); b.box(1.4, .06, 11, '#ece0cb', { y: .03, x: -2.6, ry: .25 });
    for (let i = -2; i <= 2; i++) {
      const z = i * 2.2, x = z * .255;
      for (const s of [-1, 1]) b.group({ x: x + s * 2.6, z: z - s * .1 }, g => { // trencadís bench-lamp
        g.box(1.2, .55, .5, '#f0e2c6'); for (let k = 0; k < 5; k++) g.box(.2, .1, .5, MOSAIC[(k + i + 8) % 8], { x: -.45 + k * .22, y: .55 });
        g.cyl(.08, .1, 2.8, C.iron, { y: .5 }, 6); g.torus(.3, .05, C.iron, { y: 3.2, rx: Math.PI / 2 }, Math.PI * 2, 10); g.sphere(.2, '#fff2a8', { y: 3.4 }, 6, 'light');
      });
      lights(b, x - 2.6, z, x + 2.6, z, 3.8, 9);
    }
  } },
  'barcelona|Plaça d’Espanya': { h: 10, build(b) {
    b.cyl(6.4, 6.4, .06, '#e8d7b9', { y: .01 }, 28);
    fountain(b, 2.2, {}, 1);
    b.cyl(.45, .55, 5.2, C.stone, { y: .6 }, 10); b.sphere(.5, C.gold, { y: 6, sy: 1.3 }, 8);
    for (const s of [-1, 1]) b.group({ x: s * 1.9, z: -4.6 }, g => { g.box(1.5, 7.8, 1.5, '#cf6d48'); g.box(1.7, .3, 1.7, C.cream, { y: 7.8 }); g.box(1.2, 1.2, 1.2, '#cf6d48', { y: 8.1 }); for (const x of [-.25, .25]) g.box(.2, .6, .06, C.dark, { x, y: 8.4, z: .62 }); g.cone(.95, 1.7, '#d38f45', { y: 9.3, ry: Math.PI / 4 }, 4); windows(g, { w: 1, y0: 1.5, rows: 4, cols: 1, z: .77, h: .6, ww: .3, rowGap: 1.4 }); });
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + .78; lamp(b, Math.cos(a) * 4.2, Math.sin(a) * 4.2); }
    for (let i = 0; i < 10; i++) b.sphere(.2, MOSAIC[i % 7], { x: Math.cos(i * .63) * 5.6, y: 3.6 - Math.abs(Math.sin(i * .63)) * .2, z: Math.sin(i * .63) * 5.6 }, 6, 'light');
  } },
  'barcelona|Arenas de Barcelona': { h: 6, build(b) {
    b.cyl(4.2, 4.2, 4.2, '#c9573e', {}, 26);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; b.group({ x: Math.cos(a) * 4.22, z: Math.sin(a) * 4.22, ry: -a + Math.PI / 2 }, g => { g.torus(.4, .1, C.cream, { y: 2.6 }, Math.PI, 10); g.box(.8, 2.6, .05, '#8a3a2a', { y: 0 }); g.win(.5, .5, { y: 3.4 }, '#ffe2a0'); }); }
    b.cyl(4.3, 4.3, .3, C.cream, { y: 4.2 }, 26);
    b.dome(3.4, C.glass, { y: 4.4, sy: .45 }, 18, 'glass');
    for (let i = 0; i < 8; i++) b.box(.1, .1, 6.8, C.white, { y: 5.4, ry: i * Math.PI / 8 });
  } },
  'barcelona|Port Vell': { h: 10, build(b) {
    b.box(12, .1, 6, C.water, { y: .02, z: 1 });
    b.box(12.6, .3, .6, C.stone, { z: -2.2 });
    for (let i = 0; i < 4; i++) b.box(.5, .25, 2.2, C.wood, { x: -4.5 + i * 3, y: .08, z: -1 });
    for (const [x, z, c] of [[-3, 1, C.white], [0, 2.2, '#ffdd4a'], [3, .6, C.white], [5, 2.6, '#ff8fb1']]) b.group({ x, z, y: .05, ry: .3 }, g => { g.box(2, .5, .8, c); g.box(1.9, .1, .7, C.wood, { y: .5 }); g.cyl(.05, .05, 2.4, C.wood, { y: .5 }, 4); const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(1, 0); sh.lineTo(0, 2); sh.closePath(); g.extrude(sh, .04, C.white, { x: .06, y: .7 }); });
    b.group({ x: -5.2, z: -4.4 }, g => { // Columbus column
      g.box(2.4, 1.4, 2.4, C.stone); g.cyl(.5, .6, 1.4, '#9f8a6b', { y: 1.4 }, 10); g.cyl(.3, .36, 5.4, '#9f8a6b', { y: 2.8 }, 10);
      g.sphere(.7, C.gold, { y: 8.6, sx: 1.2, sy: .5 }, 10); g.cyl(.18, .22, .9, '#7f6a4b', { y: 8.9 }, 8); g.sphere(.2, '#7f6a4b', { y: 10 }, 8); g.box(.7, .1, .1, '#7f6a4b', { x: .4, y: 9.6, rz: .2 });
    });
    b.box(1.8, .2, 5, '#c79b6a', { x: 4, y: .25, z: -4.6, ry: .4 });
  } },
  'barcelona|Platja de la Barceloneta': { h: 7, build(b) {
    b.cyl(7.4, 7.4, .12, '#ffe39a', { y: .01 }, 28);
    b.cyl(5, 5, .14, C.water, { y: .02, x: 3.6, z: 2.6, sx: 1, sz: .9 }, 24);
    for (const [x, z, c] of [[-3, -1, C.red], [-1, 1.6, C.yellow], [-4.4, 2.6, C.blue], [-1.8, -3.6, '#ff8fb1'], [1, -2.6, C.green]]) b.group({ x, z }, g => { g.cyl(.04, .04, 1.7, C.white, {}, 4); g.cone(1, .5, c, { y: 1.5 }, 8); g.box(1, .06, .5, C.white, { x: .7, y: .05, z: .2 }); });
    b.group({ x: -5.6, z: -1.4 }, g => { g.box(.1, 2, .1, C.wood, { x: -.4, z: -.4 }); g.box(.1, 2, .1, C.wood, { x: .4, z: -.4 }); g.box(.1, 2, .1, C.wood, { x: -.4, z: .4 }); g.box(.1, 2, .1, C.wood, { x: .4, z: .4 }); g.box(1.2, .9, 1.2, C.red, { y: 2 }); g.box(1.4, .15, 1.4, C.white, { y: 2.9 }); });
    tree(b, -6, 3.6, .8, 'palm'); tree(b, -3.6, 5.2, .8, 'palm'); tree(b, -6.4, -4, .8, 'palm');
    b.group({ x: 1.6, z: -5.2, ry: -.4 }, g => { g.sphere(1.3, C.gold, { y: 2.4, sx: 2.2, sy: 1, sz: .7 }, 12); g.cone(.9, 1.2, C.gold, { x: -3, y: 2.4, rz: Math.PI / 2 }, 8); for (let i = 0; i < 4; i++) g.cyl(.08, .08, 1.8, C.grey, { x: -1.5 + i, y: 0 }, 4); });
  } },
  'barcelona|El Born / Santa Maria del Mar': { h: 9.5, build(b) {
    plaza(b, 5, '#e9d9bd');
    const s = '#d9c39a';
    b.box(5, 5, 6.4, s, { z: -.8 }); gable(b, 5.2, 1.8, 6.6, '#c9ab7a', { y: 5, z: -.8 });
    for (const x of [-2.6, 2.6]) { b.cyl(.8, .85, 8, s, { x, z: 2, ry: Math.PI / 8 }, 8); b.cyl(.9, .9, .3, '#c9ab7a', { x, y: 8, z: 2 }, 8); for (let i = 0; i < 3; i++) b.box(.25, .9, .05, C.dark, { x, y: 5.5 + i * .01, z: 2.82 }); }
    b.cyl(1.2, 1.2, .12, '#3fa7ff', { y: 3.6, z: 2.42, rx: Math.PI / 2 }, 16, 'light');
    for (let i = 0; i < 8; i++) b.cyl(.06, .06, .12, MOSAIC[i], { x: Math.cos(i * .785) * .7, y: 3.6 + Math.sin(i * .785) * .7, z: 2.5, rx: Math.PI / 2 }, 6, 'light');
    door(b, 1.2, 1.8, 2.42, C.choco);
  } },
  'barcelona|Palau Güell': { h: 8, build(b) {
    b.box(4.4, 5.4, 3.4, '#b9ac93', {});
    for (const x of [-1, 1]) { b.box(1.2, 2.2, .12, C.dark, { x, z: 1.72 }); b.torus(.6, .12, C.dark, { x, y: 2.2, z: 1.75 }, Math.PI, 10); }
    windows(b, { w: 4, y0: 3, rows: 2, cols: 4, z: 1.72, h: .7, ww: .5, rowGap: 1.1 });
    b.box(4.6, .3, 3.6, '#9e917a', { y: 5.4 });
    b.cone(.7, 2.4, '#d6d1c5', { y: 5.7 }, 10); b.sphere(.25, C.gold, { y: 8.2 }, 6);
    for (let i = 0; i < 10; i++) { const x = -1.8 + (i % 5) * .9, z = i < 5 ? -1.2 : 1; b.cyl(.2, .3, .9, MOSAIC[i % 8], { x, z, y: 5.7 }, 8); b.sphere(.24, MOSAIC[(i + 3) % 8], { x, z, y: 6.7 }, 6); }
  } },
  'barcelona|Museu Picasso': { h: 7, build(b) {
    b.box(5, 4.6, 3.6, '#e2d2b4', {}); b.box(5.2, .3, 3.8, '#c9b48d', { y: 4.6 });
    door(b, 1.1, 1.6, 1.82, C.choco); windows(b, { w: 4.4, y0: 2.2, rows: 2, cols: 4, z: 1.82, h: .8, ww: .45, rowGap: 1.1 });
    b.group({ x: 1.6, z: 3, ry: -.3 }, g => { // easel with a cubist painting
      g.box(.1, 2.6, .1, C.wood, { x: -.6, rx: -.15 }); g.box(.1, 2.6, .1, C.wood, { x: .6, rx: -.15 }); g.box(.1, 2.6, .1, C.wood, { z: -.5, rx: .25 });
      g.box(1.8, 1.4, .08, C.white, { y: 1.2, z: .12 });
      for (const [x, y, w, h, c] of [[-.4, 1.5, .6, .5, C.blue], [.3, 1.8, .7, .5, C.yellow], [.1, 1.3, .5, .6, C.red], [-.5, 2.1, .4, .4, C.teal], [.55, 1.3, .4, .45, C.dark]]) g.box(w, h, .05, c, { x, y, z: .17, rz: x });
    });
    b.group({ x: -1.8, y: 4.9 }, g => { g.cyl(.8, .8, .1, '#e7c089', { rx: Math.PI / 2 }, 14); for (let i = 0; i < 5; i++) g.sphere(.14, MOSAIC[i], { x: Math.cos(i * 1.2) * .45, y: Math.sin(i * 1.2) * .45, z: .1 }, 6); });
  } },
  'barcelona|Mercat de la Boqueria': { h: 6, build(b) {
    b.box(7, 3.6, 5, '#e7e0cf', { z: -.8 });
    b.box(7.2, .2, 5.2, C.iron, { y: 3.6, z: -.8 }); gable(b, 7.2, 1.2, 5.2, '#7a8597', { y: 3.8, z: -.8 });
    b.group({ z: 1.8 }, g => { // stained glass entrance arch
      g.box(.4, 3.8, .4, C.iron, { x: -2 }); g.box(.4, 3.8, .4, C.iron, { x: 2 });
      g.torus(2, .25, C.iron, { y: 3.8 }, Math.PI, 18);
      for (let i = 0; i < 9; i++) { const a = i / 8 * Math.PI; g.box(.5, .5, .08, MOSAIC[i % 8], { x: Math.cos(a) * 1.6, y: 3.8 + Math.sin(a) * 1.4 }, 'light'); }
      g.box(3.2, .5, .1, C.iron, { y: 4.4 }); g.box(2.8, .3, .12, C.yellow, { y: 4.5 }, 'light');
    });
    for (let i = 0; i < 3; i++) b.group({ x: -2.2 + i * 2.2, z: 3.6 }, g => { g.box(1.6, .9, .9, C.wood); for (let k = 0; k < 6; k++) g.sphere(.16, [C.red, C.orange, C.yellow, C.green, C.pink, C.purple][(k + i) % 6], { x: -.55 + k * .22, y: 1, z: (k % 2) * .2 - .1 }, 6); g.box(1.8, .08, 1.1, [C.red, C.green, C.yellow][i], { y: 1.8, rx: .2 }); g.box(.06, .9, .06, C.wood, { x: -.75, y: .9, z: .4 }); g.box(.06, .9, .06, C.wood, { x: .75, y: .9, z: .4 }); });
  } },
  'barcelona|Cripta de la Colònia Güell': { h: 6, build(b, R) {
    b.cyl(4.8, 4.8, .12, '#7cc35c', { y: .01 }, 24);
    b.box(4.2, 2.4, 3.6, '#8f5b3c', { z: -.4 });
    for (let i = 0; i < 5; i++) b.cyl(.22, .3, 2.6, '#6e4a33', { x: -1.8 + i * .9, z: 1.7, rz: (i - 2) * .12 }, 8);
    b.box(4.8, .3, 1.4, '#6e4a33', { y: 2.4, z: 1.2 });
    for (let i = 0; i < 5; i++) b.win(.4, .6, { x: -1.6 + i * .8, y: 1, z: 1.42 }, MOSAIC[i]);
    b.box(4.4, .5, 3.8, '#a46d48', { y: 2.4, z: -.4 });
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2, r = 3.6 + R() * .8; tree(b, Math.cos(a) * r, Math.sin(a) * r, .75, 'pine'); }
  } },
  'barcelona|souvenir': { h: 5.5, build: souvenirShop('#3fa7ff', '#ff5a5f') },

  // ===== TRANSPORT =====
  'transport|atocha': { h: 7, build(b) {
    b.box(9, 3.2, 4.6, '#d9754c', { z: -.2 });
    b.cyl(2.3, 2.3, 9, C.glass, { y: 3.2, rz: Math.PI / 2, x: 4.5, sx: 1, sz: 1 }, 16, 'glass');
    for (let i = 0; i < 6; i++) b.torus(2.3, .1, C.iron, { x: -4 + i * 1.6, y: 3.2, ry: Math.PI / 2, z: -.2 }, Math.PI, 14);
    b.box(9.2, .3, 4.8, C.cream, { y: 3.1, z: -.2 });
    b.cyl(.6, .6, .1, C.white, { y: 2.2, z: 2.12, rx: Math.PI / 2 }, 14, 'light');
    windows(b, { w: 8, y0: .4, rows: 1, cols: 7, z: 2.12, h: 1.3, ww: .7 });
    for (const x of [-3, 0, 3]) tree(b, x, 3.6, .7, 'palm');
  } },
  'transport|santa-justa': { h: 5, build(b) {
    b.box(8, 2.6, 4.4, C.white, {});
    b.box(8.4, .4, 4.8, '#f0b44c', { y: 2.6 });
    for (let i = 0; i < 5; i++) b.dome(.8, C.white, { x: -3.2 + i * 1.6, y: 2.9, sy: .6 }, 10);
    b.box(7.6, 1.6, .1, C.glass, { y: .2, z: 2.22 }, 'glass');
    b.box(3, .5, .12, '#7a3fb6', { y: 2.1, z: 2.3 }, 'light');
    tree(b, -4.6, 3, .7, 'orange'); tree(b, 4.6, 3, .7, 'orange');
  } },
  'transport|plaza-armas': { h: 5, build(b) {
    b.box(7, 3.2, 3.8, '#f4e1c0', {});
    b.box(3, 4.6, 4, '#f4e1c0', {});
    for (const x of [-2.6, 2.6]) b.dome(.7, '#3f8ccf', { x, y: 3.2 }, 10);
    b.torus(1, .2, C.cream, { y: 2.2, z: 2.02 }, Math.PI, 12); b.box(2, 2.2, .1, C.glass, { z: 1.96 }, 'glass');
    b.box(2.4, .45, .12, '#d1442f', { y: 3.9, z: 2.05 }, 'light');
  } },
  'transport|granada-bus': { h: 4.5, build(b) {
    b.box(7, 2.6, 3.6, '#e9e2d4', {}); b.box(7.6, .35, 4.4, '#c45a3a', { y: 2.6 });
    b.box(6.6, 1.5, .1, C.glass, { y: .2, z: 1.82 }, 'glass');
    b.box(2.4, .45, .12, '#d1442f', { y: 2.1, z: 1.9 }, 'light');
    for (let i = 0; i < 3; i++) b.box(.15, 2.4, .15, C.dark, { x: -2.6 + i * 2.6, z: 2.6 });
    b.box(7, .2, 1.4, '#c45a3a', { y: 2.4, z: 2.6 });
  } },
  'transport|mad': airport('#e2553a'),
  'transport|grx': airport('#2fc4b2'),
  'transport|bcn': airport('#3fa7ff'),
  'transport|tpe': airport('#ff5a5f', true),
  'transport|pvg': { h: 4, build(b) { b.box(.25, 3, .25, C.dark, {}); b.box(2.6, .9, .15, C.blue, { y: 2.4 }); b.box(2.4, .5, .17, C.white, { y: 2.6 }, 'light'); b.box(2.6, .9, .15, C.orange, { y: 1.3, ry: .3 }); } },
  'transport|fgc-guell': metro(), 'transport|fgc-espanya': metro(),
};

Object.assign(LANDMARKS, {
  // ===== extra real landmarks (scenery) =====
  'madrid|Puerta del Sol': { h: 7, build(b) {
    b.cyl(4.3, 4.3, .06, '#eedcbc', { y: .01 }, 26);
    b.group({ z: -2.4 }, g => { g.box(6.4, 3.4, 2.2, '#d9714f'); g.box(6.6, .3, 2.4, C.white, { y: 3.4 }); windows(g, { w: 6, y0: .5, rows: 2, cols: 7, z: 1.12, h: .7, ww: .4, rowGap: 1.2 });
      g.box(1.6, 1.8, 1.6, C.white, { y: 3.7 }); g.cyl(.55, .55, .1, C.white, { y: 4.6, z: .82, rx: Math.PI / 2 }, 14, 'light'); g.cone(.6, 1.1, C.slate, { y: 5.5 }, 8); g.sphere(.22, C.gold, { y: 6.7 }, 8, 'light'); });
    b.group({ x: 2.2, z: 1.6 }, g => { g.box(.9, .7, .9, C.stone); g.cyl(.12, .16, 1.2, C.trunk, { y: .7 }, 6); g.sphere(.6, '#3f7d4a', { y: 2.1 }, 8); for (let i = 0; i < 5; i++) g.sphere(.1, C.red, { x: Math.cos(i) * .45, y: 2 + (i % 2) * .3, z: Math.sin(i) * .45 }, 5); g.sphere(.32, '#7a5a3a', { x: -.25, y: 1.1, z: .2, sx: 1.1, sy: 1.2 }, 8); g.sphere(.18, '#7a5a3a', { x: -.2, y: 1.6, z: .32 }, 6); });
    fountain(b, 1.2, { x: -2.4, z: 1.4 }, 1);
    b.box(.9, .05, .5, C.white, { y: .07, z: .2 });
    tree(b, -3.3, -.2, .9, 'xmas');
  } },
  'madrid|Templo de Debod': { h: 4.5, build(b) {
    b.box(7.4, .1, 3.6, C.water, { y: .04, z: .2 });
    b.box(7.8, .14, 4, C.stone, { y: 0, z: .2, sy: .5 });
    for (const z of [2.4, 1]) b.group({ z }, g => { g.box(.6, 2.2, .6, '#e7d3a6', { x: -.7 }); g.box(.6, 2.2, .6, '#e7d3a6', { x: .7 }); g.box(2.2, .5, .7, '#e7d3a6', { y: 2.2 }); });
    b.group({ z: -1.4 }, g => { g.box(2.6, 2.6, 2.8, '#e7d3a6'); g.box(2.8, .3, 3, '#d8bf8c', { y: 2.6 }); g.box(.8, 1.4, .1, C.dark, { y: 0, z: 1.42 }); });
    tree(b, -3.4, -2, .7, 'pine'); tree(b, 3.4, -2, .7, 'pine');
  } },
  'madrid|Catedral de la Almudena': { h: 9, build(b) {
    b.box(5.6, 4, 7, '#eef0f2', { z: -.6 });
    b.box(5.8, .3, 7.2, '#c9ced6', { y: 4, z: -.6 });
    b.cyl(1.7, 1.8, 1.4, '#eef0f2', { y: 4.2, z: -1.2 }, 16); b.dome(1.9, '#7f97b5', { y: 5.6, z: -1.2, sy: 1.2 }, 16); b.cyl(.3, .4, .8, '#eef0f2', { y: 7.8, z: -1.2 }, 8); b.sphere(.18, C.gold, { y: 8.8, z: -1.2 }, 6, 'light');
    for (const x of [-2.2, 2.2]) { b.box(1.3, 5.8, 1.3, '#eef0f2', { x, z: 2.4 }); b.dome(.6, '#7f97b5', { x, y: 5.8, z: 2.4 }, 10); }
    colonnade(b, 4, 2.4, 2.6, .14, C.white, { y: .4, z: 2.95 }); b.box(3.2, .5, .9, '#dfe2e7', { y: 3, z: 2.95 });
    door(b, .9, 1.4, 2.92, '#6b4a33');
  } },
  'madrid|Cuatro Torres': { h: 18, build(b) {
    b.cyl(4.4, 4.4, .06, '#dde3ea', { y: .01 }, 20);
    b.group({ x: -2.6, z: -1.6 }, g => { g.box(1.8, 15, 1.8, '#9fc7e6', {}, 'glass'); g.box(1.9, 15, .2, '#e9eef5', { z: .95 }); g.box(2.3, .6, .4, '#e9eef5', { y: 15 }); g.box(.2, 3.2, 1.9, '#e9eef5', { x: -1.05, y: 12.4 }); g.box(.2, 3.2, 1.9, '#e9eef5', { x: 1.05, y: 12.4 }); });
    b.group({ x: 0, z: -2.4 }, g => { g.box(2, 16.5, 2, '#7fb0d6', {}, 'glass'); for (let i = 0; i < 16; i++) g.box(2.05, .08, 2.05, C.white, { y: i * 1.03 }); g.box(1.2, 1.2, 1.2, C.white, { y: 16.5 }); });
    b.group({ x: 2.6, z: -1.4 }, g => { g.cyl(1, 1.15, 14, '#b4d7ee', {}, 10, 'glass'); g.cyl(1.05, 1.05, .4, C.white, { y: 14 }, 10); for (let i = 0; i < 7; i++) g.cyl(1.17, 1.17, .12, '#d8e4ee', { y: i * 2 }, 10); });
    b.group({ x: 1, z: 1.6 }, g => { g.box(2, 13, 1.6, '#c6d9e8', {}, 'glass'); g.box(2.1, .3, 1.7, '#6e7d8f', { y: 13 }); for (let i = 0; i < 13; i++) g.box(.08, 13, .08, '#6e7d8f', { x: -.9 + (i % 4) * .6, z: .82 }); });
  } },
  'madrid|Puerta de Europa': { h: 12, build(b) {
    b.cyl(3.8, 3.8, .06, '#dde3ea', { y: .01 }, 20);
    for (const s of [-1, 1]) b.group({ x: s * 1.8, rz: s * .26 }, g => { g.box(2, 11, 2, '#8db2cf', {}, 'glass'); for (let i = 0; i < 11; i++) g.box(2.05, .08, 2.05, '#5f6b84', { y: i }); g.box(2.1, .5, 2.1, '#d64545', { y: 11 }); });
    b.box(.6, 4.4, .6, '#cfd5dc', { y: 0, z: 2.4 }); b.sphere(.5, C.gold, { y: 4.6, z: 2.4 }, 8, 'light');
  } },
  'madrid|Estadio Santiago Bernabéu': { h: 6, build(b) {
    b.cyl(5, 5.2, 4.2, '#c8ced6', { sx: 1.25 }, 28);
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; b.box(.18, 4.3, .5, '#e9edf2', { x: Math.cos(a) * 5.25 * 1.25, z: Math.sin(a) * 5.2, ry: -a }); }
    b.cyl(4.2, 4.2, .1, '#4cae4c', { y: 2.6, sx: 1.25 }, 24); b.box(5, .02, .08, C.white, { y: 2.72 });
    b.cyl(4.4, 4.6, .3, '#d9dee5', { y: 4.2, sx: 1.25 }, 28);
    b.box(3.2, .6, .12, C.white, { y: 3.2, z: 5.3 }, 'light');
  } },
  'sevilla|Torre del Oro': { h: 7.5, build(b) {
    b.cyl(2.2, 2.3, 3.6, '#e8b763', {}, 12); crenRing(b, 2.2, 3.6, '#e8b763', 12);
    b.cyl(1.3, 1.35, 1.8, '#e8b763', { y: 3.6 }, 12); crenRing(b, 1.3, 5.4, '#e8b763', 12);
    b.cyl(.7, .75, 1, '#f0c977', { y: 5.4 }, 12); b.dome(.75, C.gold, { y: 6.4 }, 12); b.cyl(.04, .04, .6, C.dark, { y: 7.1 }, 4);
    for (let i = 0; i < 4; i++) b.win(.35, .7, { x: Math.sin(i * 1.57) * 2.25, y: 1.8, z: Math.cos(i * 1.57) * 2.25, ry: i * 1.57 }, '#ffd99a');
    spanishFlag(b, { x: .1, y: 7 }, 1.4);
  } },
  'sevilla|Metropol Parasol': { h: 6, build(b) {
    const wood = '#ecc07f';
    for (const [x, z, r] of [[-2.4, -1.4, 2.4], [0, 0, 2.8], [2.6, -.6, 2.2], [1.2, 2.2, 2], [-2, 2, 1.8]]) {
      b.cyl(.55, .9, 3.6, wood, { x, z }, 10);
      b.cyl(r, r * .7, 1.1, wood, { x, z, y: 3.6, sx: 1.2 }, 14);
      for (let k = -2; k <= 2; k++) b.box(r * 2.2, .08, .06, '#c99653', { x, z: z + k * r * .35, y: 4.72 });
    }
    b.box(7, .5, 4.6, wood, { y: 4.2, z: .2 });
    for (let i = 0; i < 8; i++) b.box(7, .06, .06, '#c99653', { y: 4.72, z: -2 + i * .6 });
  } },
  'sevilla|Plaza de toros de la Maestranza': { h: 4.5, build(b) {
    b.cyl(3.7, 3.8, 2.6, C.white, {}, 24); b.cyl(3.75, 3.75, .5, '#e8b75c', { y: 2.1 }, 24); b.cyl(3.8, 3.8, .2, '#c45a3a', { y: 2.6 }, 24);
    b.cyl(2.6, 2.6, .08, '#f2d39a', { y: 1.9 }, 22);
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; b.torus(.26, .06, '#e8b75c', { x: Math.cos(a) * 3.78, y: 1.2, z: Math.sin(a) * 3.78, ry: -a + Math.PI / 2 }, Math.PI, 8); }
    b.group({ z: 3.6 }, g => { g.box(2, 3.6, .8, '#e8b75c'); g.box(2.2, .3, 1, C.white, { y: 3.6 }); door(g, .8, 1.4, .42, '#6b3a2a'); });
  } },
  'sevilla|Torre Sevilla': { h: 17, build(b) {
    b.cyl(3, 3, .06, '#e5dccc', { y: .01 }, 18);
    b.cyl(1.6, 1.9, 15, '#a8cde3', { sz: .7 }, 16, 'glass');
    for (let i = 0; i < 15; i++) b.cyl(1.92, 1.92, .07, C.white, { y: i, sz: .72 }, 16);
    b.cyl(1.5, 1.6, 1.8, '#d9a066', { y: 15, sz: .7 }, 16);
    for (let i = 0; i < 12; i++) b.box(.06, 1.8, .06, '#a86a3a', { x: Math.cos(i / 12 * 6.28) * 1.55, y: 15, z: Math.sin(i / 12 * 6.28) * 1.08 });
  } },
  'granada|Catedral de Granada': { h: 9, build(b) {
    b.box(6.4, 4.6, 7, '#f2e6cf', { z: -.8 });
    b.box(6.6, .3, 7.2, '#e2d2b0', { y: 4.6, z: -.8 });
    b.group({ z: 2.8 }, g => { g.box(5.6, 6, .8, '#f2e6cf'); for (const x of [-1.6, 0, 1.6]) { g.box(1.2, 4, .12, '#a77a52', { x, z: .42 }); g.torus(.6, .16, '#e2d2b0', { x, y: 4, z: .46 }, Math.PI, 10); } g.box(5.8, .3, 1, '#e2d2b0', { y: 6 }); });
    b.group({ x: -2.6, z: 2.2 }, g => { g.box(1.6, 7.6, 1.6, '#f2e6cf'); g.box(1.2, 1.2, 1.2, '#f2e6cf', { y: 7.6 }); g.dome(.6, '#c9b07e', { y: 8.8 }, 10); });
    b.cyl(1.6, 1.7, 1.2, '#f2e6cf', { y: 4.8, z: -1.6 }, 14); b.dome(1.7, '#c9b07e', { y: 6, z: -1.6 }, 14);
  } },
  'granada|Sacromonte': { h: 4, build(b, R) {
    for (let i = 0; i < 9; i++) { const x = -3 + (i % 3) * 3 + (R() - .5), z = -2.4 + Math.floor(i / 3) * 2.3, y = (2 - Math.floor(i / 3)) * .5;
      b.group({ x, y, z }, g => { g.box(1.8, 1.4, 1.4, C.white); g.box(1.9, .18, 1.5, '#e9ddc6', { y: 1.4 }); g.box(.6, .9, .1, '#4a3b55', { z: .72 }); g.torus(.3, .06, '#4a3b55', { y: .9, z: .74 }, Math.PI, 8); g.sphere(.14, [C.red, C.pink, C.yellow][i % 3], { x: .6, y: .9, z: .78 }, 5); }); }
    for (const [x, z] of [[-3.6, 2.6], [3.6, 2.4], [0, 3.2]]) b.group({ x, z }, g => { for (let k = 0; k < 4; k++) g.sphere(.3, '#6aa84f', { x: (k % 2) * .3 - .15, y: .3 + k * .35, z: 0, sx: .9, sz: .3, rz: k * .5 }, 7); });
  } },
  'barcelona|Camp Nou': { h: 6, build(b) {
    b.cyl(5.2, 5.5, 3.8, '#e5e8ee', { sx: 1.25 }, 30);
    for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2; b.box(.5, 1.2, .2, i % 2 ? '#1d3f8c' : '#a3123a', { x: Math.cos(a) * 5.3 * 1.25, y: 2.2, z: Math.sin(a) * 5.3, ry: -a + Math.PI / 2 }); }
    b.cyl(4.4, 4.4, .1, '#4cae4c', { y: 2.4, sx: 1.25 }, 26); b.cyl(1, 1, .02, C.white, { y: 2.5 }, 16);
    b.cyl(4.8, 4.9, .25, '#1d3f8c', { y: 3.8, sx: 1.25 }, 30);
  } },
  'barcelona|Torre Glòries': { h: 12, build(b) {
    b.lathe([[0, 0], [1.9, 0], [2, 4], [1.85, 8], [1.3, 10.6], [.5, 11.6], [0, 11.8]], '#5c86c8', {}, 18);
    for (let i = 0; i < 70; i++) { const a = i * 2.4, y = .5 + (i * 37 % 100) / 100 * 10, r = y < 8 ? 2.02 : 2.02 - (y - 8) * .3; b.box(.18, .18, .05, MOSAIC[i % 8], { x: Math.cos(a) * r, y, z: Math.sin(a) * r, ry: -a + Math.PI / 2 }, 'light'); }
  } },
  'barcelona|Arc de Triomf': { h: 6, build(b) {
    const c = '#c9583a';
    b.box(1.4, 4.6, 1.6, c, { x: -1.9 }); b.box(1.4, 4.6, 1.6, c, { x: 1.9 });
    b.torus(1.25, .3, c, { y: 3.4, z: .5 }, Math.PI, 14); b.torus(1.25, .3, c, { y: 3.4, z: -.5 }, Math.PI, 14);
    b.box(5.2, 1.2, 1.7, c, { y: 4.4 }); b.box(5.4, .25, 1.9, C.cream, { y: 5.6 });
    for (const x of [-2.3, 2.3]) { b.cyl(.35, .35, 1, c, { x, y: 5.8 }, 8); b.dome(.35, C.gold, { x, y: 6.8 }, 8); }
    b.box(3.4, .4, .1, C.cream, { y: 4.7, z: .9 });
    for (let i = -2; i <= 2; i++) tree(b, i * 1.6, 3.2, .55, 'palm');
  } },
  'barcelona|Tibidabo': { h: 11, build(b) {
    b.group({ x: -1.2, z: -.8 }, g => { g.box(3, 3, 3.6, '#d9d2c4'); for (const x of [-1.2, 1.2]) g.cyl(.4, .45, 4.4, '#d9d2c4', { x, z: 1.5 }, 8); g.box(1.4, 3.4, 1.4, '#d9d2c4', { y: 3 }); g.cone(.8, 2.6, '#cfc6b4', { y: 6.4 }, 8); g.cyl(.18, .22, .9, C.gold, { y: 9 }, 8); g.sphere(.25, C.gold, { y: 10.1 }, 8, 'light'); });
    b.group({ x: 2.6, z: .6 }, g => { g.box(.2, 2.4, .2, C.dark, { x: -.5, rz: .2 }); g.box(.2, 2.4, .2, C.dark, { x: .5, rz: -.2 }); g.torus(1.8, .08, C.red, { y: 2.6 }, Math.PI * 2, 20); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.box(.05, 1.8, .05, C.white, { y: 2.6, rz: a }); g.box(.35, .35, .35, MOSAIC[i], { x: Math.cos(a) * 1.8, y: 2.6 + Math.sin(a) * 1.8 }, 'light'); } });
  } },
  'barcelona|MNAC': { h: 9, build(b) {
    b.group({ z: -2.2 }, g => { g.box(8, 3.6, 3.2, '#e9dcc0'); g.cyl(1.6, 1.7, 1, '#e9dcc0', { y: 3.6 }, 16); g.dome(1.8, '#c7b48d', { y: 4.6, sy: 1.1 }, 16); for (const x of [-3.4, 3.4]) { g.box(1, 5.6, 1, '#e9dcc0', { x, z: 1.2 }); g.cone(.6, 1.2, '#c7b48d', { x, y: 5.6, z: 1.2 }, 8); } colonnade(g, 6, 4, 2.6, .14, C.white, { y: .6, z: 1.7 }); });
    for (let i = 0; i < 4; i++) b.box(5 - i * .6, .3, 1, '#e9dcc0', { y: i * .3, z: 1 - i * .6 });
    b.group({ z: 3.4 }, g => { g.cyl(2.4, 2.5, .4, C.stone, {}, 22); g.cyl(2.2, 2.2, .42, C.water, {}, 22); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.cyl(.05, .09, 1.6 + (i % 3) * .5, MOSAIC[i % 8], { x: Math.cos(a) * 1.3, y: .4, z: Math.sin(a) * 1.3 }, 5, 'light'); } g.cyl(.12, .2, 3, '#e0f7ff', { y: .4 }, 6, 'light'); });
  } },
});

function crenRing(b, r, y, color, n) { for (let i = 0; i < n * 2; i += 2) { const a = i / (n * 2) * Math.PI * 2; b.box(.4, .4, .3, color, { x: Math.cos(a) * r * .97, y, z: Math.sin(a) * r * .97, ry: -a + Math.PI / 2 }); } }

// Cerdà's chamfered Eixample block with an inner courtyard.
export function eixampleBlock(b, size, R) {
  const s = size / 2, c = size * .2, inner = size * .3, ci = inner * .4;
  const oct = (h, ch) => { const sh = new THREE.Shape(); const pts = [[-h + ch, -h], [h - ch, -h], [h, -h + ch], [h, h - ch], [h - ch, h], [-h + ch, h], [-h, h - ch], [-h, -h + ch]]; pts.forEach(([x, y], i) => i ? sh.lineTo(x, y) : sh.moveTo(x, y)); sh.closePath(); return sh; };
  const shape = oct(s, c); const hole = oct(inner, ci); shape.holes.push(hole);
  const floors = 4 + Math.floor(R() * 3), h = floors * .75;
  const wall = pick(['#f3e1c2', '#ead2b0', '#f6e6cf', '#e8cba6', '#f0d8bd'], R);
  b.extrude(shape, h, wall, { rx: -Math.PI / 2 });
  b.extrude(shape, .14, '#c9b08f', { rx: -Math.PI / 2, y: h });
  for (let f = 1; f < floors; f++) { const ring = oct(s + .06, c); ring.holes.push(oct(s - .05, c)); b.extrude(ring, .1, f % 2 ? '#7b6a8f' : '#a9824f', { rx: -Math.PI / 2, y: f * .75 - .05 }); }
  b.cyl(inner * .9, inner * .9, .05, '#86c46a', { y: .02 }, 8);
  if (R() > .5) b.sphere(inner * .45, C.leaf, { y: inner * .45 }, 7);
  for (let i = 0; i < 4; i++) if (R() > .45) b.box(.5, .4, .5, R() > .5 ? '#c96a48' : '#9aa5b5', { x: (R() - .5) * s * 1.4, y: h, z: (R() - .5) * s * 1.4 });
}

// Modern office tower for business districts.
export function tower(b, R, h = 8) {
  const w = 1.8 + R() * .8, color = pick(['#9fc7e6', '#b7d3e6', '#8fb5d3', '#c6dbe8'], R);
  b.box(w, h, w, color, {}, 'glass');
  for (let i = 0; i < h; i += 1) b.box(w + .04, .07, w + .04, '#eef2f6', { y: i });
  b.box(w * .6, .6, w * .6, '#d5dde6', { y: h });
}

function souvenirShop(main, accent) {
  return b => {
    b.box(4, 3.4, 3.2, C.white, {});
    b.box(4.2, .3, 3.4, main, { y: 3.4 });
    hipRoof(b, 4.2, 1.2, 3.4, accent, { y: 3.7 });
    awning(b, 4, 1.5, 1.4, main);
    door(b, 1, 1.1, 1.62, C.choco);
    b.win(.9, .8, { x: -1.2, y: .4, z: 1.62 }); b.win(.9, .8, { x: 1.2, y: .4, z: 1.62 });
    for (let i = 0; i < 6; i++) b.box(.4, .4, .4, MOSAIC[i], { x: -2.5 + (i % 2) * .5, y: (i >> 1) * .4, z: 2 });
    b.group({ y: 5.4, s: 1.3 }, SIGN.gift);
  };
}
function airport(color, tall = false) {
  return { h: tall ? 14 : 6, build(b) {
    b.box(12, .06, 2.4, '#5a5f6e', { y: .02, x: 1, z: 3.6 });
    for (let i = 0; i < 6; i++) b.box(1, .07, .2, C.white, { x: -3.5 + i * 1.8, y: .03, z: 3.6 });
    b.box(7, 2.4, 3.2, C.white, { z: -2.4 });
    b.box(7.2, .1, 3.4, color, { y: 2.4, z: -2.4 });
    b.cyl(1.7, 1.7, 7, C.glass, { y: 2.2, rz: Math.PI / 2, x: 3.5, z: -2.4, sx: 1 }, 14, 'glass');
    b.box(6.8, 1.4, .1, C.glass, { y: .3, z: -.78 }, 'glass');
    b.group({ x: 4.6, z: -3.4 }, g => { g.cyl(.4, .5, 4.6, C.white, {}, 10); g.cyl(1, .7, .9, C.glass, { y: 4.6 }, 10, 'glass'); g.cyl(1.05, 1.05, .2, color, { y: 5.5 }, 10); });
    if (tall) b.group({ x: -4.6, z: -3.2 }, g => { // Taipei 101-like tower
      g.box(1.8, 2, 1.8, '#7fb6c8');
      for (let i = 0; i < 8; i++) g.cyl(.8, 1.15, 1.2, '#6fa6bb', { y: 2 + i * 1.2, ry: Math.PI / 4 }, 4);
      g.cyl(.4, .6, 1, '#6fa6bb', { y: 11.6 }, 8); g.cyl(.05, .08, 1.6, C.grey, { y: 12.6 }, 6);
    });
    b.group({ x: -1.5, z: 1.4, ry: .25, s: .9 }, planeModel(color));
  } };
}
function metro() { return { h: 3.2, build(b) { b.box(2.6, .1, 2, C.grey, {}); b.box(.12, 2.2, .12, C.dark, { x: -1, z: .8 }); b.box(.12, 2.2, .12, C.dark, { x: 1, z: .8 }); b.box(2.2, .6, .2, '#e2553a', { y: 2.1, z: .8 }); b.box(1.8, .3, .22, C.white, { y: 2.25, z: .8 }, 'light'); b.box(1.8, .9, 1.3, C.dark, { y: -.75, z: -.1, rx: .45 }); } }; }

// ---------- vehicles (kept as separate meshes because they move) ----------
export function planeModel(color = '#ffcc33') {
  return b => {
    b.cyl(.55, .5, 5, C.white, { rz: Math.PI / 2, x: 2.5, y: 1 }, 12);
    b.sphere(.55, C.white, { x: 2.5, y: 1, sx: 1.4 }, 12);
    b.cone(.5, 1.4, C.white, { rz: Math.PI / 2, x: -2.5, y: 1, sx: 1 }, 12);
    b.box(1.4, .1, 6, C.white, { x: .2, y: .9 });
    b.box(.9, .1, 2.4, C.white, { x: -2.6, y: 1.1 });
    b.box(1, 1.4, .12, color, { x: -2.7, y: 1.3 });
    for (let i = 0; i < 6; i++) b.win(.22, .2, { x: 1.5 - i * .55, y: 1.15, z: .5 }, '#bfe6ff');
    for (let i = 0; i < 6; i++) b.win(.22, .2, { x: 1.5 - i * .55, y: 1.15, z: -.52 }, '#bfe6ff');
    b.box(.6, .2, 1, '#9aa6b8', { x: 3.3, y: 1.3, ry: 0, sx: .5 }, 'light');
    b.cyl(.28, .28, .8, '#cfd6e2', { rz: Math.PI / 2, x: .6, y: .6, z: 1.6 }, 10); b.cyl(.28, .28, .8, '#cfd6e2', { rz: Math.PI / 2, x: .6, y: .6, z: -1.6 }, 10);
    b.box(.08, .5, .08, C.dark, { x: 1.8, y: 0 }); b.box(.08, .5, .08, C.dark, { x: -.4, y: 0, z: .5 }); b.box(.08, .5, .08, C.dark, { x: -.4, y: 0, z: -.5 });
  };
}
export function trainModel() {
  return b => {
    for (let i = 0; i < 3; i++) b.group({ x: -i * 3.3 }, g => {
      g.box(3.1, 1.4, 1.4, C.white, { y: .35 }); g.box(3.12, .2, 1.42, '#7a3fb6', { y: .65 }); g.box(3.12, .12, 1.42, C.red, { y: .5 });
      for (let k = 0; k < 4; k++) { g.win(.45, .35, { x: -1.1 + k * .72, y: 1.1, z: .71 }, '#9fd9ff'); g.win(.45, .35, { x: -1.1 + k * .72, y: 1.1, z: -.71 }, '#9fd9ff'); }
      g.box(2.8, .35, 1.2, C.dark, { y: 0 });
    });
    b.sphere(.7, C.white, { x: 1.55, y: 1, sx: 2.2, sy: .95, sz: 1 }, 12);
    b.win(.5, .3, { x: 2.6, y: 1.25, z: 0, ry: Math.PI / 2 }, '#9fd9ff');
  };
}
export function busModel() {
  return b => {
    b.box(4.4, 1.7, 1.6, C.white, { y: .4 }); b.box(4.42, .35, 1.62, '#e2553a', { y: .6 }); b.box(4.42, .12, 1.62, '#ffb347', { y: .98 });
    for (let k = 0; k < 5; k++) { b.win(.6, .5, { x: -1.6 + k * .8, y: 1.3, z: .81 }, '#9fd9ff'); b.win(.6, .5, { x: -1.6 + k * .8, y: 1.3, z: -.81 }, '#9fd9ff'); }
    b.win(.1, .7, { x: 2.21, y: 1.2, ry: Math.PI / 2, sx: 12 }, '#9fd9ff');
    for (const x of [-1.4, 1.4]) for (const z of [-.8, .8]) b.cyl(.35, .35, .25, C.dark, { x, y: .35, z, rx: Math.PI / 2 }, 10);
  };
}
