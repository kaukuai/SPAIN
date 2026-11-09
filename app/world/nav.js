// Walkable grid per island + A* so the team runs around buildings instead of through them.
export class NavGrid {
  constructor(block, inside, cell = 1) {
    this.block = block; this.cell = cell;
    const xs = [block.minX, block.maxX, ...block.islets.flatMap(i => [i.x - i.r, i.x + i.r])], zs = [block.minZ, block.maxZ, ...block.islets.flatMap(i => [i.z - i.r, i.z + i.r])];
    this.x0 = Math.min(...xs) - 2; this.z0 = Math.min(...zs) - 2;
    this.w = Math.ceil((Math.max(...xs) + 2 - this.x0) / cell); this.h = Math.ceil((Math.max(...zs) + 2 - this.z0) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
    for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) {
      const { x, z } = this.toWorld(i, j);
      if (!inside(x, z)) this.blocked[j * this.w + i] = 1;
    }
  }
  unblockCircle(x, z, r) {
    const [i0, j0] = this.toCell(x - r, z - r), [i1, j1] = this.toCell(x + r, z + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (!this.inside(i, j)) continue;
      const p = this.toWorld(i, j);
      if (Math.hypot(p.x - x, p.z - z) <= r) this.blocked[j * this.w + i] = 0;
    }
  }
  isFree(x, z) { return this.free(...this.toCell(x, z)); }
  toCell(x, z) { return [Math.floor((x - this.x0) / this.cell), Math.floor((z - this.z0) / this.cell)]; }
  toWorld(i, j) { return { x: this.x0 + (i + .5) * this.cell, z: this.z0 + (j + .5) * this.cell }; }
  inside(i, j) { return i >= 0 && j >= 0 && i < this.w && j < this.h; }
  free(i, j) { return this.inside(i, j) && !this.blocked[j * this.w + i]; }
  blockCircle(x, z, r) {
    const [i0, j0] = this.toCell(x - r, z - r), [i1, j1] = this.toCell(x + r, z + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (!this.inside(i, j)) continue;
      const p = this.toWorld(i, j);
      if (Math.hypot(p.x - x, p.z - z) <= r) this.blocked[j * this.w + i] = 1;
    }
  }
  blockRect(x, z, w, d) {
    const [i0, j0] = this.toCell(x - w / 2, z - d / 2), [i1, j1] = this.toCell(x + w / 2, z + d / 2);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (this.inside(i, j)) this.blocked[j * this.w + i] = 1;
  }
  nearestFree(i, j) {
    if (this.free(i, j)) return [i, j];
    for (let r = 1; r < 30; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      if (this.free(i + di, j + dj)) return [i + di, j + dj];
    }
    return null;
  }
  line(a, b) { // grid line-of-sight for path smoothing
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (this.cell * .4));
    for (let s = 1; s < steps; s++) {
      const t = s / steps, [i, j] = this.toCell(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (!this.free(i, j)) return false;
    }
    return true;
  }
  find(ax, az, bx, bz) {
    const start = this.nearestFree(...this.toCell(ax, az)), goal = this.nearestFree(...this.toCell(bx, bz));
    if (!start || !goal) return [{ x: bx, z: bz }];
    const W = this.w, N = W * this.h, si = start[1] * W + start[0], gi = goal[1] * W + goal[0];
    const g = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = new MinHeap();
    const hfn = k => { const dx = Math.abs(k % W - goal[0]), dz = Math.abs((k / W | 0) - goal[1]); return Math.max(dx, dz) + .414 * Math.min(dx, dz); };
    g[si] = 0; heap.push(si, hfn(si));
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    let found = false;
    while (heap.size) {
      const k = heap.pop();
      if (k === gi) { found = true; break; }
      if (closed[k]) continue; closed[k] = 1;
      const i = k % W, j = k / W | 0;
      for (const [di, dj, c] of dirs) {
        const ni = i + di, nj = j + dj;
        if (!this.free(ni, nj)) continue;
        if (di && dj && (!this.free(i + di, j) || !this.free(i, j + dj))) continue;
        const nk = nj * W + ni, ng = g[k] + c;
        if (ng < g[nk]) { g[nk] = ng; came[nk] = k; heap.push(nk, ng + hfn(nk)); }
      }
    }
    if (!found) return [{ x: bx, z: bz }];
    const cells = [];
    for (let k = gi; k !== -1; k = came[k]) cells.push(this.toWorld(k % W, k / W | 0));
    cells.reverse();
    cells[0] = { x: ax, z: az };
    const end = this.free(...this.toCell(bx, bz)) ? { x: bx, z: bz } : cells[cells.length - 1];
    cells[cells.length - 1] = end;
    const out = [cells[0]];
    let anchor = cells[0];
    for (let i = 2; i < cells.length; i++) if (!this.line(anchor, cells[i])) { anchor = cells[i - 1]; out.push(anchor); }
    out.push(cells[cells.length - 1]);
    return out.slice(1);
  }
}

class MinHeap {
  constructor() { this.k = []; this.p = []; }
  get size() { return this.k.length; }
  push(key, pri) {
    const k = this.k, p = this.p; k.push(key); p.push(pri);
    let i = k.length - 1;
    while (i > 0) { const up = (i - 1) >> 1; if (p[up] <= p[i]) break; [k[up], k[i]] = [k[i], k[up]]; [p[up], p[i]] = [p[i], p[up]]; i = up; }
  }
  pop() {
    const k = this.k, p = this.p, top = k[0], lk = k.pop(), lp = p.pop();
    if (k.length) {
      k[0] = lk; p[0] = lp; let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < k.length && p[l] < p[m]) m = l;
        if (r < k.length && p[r] < p[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [p[m], p[i]] = [p[i], p[m]]; i = m;
      }
    }
    return top;
  }
}
