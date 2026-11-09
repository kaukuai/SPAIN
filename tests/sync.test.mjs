import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../api/sync.js';
import { TeamSync, localFields, applyField } from '../app/sync.js';

// In-memory stand-in for the Upstash REST API.
function fakeRedis() {
  const hash = new Map();
  const fetchImpl = async (url, { body }) => {
    const [cmd, , ...args] = JSON.parse(body);
    let result = null;
    if (cmd === 'HGETALL') result = [...hash.entries()].flat();
    if (cmd === 'HMGET') result = args.map(f => hash.get(f) ?? null);
    if (cmd === 'HSET') { for (let i = 0; i < args.length; i += 2) hash.set(args[i], args[i + 1]); result = args.length / 2; }
    return { ok: true, json: async () => ({ result }) };
  };
  return { hash, fetchImpl };
}
const env = { KV_REST_API_URL: 'https://example.upstash.io', KV_REST_API_TOKEN: 't', TEAM_CODE: 'olé' };

test('api rejects missing config and wrong code', async () => {
  const { fetchImpl } = fakeRedis();
  assert.equal((await handle({ method: 'GET', headers: {} }, {}, fetchImpl))[0], 503);
  assert.equal((await handle({ method: 'GET', headers: { 'x-team-code': 'nope' } }, env, fetchImpl))[0], 401);
});

test('api keeps the newest version of each field', async () => {
  const { fetchImpl } = fakeRedis();
  const h = { 'x-team-code': 'olé' };
  await handle({ method: 'POST', headers: h, body: { fields: { 'done:a': { v: 5, t: 5 }, 'bad key': { v: 1, t: 1 } } } }, env, fetchImpl);
  await handle({ method: 'POST', headers: h, body: { fields: { 'done:a': { v: 0, t: 3 } } } }, env, fetchImpl);
  const [status, { fields }] = await handle({ method: 'GET', headers: h }, env, fetchImpl);
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(fields), ['done:a']);
  assert.equal(fields['done:a'].v, 5);
});

test('two phones end up with the same wishes and expenses', async () => {
  const mem = new Map();
  globalThis.localStorage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true });
  const { fetchImpl: redisFetch } = fakeRedis();
  const api = async (url, init) => { const [status, payload] = await handle({ method: init.method, headers: init.headers, body: init.body ? JSON.parse(init.body) : null }, env, redisFetch); return { ok: status < 300, status, json: async () => payload }; };
  const phone = () => { const s = { wish: { done: {}, votes: {}, custom: [], hidden: [] }, tools: { expenses: [] } }; return { s, sync: new TeamSync({ getState: () => s, fetchImpl: api }) }; };
  const A = phone();
  A.s.wish.done['mad-chocolate'] = 10;
  A.s.tools.expenses.push({ id: 'x1', title: '晚餐', amount: 100, payer: 'holyman', split: ['holyman', 'xun'], at: 1 });
  assert.ok(await A.sync.connect('olé'));
  mem.delete('spain-sync-meta');
  const B = phone();
  assert.ok(await B.sync.sync());
  assert.equal(B.s.wish.done['mad-chocolate'], 10);
  assert.equal(B.s.tools.expenses[0].title, '晚餐');
  B.s.wish.votes['bcn-grapes'] = ['33']; B.sync.change('vote:bcn-grapes', ['33']);
  B.s.tools.expenses = []; B.sync.change('exp:x1', null);
  await B.sync.sync();
  A.sync.meta = {};
  await A.sync.sync();
  assert.deepEqual(A.s.wish.votes['bcn-grapes'], ['33']);
  assert.equal(A.s.tools.expenses.length, 0);
});

test('local field export and apply round trip', () => {
  const wish = { done: { a: 1 }, votes: { b: ['xun'] }, custom: [{ id: 'my-1', title: 'x' }], hidden: [] }, tools = { expenses: [{ id: 'e', at: 1 }] };
  const f = localFields(wish, tools);
  assert.deepEqual(Object.keys(f).sort(), ['custom:my-1', 'done:a', 'exp:e', 'vote:b']);
  const w2 = { done: {}, votes: {}, custom: [], hidden: [] }, t2 = { expenses: [] };
  for (const [k, v] of Object.entries(f)) applyField(k, v, w2, t2);
  assert.deepEqual(w2.done, wish.done); assert.equal(t2.expenses.length, 1);
  assert.ok(applyField('custom:my-1', null, w2, t2)); assert.equal(w2.custom.length, 0);
});
