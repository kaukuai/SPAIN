// Team sync for the wishlist and bill splitting, stored in one Upstash Redis hash.
// GET  /api/sync            → { fields: { name: { v, t, by } } }
// POST /api/sync { fields } → saves only fields newer than what the server has.
// Both need the header x-team-code to match the TEAM_CODE environment variable.
const KEY = 'spain-trip:v1';
const MAX_FIELDS = 120, MAX_VALUE = 4000, FIELD = /^(done|vote|custom|exp):[\w-]{1,60}$/;

function redisConfig(env = process.env) {
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return { url: env.UPSTASH_REDIS_REST_URL, token: env.UPSTASH_REDIS_REST_TOKEN };
  // The Vercel Marketplace adds variables such as KV_REST_API_URL / KV_REST_API_TOKEN (prefix may differ).
  const urlKey = Object.keys(env).find(k => k.endsWith('_REST_API_URL') && env[k.replace(/_URL$/, '_TOKEN')]);
  return urlKey ? { url: env[urlKey], token: env[urlKey.replace(/_URL$/, '_TOKEN')] } : null;
}

async function redis(cfg, command, fetchImpl = fetch) {
  const res = await fetchImpl(cfg.url, { method: 'POST', headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error || `Redis ${res.status}`);
  return data.result;
}

const parse = s => { try { const v = JSON.parse(s); return v && typeof v === 'object' && Number.isFinite(v.t) ? v : null; } catch { return null; } };

export function sameCode(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !b) return false;
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export async function handle({ method, headers, body }, env = process.env, fetchImpl = fetch) {
  const cfg = redisConfig(env);
  if (!cfg || !env.TEAM_CODE) return [503, { error: 'not-configured' }];
  if (!sameCode(String(headers['x-team-code'] || ''), env.TEAM_CODE)) return [401, { error: 'bad-code' }];
  if (method === 'GET') {
    const flat = await redis(cfg, ['HGETALL', KEY], fetchImpl) || [];
    const fields = {};
    for (let i = 0; i + 1 < flat.length; i += 2) { const v = parse(flat[i + 1]); if (v) fields[flat[i]] = v; }
    return [200, { fields }];
  }
  if (method === 'POST') {
    const incoming = body && typeof body === 'object' ? body.fields : null;
    if (!incoming || typeof incoming !== 'object') return [400, { error: 'bad-body' }];
    const names = Object.keys(incoming).filter(n => FIELD.test(n)).slice(0, MAX_FIELDS);
    if (!names.length) return [200, { saved: 0 }];
    const current = await redis(cfg, ['HMGET', KEY, ...names], fetchImpl) || [];
    const args = [];
    names.forEach((n, i) => {
      const f = incoming[n], json = JSON.stringify({ v: f?.v ?? null, t: Number(f?.t) || 0, by: String(f?.by || '').slice(0, 20) });
      if (!Number.isFinite(Number(f?.t)) || json.length > MAX_VALUE) return;
      const old = parse(current[i]);
      if (!old || Number(f.t) > old.t) args.push(n, json);
    });
    if (args.length) await redis(cfg, ['HSET', KEY, ...args], fetchImpl);
    return [200, { saved: args.length / 2 }];
  }
  return [405, { error: 'method' }];
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
    const [status, payload] = await handle({ method: req.method, headers: req.headers, body });
    res.status(status).json(payload);
  } catch (error) {
    res.status(502).json({ error: 'storage', detail: String(error.message || error).slice(0, 120) });
  }
}
