// Builds one city island: coastline, districts, rivers, avenues, parks and the town fabric.
import { THREE, Batch, rng } from './kit.js';
import { BLOCKS, insideBlock, doorPoint } from './layout.js';
import { CITIES, DECOR, project, projectPath, scaleAt, pointInPolygon, closestOnPolygon, distToSegment } from './geo.js';
import { LANDMARKS, shop, shopStyle, filler, tree, lamp, bench, C, eixampleBlock, tower } from './models.js';
import { NavGrid } from './nav.js';

const shape = (pts, inset = 0, cx = 0, cz = 0) => {
  const s = new THREE.Shape();
  pts.forEach((p, i) => {
    let x = p.x, z = p.z;
    if (inset) { const dx = cx - x, dz = cz - z, L = Math.hypot(dx, dz) || 1; x += dx / L * inset; z += dz / L * inset; }
    i ? s.lineTo(x, -z) : s.moveTo(x, -z);
  });
  s.closePath();
  return s;
};

// Keep a district polygon on the island by pulling outside vertices back to the coast.
function clampPoly(pts, block, inset = 1.5) {
  return pts.map(p => {
    if (pointInPolygon(p.x, p.z, block.poly)) {
      const e = closestOnPolygon(p.x, p.z, block.poly);
      if (e.d >= inset) return p;
    }
    const e = closestOnPolygon(p.x, p.z, block.poly), dx = block.cx - e.x, dz = block.cz - e.z, L = Math.hypot(dx, dz) || 1;
    return { x: e.x + dx / L * inset, z: e.z + dz / L * inset };
  });
}

// Split a polyline into short pieces and keep the ones over this island.
function pieces(path, block, step = 1.6, closed = false) {
  const out = [];
  const pts = closed ? [...path, path[0]] : path;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1], len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / step));
    for (let k = 0; k < n; k++) {
      const p = { x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n }, q = { x: a.x + (b.x - a.x) * (k + 1) / n, z: a.z + (b.z - a.z) * (k + 1) / n };
      const m = { x: (p.x + q.x) / 2, z: (p.z + q.z) / 2 };
      if (insideBlock(block, m.x, m.z, .6)) out.push({ a: p, b: q, m, len: len / n, ang: Math.atan2(q.x - p.x, q.z - p.z) });
    }
  }
  return out;
}

