import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDE, guideFor, guideQuests } from '../app/place-guide.js';
import { venueKey } from '../app/map-data.js';
import { allWishes, badges, dailyPicks, wishesForPlace, emptyWishState } from '../app/wishlist.js';

const trip = JSON.parse(readFileSync(new URL('../app/data/share.json', import.meta.url)));
const wishlist = JSON.parse(readFileSync(new URL('../app/data/wishlist.json', import.meta.url)));
const NO_GUIDE = new Set(['barcelona|Carrefour Market', 'barcelona|Re-Cuir']); // supermarket run, leather shop

function itineraryPlaces() {
  const keys = new Set();
  for (const day of trip.days) {
    for (const e of day.events) {
      const list = e.mealOptions?.length ? e.mealOptions.map(o => ({ ...e, ...o })) : [e];
      for (const c of list) if (c.venue) keys.add(venueKey(c.venue));
    }
    for (const s of day.optionalStops || []) if (s.venue) keys.add(venueKey(s.venue));
  }
  return keys;
}

test('every restaurant, snack stop and sight in the itinerary has a guide', () => {
  const keys = itineraryPlaces();
  const missing = [...keys].filter(k => !NO_GUIDE.has(k) && !guideFor(k));
  assert.deepEqual(missing, []);
  const stale = Object.keys(GUIDE).filter(k => !keys.has(k));
  assert.deepEqual(stale, [], 'guide entries must match itinerary venue keys exactly');
});

test('food guides list must-eat dishes with Spanish names; sights have an intro and highlights', () => {
  for (const [key, g] of Object.entries(GUIDE)) {
    assert.ok(['food', 'sight'].includes(g.kind), key);
    assert.ok(g.intro?.length > 10, `${key} intro`);
    if (g.kind === 'food') {
      assert.ok(g.eat.length >= 1, `${key} eat`);
      for (const [zh, es] of g.eat) assert.ok(zh && es, `${key} dish needs 中文 and Spanish name`);
      for (const u of g.src || []) assert.match(u, /^https:\/\//, key);
    } else {
      assert.ok(g.see?.length >= 1, `${key} see`);
    }
  }
});

test('place achievements are unique wish items tied to their place', () => {
  const quests = guideQuests();
  assert.ok(quests.length >= 60);
  const ids = quests.map(q => q.id);
  assert.equal(new Set(ids).size, ids.length);
  const baseIds = new Set(wishlist.items.map(i => i.id));
  for (const q of quests) {
    assert.match(q.id, /^pq-/);
    assert.ok(!baseIds.has(q.id), `${q.id} collides with the 100-item list`);
    assert.ok(GUIDE[q.place], q.id);
    assert.equal(q.cities[0], q.place.split('|')[0]);
  }
  const items = allWishes({ items: [...wishlist.items, ...quests] }, emptyWishState());
  const botin = wishesForPlace(items, 'madrid|Botín').map(i => i.id);
  assert.ok(botin.includes('mad-botin') && botin.includes('pq-botin-oven'), 'card shows list item + place achievement');
});

test('place achievements earn their own badges but do not change daily picks or city badges', () => {
  const quests = guideQuests();
  const base = allWishes({ items: wishlist.items }, emptyWishState());
  const merged = allWishes({ items: [...wishlist.items, ...quests] }, emptyWishState());
  const s = emptyWishState();
  assert.deepEqual(dailyPicks(merged, s, 'sevilla', '2026-12-27').map(i => i.id), dailyPicks(base, s, 'sevilla', '2026-12-27').map(i => i.id));
  const cityDesc = list => badges(list, s).filter(b => b.id.startsWith('city-')).map(b => b.desc);
  assert.deepEqual(cityDesc(merged), cityDesc(base));
  const done = { ...emptyWishState(), done: Object.fromEntries(quests.slice(0, 10).map(q => [q.id, 1])) };
  assert.ok(badges(merged, done).find(b => b.id === 'spots').got);
});
