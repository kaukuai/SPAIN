import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { worldLayout, BLOCKS, insideBlock, doorPoint } from '../app/world/layout.js';
import { dailyMapPlaces, venueKey } from '../app/map-data.js';
import { allWishes, emptyWishState, levelFor, score, badges, pickGacha, makeCustom, wishesForPlace, validWishData } from '../app/wishlist.js';

const trip = JSON.parse(readFileSync(new URL('../app/data/share.json', import.meta.url)));
const wishData = JSON.parse(readFileSync(new URL('../app/data/wishlist.json', import.meta.url)));
const layout = worldLayout();

test('every itinerary venue has a building on its city island', () => {
  for (const day of trip.days) {
    for (const event of day.events) for (const option of event.mealOptions?.length ? event.mealOptions : [event]) {
      const key = venueKey(option.venue || event.venue);
      if (!key) continue;
      const item = layout.byKey.get(key);
      assert.ok(item, `missing world building for ${key}`);
      assert.ok(insideBlock(BLOCKS[item.city], item.x, item.z), `${key} outside its island`);
    }
    for (const stop of day.optionalStops || []) assert.ok(layout.byKey.get(venueKey(stop.venue)), venueKey(stop.venue));
  }
});

test('daily quest stops all exist in the world', () => {
  for (const day of trip.days) {
    const stops = dailyMapPlaces(day).filter(s => layout.byKey.has(s.key));
    assert.ok(stops.length > 0, `no quest stops on ${day.date}`);
  }
});

test('buildings on the same island do not overlap and doors stay on land', () => {
  for (const id of Object.keys(BLOCKS)) {
    const list = layout.items.filter(i => i.city === id);
    for (let i = 0; i < list.length; i++) {
      assert.ok(insideBlock(BLOCKS[id], doorPoint(list[i]).x, doorPoint(list[i]).z), `${list[i].key} door in the sea`);
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= a.r + b.r, `${a.key} overlaps ${b.key}`);
      }
    }
  }
});

test('wishlist data is valid, unique and linked places exist', () => {
  assert.ok(validWishData(wishData));
  const ids = new Set();
  for (const item of wishData.items) {
    assert.ok(!ids.has(item.id), item.id); ids.add(item.id);
    if (item.place) assert.ok(layout.byKey.has(item.place), `wish ${item.id} links unknown place ${item.place}`);
  }
});

test('wishlist scoring, levels, badges and gacha', () => {
  const state = emptyWishState();
  const items = allWishes(wishData, state);
  assert.equal(score(items, state).xp, 0);
  assert.equal(levelFor(0).level, 1);
  state.done['bcn-grapes'] = 1; state.done['mad-chocolate'] = 2;
  assert.equal(score(items, state).xp, 30);
  assert.equal(levelFor(30).level, 2);
  const got = badges(items, state).filter(b => b.got).map(b => b.id);
  assert.ok(got.includes('first') && got.includes('nye'));
  const pick = pickGacha(items, state, 'madrid', () => 0);
  assert.ok(pick && !state.done[pick.id]);
  const custom = makeCustom({ title: ' 看足球賽 ', type: 'do', city: 'barcelona', emoji: '⚽' }, 1000);
  assert.equal(custom.title, '看足球賽');
  state.custom.push(custom); state.hidden.push('buy-zara');
  const merged = allWishes(wishData, state);
  assert.ok(merged.some(i => i.id === custom.id && i.custom));
  assert.ok(!merged.some(i => i.id === 'buy-zara'));
  assert.ok(wishesForPlace(merged, 'barcelona|souvenir').every(i => i.type === 'buy'));
  assert.throws(() => makeCustom({ title: '  ' }));
});