export function buildCity(world, block) {
  const { scene, mats, gradient, heightAt, layout, names } = world;
  const city = CITIES[block.id];
  const R = rng(block.id + '-v2');

  // ---- island body + grass slab (+ satellite islets) ----
  const sh = shape(block.poly);
  const body = new THREE.ExtrudeGeometry(shape(block.poly, .8, block.cx, block.cz), { depth: 6, bevelEnabled: true, bevelSize: .6, bevelThickness: .6, bevelSegments: 2, curveSegments: 4 });
  body.rotateX(-Math.PI / 2);
  const island = new THREE.Mesh(body, new THREE.MeshToonMaterial({ color: block.side, gradientMap: gradient }));
  island.position.y = -6.9; island.receiveShadow = true;
  const slab = new THREE.ExtrudeGeometry(sh, { depth: .3, bevelEnabled: true, bevelSize: .7, bevelThickness: .5, bevelSegments: 3, curveSegments: 4 });
  slab.rotateX(-Math.PI / 2);
  const grassMat = new THREE.MeshToonMaterial({ color: block.top, gradientMap: gradient });
  const grass = new THREE.Mesh(slab, grassMat);
  grass.position.y = -.8; grass.receiveShadow = true;
  scene.add(island, grass);
  for (const islet of block.islets) {
    const g = new THREE.CylinderGeometry(islet.r, islet.r * .82, 6.4, 24);
    const m = new THREE.Mesh(g, new THREE.MeshToonMaterial({ color: block.side, gradientMap: gradient }));
    m.position.set(islet.x, -3.2, islet.z); m.receiveShadow = true;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(islet.r + .3, islet.r + .3, .5, 24), grassMat);
    top.position.set(islet.x, -.25, islet.z); top.receiveShadow = true;
    scene.add(m, top);
  }
  const foam = new THREE.Mesh(new THREE.ShapeGeometry(shape(block.poly, -2.4, block.cx, block.cz)), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: .4 }));
  foam.rotation.x = -Math.PI / 2; foam.position.y = -2.0;
  scene.add(foam); world.foams.push(foam);

  const nav = new NavGrid(block, (x, z) => insideBlock(block, x, z, .9));
  const occ = nav.blocked.slice();
  const occFree = (x, z) => { const [i, j] = nav.toCell(x, z); return nav.inside(i, j) && !occ[j * nav.w + i]; };
  const occMark = (x, z, r) => { const [i0, j0] = nav.toCell(x - r, z - r), [i1, j1] = nav.toCell(x + r, z + r); for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (nav.inside(i, j)) { const p = nav.toWorld(i, j); if (Math.hypot(p.x - x, p.z - z) <= r) occ[j * nav.w + i] = 1; } };
  const areaFree = (x, z, r) => { for (let a = 0; a < 8; a++) if (!occFree(x + Math.cos(a * .785) * r, z + Math.sin(a * .785) * r)) return false; return occFree(x, z); };
  const b = new Batch();
  const items = layout.items.filter(i => i.city === block.id);
  const roadsOut = [];

  if (city) {
    // ---- districts ----
    const urban = clampPoly(projectPath(block.id, city.urban), block);
    b.extrude(shape(urban), .04, city.urbanColor, { rx: -Math.PI / 2, y: .005 });
    for (const park of city.parks) {
      const poly = clampPoly(projectPath(block.id, park.pts), block, 1.2);
      b.extrude(shape(poly), .05, park.forest ? '#6fbf55' : '#86d067', { rx: -Math.PI / 2, y: .01 });
      const xs = poly.map(p => p.x), zs = poly.map(p => p.z);
      for (let x = Math.min(...xs); x < Math.max(...xs); x += park.forest ? 2.1 : 2.8) for (let z = Math.min(...zs); z < Math.max(...zs); z += park.forest ? 2.1 : 2.8) {
        const px = x + (R() - .5) * 1.4, pz = z + (R() - .5) * 1.4;
        if (!pointInPolygon(px, pz, poly) || R() < (park.forest ? .15 : .45) || !occFree(px, pz)) continue;
        if (items.some(i => Math.hypot(i.x - px, i.z - pz) < i.r + 1.5)) continue;
        tree(b, px, pz, .65 + R() * .35, park.forest ? (R() > .4 ? 'pine' : 'round') : (block.id === 'sevilla' ? 'orange' : 'round'), R);
        occMark(px, pz, .9); nav.blockCircle(px, pz, .4);
      }
    }
    // ---- rivers: block walking except at bridges ----
    for (const river of city.rivers) {
      const ps = pieces(projectPath(block.id, river.pts), block, 1.2);
      const w = river.w;
      for (const p of ps) {
        b.box(w + .9, .05, p.len + .25, '#d9c79e', { x: p.m.x, z: p.m.z, y: .015, ry: p.ang });
        b.box(w, .06, p.len + .25, '#46b7f0', { x: p.m.x, z: p.m.z, y: .03, ry: p.ang }, 'light');
        for (let t = 0; t <= 1; t += .5) { const x = p.a.x + (p.b.x - p.a.x) * t, z = p.a.z + (p.b.z - p.a.z) * t; nav.blockCircle(x, z, w / 2 + .3); occMark(x, z, w / 2 + .6); }
      }
      world.rivers.push({ city: block.id, pts: ps.map(p => p.m), w });
      // footbridges every few pieces
      ps.forEach((p, i) => { if (i % 8 === 4) world.bridgeAt.push({ city: block.id, x: p.m.x, z: p.m.z, ang: p.ang, w }); });
    }
    // ---- avenues ----
    for (const road of city.roads) {
      const path = projectPath(block.id, road.pts);
      const ps = pieces(path, block, 1.2, road.loop);
      const w = road.w;
      for (const p of ps) {
        const y = heightAt(p.m.x, p.m.z);
        b.box(w + .7, .05, p.len + .3, '#e6dccb', { x: p.m.x, z: p.m.z, y: y + .02, ry: p.ang });
        b.box(w, .06, p.len + .3, '#6d6f7c', { x: p.m.x, z: p.m.z, y: y + .035, ry: p.ang });
        for (let t = 0; t <= 1; t += .5) occMark(p.a.x + (p.b.x - p.a.x) * t, p.a.z + (p.b.z - p.a.z) * t, w / 2 + .35);
      }
      ps.forEach((p, i) => {
        const y = heightAt(p.m.x, p.m.z), nx = Math.cos(p.ang), nz = -Math.sin(p.ang);
        if (w >= 1.7 && i % 2 === 0) b.box(.12, .02, p.len * .5, '#ffffff', { x: p.m.x, z: p.m.z, y: y + .07, ry: p.ang });
        if (road.trees && i % 3 === 1) for (const s of [-1, 1]) { const x = p.m.x + nx * s * (w / 2 + .55), z = p.m.z + nz * s * (w / 2 + .55); if (occFreeLoose(x, z)) tree(b, x, z, .5, block.id === 'sevilla' ? 'orange' : block.id === 'barcelona' && R() > .5 ? 'palm' : 'round', R); }
        if (i % 5 === 2) lamp(b, p.m.x + nx * (w / 2 + .45), p.m.z + nz * (w / 2 + .45), { y });
        if (road.lights && i % 3 === 0) { const x1 = p.m.x + nx * (w / 2 + .5), z1 = p.m.z + nz * (w / 2 + .5), x2 = p.m.x - nx * (w / 2 + .5), z2 = p.m.z - nz * (w / 2 + .5); xmasLights(b, x1, z1, x2, z2, y + 2.6); }
        // bridges where an avenue crosses a river
        if (!nav.isFree(p.m.x, p.m.z) && world.rivers.some(r => r.city === block.id && r.pts.some(q => Math.hypot(q.x - p.m.x, q.z - p.m.z) < r.w))) world.bridgeAt.push({ city: block.id, x: p.m.x, z: p.m.z, ang: p.ang + Math.PI / 2, w: w + 1.4, road: true });
      });
      roadsOut.push({ name: road.name, w, pts: ps.length ? [ps[0].a, ...ps.map(p => p.b)] : [], segs: ps });
      function occFreeLoose(x, z) { return insideBlock(block, x, z, .8) && !items.some(it => Math.hypot(it.x - x, it.z - z) < it.r + .5); }
    }
    for (const br of world.bridgeAt.filter(x => x.city === block.id)) {
      const L = br.road ? 3.6 : 3.2, wid = br.road ? br.w : 1.4;
      b.group({ x: br.x, z: br.z, ry: br.ang }, g => {
        g.box(wid, .25, L, br.road ? '#b8a27e' : '#c99a62', { y: .06 });
        g.box(.12, .35, L, '#f2e6cf', { x: wid / 2, y: .3 }); g.box(.12, .35, L, '#f2e6cf', { x: -wid / 2, y: .3 });
      });
      nav.unblockCircle(br.x, br.z, Math.max(1.3, wid / 2 + .4));
    }
    // ---- hills (terrain mounds) ----
    for (const m of world.mounds.filter(m => m.city === block.id)) {
      const pts = []; for (let i = 0; i <= 12; i++) { const d = m.rb * (1 - i / 12); pts.push([d, mound(m, d)]); }
      b.lathe(pts, m.color || shadeHex(block.top, -.07), { x: m.x, z: m.z, y: .002 }, 30);
    }
  }

  // ---- itinerary + scenery buildings ----
  for (const it of items) {
    const y = heightAt(it.x, it.z);
    const lm = LANDMARKS[it.key];
    b.push({ x: it.x, y, z: it.z, ry: it.ry || 0 });
    if (lm) lm.build(b, R);
    else { b.cyl(it.r + .2, it.r + .2, .06, '#f2e2c4', { y: .03 }, 20); shop(b, shopStyle(it.key, names.get(it.key)?.category || ''), R, block.id === 'tpe' ? 'tpe' : block.id); }
    b.pop();
    nav.blockCircle(it.x, it.z, it.r * .8);
    occMark(it.x, it.z, it.r + .7);
    const d = doorPoint(it); nav.unblockCircle(d.x, d.z, 1); occMark(d.x, d.z, 1.4);
    it.y = y; it.h = lm?.h || 6.5;
  }

  // ---- Barcelona's Eixample grid ----
  if (city?.grid) {
    const g = city.grid, ang = g.angle * Math.PI / 180, c0 = city.center;
    const region = g.region;
    const lats = region.map(p => p[0]), lons = region.map(p => p[1]);
    const mLat = 110540, mLon = 111320 * Math.cos(c0[0] * Math.PI / 180);
    const ext = Math.max((Math.max(...lats) - Math.min(...lats)) * mLat, (Math.max(...lons) - Math.min(...lons)) * mLon);
    const midLat = (Math.max(...lats) + Math.min(...lats)) / 2, midLon = (Math.max(...lons) + Math.min(...lons)) / 2;
    const inRegion = (la, lo) => { let inside = false; for (let i = 0, j = region.length - 1; i < region.length; j = i++) { const a = region[i], bb = region[j]; if ((a[0] > la) !== (bb[0] > la) && lo < (bb[1] - a[1]) * (la - a[0]) / (bb[0] - a[0]) + a[1]) inside = !inside; } return inside; };
    for (let u = -ext; u <= ext; u += g.pitch) for (let v = -ext; v <= ext; v += g.pitch) {
      const e = u * Math.cos(ang) - v * Math.sin(ang), n = u * Math.sin(ang) + v * Math.cos(ang);
      const la = midLat + n / mLat, lo = midLon + e / mLon;
      if (!inRegion(la, lo)) continue;
      const p = project(block.id, la, lo), size = Math.min(4.2, g.pitch * .82 * scaleAt(block.id, la, lo, g.pitch));
      if (size < 1.6 || !areaFree(p.x, p.z, size * .62)) continue;
      b.group({ x: p.x, y: heightAt(p.x, p.z), z: p.z, ry: ang + gridTwist(block.id, la, lo) }, gg => eixampleBlock(gg, size, R));
      occMark(p.x, p.z, size * .7); nav.blockCircle(p.x, p.z, size * .55);
    }
  }

  // ---- town fabric: buildings lining every avenue, then infill ----
  const urbanPoly = city ? clampPoly(projectPath(block.id, city.urban), block) : null;
  const place = (x, z, w, d, ry, style) => {
    const r = Math.max(w, d) * .62;
    if (!areaFree(x, z, r)) return false;
    const y = heightAt(x, z);
    b.group({ x, y, z, ry }, g => style === 'tower' ? tower(g, R, 6 + R() * 6) : filler(g, R, block.id, w, d));
    occMark(x, z, r); nav.blockRect(x, z, w * .9, d * .9);
    return true;
  };
  for (const road of roadsOut) for (const p of road.segs) {
    if (R() < .25) continue;
    const nx = Math.cos(p.ang), nz = -Math.sin(p.ang);
    for (const s of [-1, 1]) {
      const w = 2.4 + R() * .9, d = 2.4 + R() * .6, off = road.w / 2 + .45 + d / 2 + .25;
      const x = p.m.x + nx * s * off, z = p.m.z + nz * s * off;
      const tall = block.id === 'madrid' && Math.hypot(x - project('madrid', 40.468, -3.689).x, z - project('madrid', 40.468, -3.689).z) < 9;
      place(x, z, w, d, p.ang + (s > 0 ? -Math.PI / 2 : Math.PI / 2), tall ? 'tower' : 'house');
    }
  }
  const xs = block.poly.map(p => p.x), zs = block.poly.map(p => p.z);
  for (let x = Math.min(...xs) + 2; x < Math.max(...xs) - 2; x += 3.5) for (let z = Math.min(...zs) + 2; z < Math.max(...zs) - 2; z += 3.5) {
    const px = x + (R() - .5) * 1.2, pz = z + (R() - .5) * 1.2;
    if (!insideBlock(block, px, pz, 2.4)) continue;
    const inUrban = urbanPoly ? pointInPolygon(px, pz, urbanPoly) : true;
    const roll = R();
    if (inUrban ? roll < .2 : roll < .62) continue;
    if (!inUrban && roll < .8) { if (areaFree(px, pz, .9)) { tree(b, px, pz, .7 + R() * .35, block.id === 'granada' ? 'cypress' : block.id === 'sevilla' ? 'orange' : block.id === 'tpe' ? 'palm' : R() > .5 ? 'pine' : 'round', R); occMark(px, pz, .9); nav.blockCircle(px, pz, .4); } continue; }
    const w = inUrban ? 2.6 + R() * 1 : 2.2 + R() * .6, d = inUrban ? 2.5 + R() * .8 : 2.2 + R() * .6;
    place(px, pz, w, d, (R() > .5 ? 0 : Math.PI / 2) + (R() - .5) * .12, 'house');
  }

  // ---- Granada: Sierra Nevada on the south-east coast ----
  if (block.id === 'granada') {
    const pts = block.poly.filter(p => p.x > block.cx + block.R * .25 && p.z > block.cz - block.R * .1);
    for (let i = 0; i < Math.min(5, pts.length); i++) {
      const p = pts[Math.floor(i * pts.length / 5)], dx = block.cx - p.x, dz = block.cz - p.z, L = Math.hypot(dx, dz);
      const x = p.x + dx / L * 6, z = p.z + dz / L * 6, h = 6 + (i % 3) * 2, r = 4.5;
      if (!items.some(it => Math.hypot(it.x - x, it.z - z) < it.r + r)) { b.cone(r, h, '#8aa0b8', { x, z }, 9); b.cone(r * .44, h * .44, C.snow, { x, z, y: h * .56 }, 9); nav.blockCircle(x, z, r * .9); }
    }
  }
  // ---- island name board at the southern shore ----
  const south = block.poly.reduce((a, p) => p.z > a.z ? p : a, block.poly[0]);
  b.group({ x: south.x, z: south.z - 2.6 }, g => { g.box(.25, 2.2, .25, C.wood, { x: -1.8 }); g.box(.25, 2.2, .25, C.wood, { x: 1.8 }); g.box(4.6, 1.3, .25, block.accent, { y: 1.3 }); g.box(4.2, .9, .27, C.white, { y: 1.5 }); });

  const group = b.build(mats);
  scene.add(group);
  world.nav[block.id] = nav;
  world.roads[block.id] = roadsOut;
}

function xmasLights(b, x1, z1, x2, z2, y) {
  const colors = ['#ff6b6b', '#ffd23f', '#3fc5ff', '#6be675', '#ff9de2', '#ffffff'];
  for (let i = 0; i <= 6; i++) { const t = i / 6, sag = Math.sin(t * Math.PI) * .35; b.sphere(.1, colors[i % 6], { x: x1 + (x2 - x1) * t, y: y - sag, z: z1 + (z2 - z1) * t }, 5, 'light'); }
}
function gridTwist() { return 0; }
export function mound(m, d) { return d <= m.rt ? m.h : d >= m.rb ? 0 : m.h * (1 - smooth((d - m.rt) / (m.rb - m.rt))); }
function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); }
export function shadeHex(hex, amt) { const c = new THREE.Color(hex); const hsl = {}; c.getHSL(hsl); c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + amt))); return '#' + c.getHexString(); }
export { distToSegment, DECOR };
