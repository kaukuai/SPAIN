import test from 'node:test';
import assert from 'node:assert/strict';
import { balances, settle, makeExpense, PHRASES, PACKING } from '../app/tools.js';
import { PARTY } from '../app/world/team.js';
import { BLOCKS } from '../app/world/layout.js';
import { pointInPolygon, project, CITIES } from '../app/world/geo.js';

test('team names', () => {
  assert.deepEqual(PARTY.map(m => m.name), ['holyman', '勳', 'ㄓㄒ', '33']);
  assert.ok(PARTY[0].flag && PARTY[3].girl);
});

test('bill splitting balances to zero and settles', () => {
  const ids = PARTY.map(m => m.id);
  const ex = [makeExpense({ title: '晚餐', amount: '180', payer: ids[0], split: ids }, 1), makeExpense({ title: '計程車', amount: '24,5', payer: ids[3], split: [ids[1], ids[3]] }, 2)];
  const bal = balances(ex);
  assert.ok(Math.abs(Object.values(bal).reduce((a, b) => a + b, 0)) < 1e-9);
  const plan = settle(bal);
  const after = { ...bal };
  for (const p of plan) { after[p.from] += p.amount; after[p.to] -= p.amount; }
  for (const v of Object.values(after)) assert.ok(Math.abs(v) < .02);
  assert.throws(() => makeExpense({ amount: '-3', payer: ids[0], split: ids }));
  assert.throws(() => makeExpense({ amount: '3', payer: 'nobody', split: ids }));
});

test('phrasebook and packing list are filled in', () => {
  assert.ok(PHRASES.every(g => g.list.length >= 4 && g.list.every(([zh, es]) => zh && es)));
  assert.ok(PACKING.length >= 10);
});

test('city islands follow real outlines and do not overlap', () => {
  const ids = Object.keys(BLOCKS);
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const A = BLOCKS[ids[i]], B = BLOCKS[ids[j]];
    assert.ok(!A.poly.some(p => pointInPolygon(p.x, p.z, B.poly)), `${ids[i]} overlaps ${ids[j]}`);
  }
  for (const id of ['madrid', 'sevilla', 'granada', 'barcelona']) {
    assert.ok(BLOCKS[id].poly.length > 40);
    const c = project(id, ...CITIES[id].center);
    assert.ok(pointInPolygon(c.x, c.z, BLOCKS[id].poly), `${id} centre on its island`);
  }
});
