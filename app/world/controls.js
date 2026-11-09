// Diorama camera: drag to pan, pinch / wheel to zoom, two-finger twist or right-drag to
// rotate. Short taps are reported separately so they can select buildings.
import { THREE } from './kit.js';

export class DioramaCamera {
  constructor(camera, el, { onTap, bounds }) {
    this.camera = camera; this.el = el; this.onTap = onTap; this.bounds = bounds;
    this.target = new THREE.Vector3(0, 0, 0); this.goal = this.target.clone();
    this.dist = 60; this.goalDist = 60; this.yaw = 0; this.goalYaw = 0;
    this.minDist = 14; this.maxDist = 420; this.baseFov = 30; this.portrait = false;
    this.vel = new THREE.Vector2(); this.lastInteract = -1e9;
    this.pointers = new Map();
    this.follow = null;
    this.bind();
  }
  bind() {
    const el = this.el;
    el.addEventListener('pointerdown', e => this.down(e));
    el.addEventListener('pointermove', e => this.move(e));
    el.addEventListener('pointerup', e => this.up(e));
    el.addEventListener('pointercancel', e => this.up(e, true));
    el.addEventListener('wheel', e => { e.preventDefault(); this.zoomBy(Math.exp(e.deltaY * .0012)); this.touch(); }, { passive: false });
    el.addEventListener('contextmenu', e => e.preventDefault());
  }
  touch() { this.lastInteract = performance.now(); this.follow = null; }
  down(e) {
    this.el.setPointerCapture?.(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), button: e.button, ctrl: e.ctrlKey || e.shiftKey });
    this.vel.set(0, 0);
    if (this.pointers.size === 2) this.pinch = this.pinchState();
  }
  pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
  move(e) {
    const p = this.pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (this.pointers.size === 2 && this.pinch) {
      const s = this.pinchState();
      this.zoomBy(this.pinch.d / Math.max(20, s.d));
      let da = s.ang - this.pinch.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      this.goalYaw -= da;
      this.panScreen(s.mx - this.pinch.mx, s.my - this.pinch.my);
      this.pinch = s; this.touch(); return;
    }
    if (Math.hypot(p.x - p.sx, p.y - p.sy) < 6) return;
    if (p.button === 2 || p.ctrl) { this.goalYaw -= dx * .008; this.touch(); return; }
    this.panScreen(dx, dy);
    this.vel.set(dx, dy);
    this.touch();
  }
  up(e, cancel = false) {
    const p = this.pointers.get(e.pointerId); this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinch = null;
    if (!p || cancel) return;
    const moved = Math.hypot(p.x - p.sx, p.y - p.sy), dt = performance.now() - p.t;
    if (moved < 9 && dt < 450 && this.pointers.size === 0 && p.button !== 2) this.onTap?.(e.clientX, e.clientY);
  }
  panScreen(dx, dy) {
    const k = this.dist * .0021 * (900 / Math.max(500, this.el.clientHeight));
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    const wx = -dx * k, wz = -dy * k * 1.25;
    this.goal.x += wx * c + wz * s; this.goal.z += -wx * s + wz * c;
    this.clamp(); this.target.copy(this.goal);
  }
  zoomBy(f) { this.goalDist = Math.min(this.maxDist, Math.max(this.minDist, this.goalDist * f)); }
  clamp() {
    const b = this.bounds;
    this.goal.x = Math.min(b.maxX, Math.max(b.minX, this.goal.x));
    this.goal.z = Math.min(b.maxZ, Math.max(b.minZ, this.goal.z));
  }
  flyTo(x, z, dist = null, yaw = null) {
    this.goal.set(x, 0, z); if (dist) this.goalDist = dist; if (yaw !== null) this.goalYaw = yaw; this.clamp();
  }
  update(dt) {
    if (!this.pointers.size && this.vel.lengthSq() > .01) { this.panScreen(this.vel.x * .9, this.vel.y * .9); this.vel.multiplyScalar(Math.pow(.02, dt)); }
    if (this.follow && performance.now() - this.lastInteract > 1500) { this.goal.x = this.follow.x; this.goal.z = this.follow.z; this.clamp(); }
    const k = 1 - Math.pow(.004, dt);
    this.target.lerp(this.goal, k);
    this.dist += (this.goalDist - this.dist) * k;
    this.yaw += (this.goalYaw - this.yaw) * k;
    const pitch = THREE.MathUtils.lerp(.62, 1.05, (this.dist - this.minDist) / (this.maxDist - this.minDist));
    const h = Math.sin(pitch) * this.dist, r = Math.cos(pitch) * this.dist;
    this.camera.position.set(this.target.x + Math.sin(this.yaw) * r, h, this.target.z + Math.cos(this.yaw) * r);
    this.camera.lookAt(this.target.x, 0, this.target.z);
    // Widen the lens when zoomed far out on a tall phone so the whole country still fits.
    const fov = this.baseFov + (this.portrait ? Math.max(0, Math.min(1, (this.dist - 70) / 300)) * 16 : 0);
    if (Math.abs(this.camera.fov - fov) > .05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
  }
}
