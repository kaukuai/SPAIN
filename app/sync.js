// Shares wishlist stamps/votes/custom wishes and the bill-splitting ledger between the
// team's phones through /api/sync. Each item is its own field; the newest edit wins.
export const CODE_KEY = 'spain-team-code', WHO_KEY = 'spain-team-who';
const store = { get: k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} } };

// Every shareable field currently on this phone.
export function localFields(wish, tools) {
  const out = {};
  for (const [id, t] of Object.entries(wish.done || {})) out[`done:${id}`] = t;
  for (const [id, v] of Object.entries(wish.votes || {})) out[`vote:${id}`] = v;
  for (const item of wish.custom || []) out[`custom:${item.id}`] = item;
  for (const e of tools.expenses || []) out[`exp:${e.id}`] = e;
  return out;
}

// Apply one server field to the local state. Returns true when something changed.
export function applyField(name, v, wish, tools) {
  const i = name.indexOf(':'), kind = name.slice(0, i), id = name.slice(i + 1);
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  if (kind === 'done') { const cur = wish.done[id] || 0; if (v) { if (cur === v) return false; wish.done[id] = v; } else { if (!cur) return false; delete wish.done[id]; } return true; }
  if (kind === 'vote') { if (same(wish.votes[id] || [], v || [])) return false; if (Array.isArray(v) && v.length) wish.votes[id] = v; else delete wish.votes[id]; return true; }
  if (kind === 'custom') { const at = wish.custom.findIndex(x => x.id === id); if (v) { if (at >= 0 && same(wish.custom[at], v)) return false; at >= 0 ? (wish.custom[at] = v) : wish.custom.push(v); } else { if (at < 0) return false; wish.custom.splice(at, 1); delete wish.done[id]; } return true; }
  if (kind === 'exp') { const at = tools.expenses.findIndex(x => x.id === id); if (v) { if (at >= 0 && same(tools.expenses[at], v)) return false; at >= 0 ? (tools.expenses[at] = v) : tools.expenses.push(v); tools.expenses.sort((a, b) => a.at - b.at); } else { if (at < 0) return false; tools.expenses.splice(at, 1); } return true; }
  return false;
}

export class TeamSync {
  constructor({ getState, onChange, onStatus, fetchImpl }) {
    this.getState = getState; this.onChange = onChange; this.onStatus = onStatus;
    this.fetch = fetchImpl || ((...a) => fetch(...a));
    this.meta = {}; this.pending = {}; this.status = this.code ? 'idle' : 'off'; this.message = '';
    try { this.meta = JSON.parse(localStorage.getItem('spain-sync-meta') || '{}'); } catch {}
  }
  get code() { return store.get(CODE_KEY); }
  get who() { return store.get(WHO_KEY); }
  setWho(id) { store.set(WHO_KEY, id); }
  get enabled() { return !!this.code; }
  saveMeta() { try { localStorage.setItem('spain-sync-meta', JSON.stringify(this.meta)); } catch {} }
  setStatus(status, message = '') { this.status = status; this.message = message; this.onStatus?.(status, message); }

  async connect(code) {
    store.set(CODE_KEY, code.trim());
    const { wish, tools } = this.getState();
    for (const [name, v] of Object.entries(localFields(wish, tools))) this.pending[name] = { v, t: this.meta[name] || 1 };
    const ok = await this.sync();
    if (!ok && this.status === 'bad-code') store.set(CODE_KEY, '');
    return ok;
  }
  disconnect() { store.set(CODE_KEY, ''); this.pending = {}; this.setStatus('off'); }

  // Record a local edit; it is sent with the next sync (debounced).
  change(name, v) {
    const t = Date.now();
    this.meta[name] = t; this.saveMeta();
    if (!this.enabled) return;
    this.pending[name] = { v: v ?? null, t, by: this.who };
    clearTimeout(this.timer); this.timer = setTimeout(() => this.sync(), 600);
  }

  async request(method, body) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      return await this.fetch('./api/sync', { method, headers: { 'x-team-code': this.code, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: ctrl.signal });
    } finally { clearTimeout(timer); }
  }

  async sync() {
    if (!this.enabled || this.busy || !navigator.onLine) return false;
    this.busy = true;
    try {
      const out = this.pending; this.pending = {};
      if (Object.keys(out).length) {
        const res = await this.request('POST', { fields: out });
        if (!res.ok) { Object.assign(this.pending, out, this.pending); return this.fail(res.status); }
      }
      const res = await this.request('GET');
      if (!res.ok) return this.fail(res.status);
      const { fields } = await res.json();
      const { wish, tools } = this.getState();
      let changed = false;
      for (const [name, f] of Object.entries(fields || {})) {
        if (f.t <= (this.meta[name] || 0)) continue;
        this.meta[name] = f.t;
        if (applyField(name, f.v, wish, tools)) changed = true;
      }
      this.saveMeta();
      this.lastAt = Date.now();
      this.setStatus('ok');
      if (changed) this.onChange?.();
      return true;
    } catch { return this.fail(0); } finally { this.busy = false; }
  }
  fail(status) {
    const map = { 401: ['bad-code', '團隊通關碼不正確'], 404: ['no-api', '這個網址還沒有同步功能（請確認 Vercel 已部署最新版本）'], 503: ['not-configured', 'Vercel 還沒設定資料庫或 TEAM_CODE'] };
    const [s, m] = map[status] || ['error', '暫時無法連線，稍後會自動再試'];
    this.setStatus(s, m);
    return false;
  }
}
