import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { locate, bookingStatus, bookingOverview, hotelLink, directionsFor } from '../app/navigation.js';
import { applyField, localFields } from '../app/sync.js';

const trip = JSON.parse(readFileSync(new URL('../app/data/share.json', import.meta.url)));
const hotels = { madrid: { name: 'Hotel M', address: 'Calle 1, Madrid' }, sevilla: { name: 'Apt S', address: 'Calle 2, Sevilla' }, granada: { name: 'Apt G', address: 'Calle 3, Granada' }, barcelona: { url: 'https://maps.app.goo.gl/abc' } };

test('every itinerary entry has a way to navigate once hotels are set', () => {
  const kinds = {};
  for (const day of trip.days) day.events.forEach((e, i) => {
    const r = locate(day, i, hotels);
    kinds[r.kind] = (kinds[r.kind] || 0) + 1;
    assert.ok(!['none', 'hotel-missing'].includes(r.kind), `${day.date} ${e.displayTitle} has no destination`);
    if (r.dir) assert.match(r.dir, /^https:\/\//);
  });
  assert.ok(kinds.hotel > 30, 'hotel and apartment entries link to the hotel');
});

test('without hotels the app asks for the city instead of failing', () => {
  const day = trip.days.find(d => d.date === '2026-12-26');
  const i = day.events.findIndex(e => e.displayTitle === '回住宿休息');
  assert.deepEqual(locate(day, i, {}), { kind: 'hotel-missing', city: 'sevilla' });
  const toPalace = day.events.findIndex(e => e.displayTitle === '住宿→馬德里皇宮');
  assert.equal(locate(day, toPalace, {}).kind, 'route');
});

test('flights, airport steps and the New Year lunch choice resolve sensibly', () => {
  const last = trip.days.find(d => d.date === '2027-01-03');
  const board = last.events.findIndex(e => /登機/.test(e.displayTitle));
  assert.match(locate(last, board, hotels).name, /BCN/);
  const ny = trip.days.find(d => d.date === '2027-01-01');
  const toLunch = ny.events.findIndex(e => /前往已選午餐店/.test(e.displayTitle));
  const r = locate(ny, toLunch, hotels);
  assert.equal(r.kind, 'choice');
  assert.deepEqual(r.options.map(o => o.name).sort(), ['El Furacu Restaurant', 'Margherita']);
});

test('restaurant bookings are classified from the itinerary notes', () => {
  const byName = Object.fromEntries(bookingOverview(trip).map(x => [x.en, x.kind]));
  for (const n of ['Los Galayos', 'Botín', 'El Rinconcillo', 'Bar Postiguillo Tapas', 'El Glop Plaça Catalunya', '7 Portes', 'Sagardi Argenteria', 'Margherita', 'El Furacu Restaurant']) assert.equal(byName[n], 'booked', n);
  for (const n of ['Murillo Café - Restaurante', 'Restaurante El Paseíllo', 'Sartoria Panatieri - Pizzeria Barcelona']) assert.equal(byName[n], 'todo', n);
  for (const n of ['La Sitarilla', 'Vinitus']) assert.equal(byName[n], 'walkin', n);
  assert.equal(byName['Gelateria MITO'], 'open', 'a note about the next booked lunch does not count');
  assert.equal(bookingStatus({ category: '交通', venue: {} }), null);
});

test('hotel links and team sync of hotels', () => {
  assert.equal(hotelLink({ url: 'https://maps.app.goo.gl/x' }).pin, 'https://maps.app.goo.gl/x');
  assert.match(hotelLink({ name: 'A', address: 'B 1' }).dir, /dir\/\?api=1&destination=A%20B%201/);
  assert.equal(hotelLink({}), null);
  assert.match(directionsFor('https://www.google.com/maps/search/?api=1&query=Botin+Madrid'), /destination=Botin%20Madrid/);
  const lodging = {}, wish = { done: {}, votes: {}, custom: [] }, tools = { expenses: [] };
  assert.ok(applyField('hotel:madrid', { name: 'X' }, wish, tools, lodging));
  assert.deepEqual(localFields(wish, tools, lodging), { 'hotel:madrid': { name: 'X' } });
  assert.ok(applyField('hotel:madrid', null, wish, tools, lodging));
  assert.deepEqual(lodging, {});
});
