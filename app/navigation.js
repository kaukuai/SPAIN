// Where does each itinerary entry happen, and is the restaurant booked?
// Pure helpers (no DOM) so every entry can be checked in tests.
import { places, transportStops } from './map-places.js';

const HOTEL_RE = /住宿|公寓|飯店|旅館|返宿|回宿/;
const AIRPORT_STEP_RE = /登機|出境|證件檢查|機場/;
const PREP_CATEGORIES = new Set(['準備', '休息', '備餐']);
const AIRPORTS = new Set(['transport|tpe', 'transport|pvg', 'transport|mad', 'transport|grx', 'transport|bcn']);
const CITY_TEXT = [['馬德', 'madrid'], ['塞維', 'sevilla'], ['格拉', 'granada'], ['巴塞', 'barcelona']];
export const CITY_NAMES = { madrid: '馬德里', sevilla: '塞維亞', granada: '格拉納達', barcelona: '巴塞隆納' };
const DINING = new Set(['早餐', '午餐', '晚餐', '甜點', '條件甜點', '酒吧', '餐飲散步', '備選']);

export const searchUrl = q => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
export const dirUrl = q => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
const routeUrl = (dest, waypoints) => `${dirUrl(dest)}${waypoints.length ? `&waypoints=${encodeURIComponent(waypoints.join('|'))}` : ''}`;

// "query" of a Google Maps search link → usable as a directions destination.
export function queryOf(url) {
  try { const u = new URL(url); return u.searchParams.get('query') || u.searchParams.get('q') || ''; } catch { return ''; }
}
export const directionsFor = url => { const q = queryOf(url); return q ? dirUrl(q) : url; };

export function hotelLink(h) {
  if (!h) return null;
  const url = String(h.url || '').trim();
  const named = [h.name, h.address || h.city].map(x => String(x || '').trim()).filter(Boolean).join(' ');
  if (/^https:\/\//.test(url)) return { pin: url, dir: h.coordinates ? dirUrl(`${h.coordinates[0]},${h.coordinates[1]}`) : h.name ? dirUrl(named) : directionsFor(url) };
  const q = [h.name, h.address].map(s => String(s || '').trim()).filter(Boolean).join(' ');
  return q ? { pin: searchUrl(q), dir: dirUrl(q) } : null;
}

const cityFromText = text => CITY_TEXT.find(([k]) => String(text || '').includes(k))?.[1] || null;
export function eventCity(day, index) {
  for (let i = index; i >= 0; i--) {
    const e = day.events[i], c = e.cityId || e.venue?.cityId;
    if (CITY_NAMES[c]) return c;
  }
  const t = String(day.city || '');
  return cityFromText(t.split('→')[0]) || cityFromText(t);
}

function stopPlace(eventId, arrival = false) {
  const stop = (transportStops[eventId] || []).find(s => !!s.arrival === arrival) || (transportStops[eventId] || [])[0];
  return stop && places[stop.key] ? { key: stop.key, ...places[stop.key] } : null;
}

// Resolve one entry to a destination: a venue, the city's hotel, the next stop, or an airport.
export function locate(day, index, hotels = {}) {
  const e = day.events[index];
  const title = e.displayTitle || e.title || '';
  if (e.mealOptions?.length) return { kind: 'options' };
  if (e.mapUrl) return { kind: 'place', pin: e.mapUrl, dir: directionsFor(e.mapUrl), name: e.venue?.nameZh || title };
  if (e.isFlight || transportStops[e.id]) {
    const p = stopPlace(e.id);
    if (p?.mapUrl) return { kind: 'airport', pin: p.mapUrl, dir: directionsFor(p.mapUrl), name: p.title };
  }
  if (e.category === '轉機' && places['transport|pvg']) return { kind: 'airport', pin: places['transport|pvg'].mapUrl, dir: directionsFor(places['transport|pvg'].mapUrl), name: places['transport|pvg'].title };
  const city = eventCity(day, index);
  const dest = title.split(/→|至(?=[^至]*$)/).pop();
  const toHotel = e.lodgingAction || (title.includes('→') || /至/.test(title) ? HOTEL_RE.test(dest) : HOTEL_RE.test(title));
  if (AIRPORT_STEP_RE.test(title) && !e.lodgingAction) {
    // nearest airport used by a flight the same day (look back first, then ahead)
    const order = [...Array(index).keys()].reverse().concat([...Array(day.events.length - index - 1).keys()].map(k => index + 1 + k));
    for (const i of order) { const p = stopPlace(day.events[i].id); if (p?.mapUrl && AIRPORTS.has(p.key)) return { kind: 'airport', pin: p.mapUrl, dir: directionsFor(p.mapUrl), name: p.title }; }
  }
  if (toHotel || PREP_CATEGORIES.has(e.category) || /起床/.test(title)) {
    const link = hotelLink(hotels[city]);
    return link ? { kind: 'hotel', city, ...link, name: hotels[city].name || `${CITY_NAMES[city] || ''}住宿` } : { kind: 'hotel-missing', city };
  }
  // Transfers and food walks: route to the next entry that has a place, through any anchored stops.
  if (/→|至|到|交通|散步/.test(title + e.category)) {
    const waypoints = (day.optionalStops || []).filter(s => s.afterEventId && [e.id, day.events[index - 1]?.id].includes(s.afterEventId) && s.mapUrl).map(s => queryOf(s.mapUrl)).filter(Boolean);
    for (let i = index + 1; i < day.events.length; i++) {
      const n = locate(day, i, hotels);
      if (n.kind === 'options') return { kind: 'choice', options: day.events[i].mealOptions.filter(o => o.mapUrl).map(o => ({ name: o.venue?.nameEn || o.title, pin: o.mapUrl, dir: directionsFor(o.mapUrl) })) };
      if (['place', 'airport', 'hotel'].includes(n.kind)) {
        const q = queryOf(n.pin) || n.name;
        return { kind: 'route', pin: n.pin, dir: routeUrl(q, e.category === '餐飲散步' ? waypoints : []), name: n.name, waypoints: e.category === '餐飲散步' ? waypoints.length : 0 };
      }
      if (n.kind === 'hotel-missing') return n;
    }
  }
  return { kind: 'none' };
}

// Booking state of a dining entry, read from its status, reservation and notes.
export function bookingStatus(e) {
  if (!e) return null;
  const cat = e.category || '';
  const isMeal = DINING.has(cat) || /午餐|晚餐|早餐|甜點/.test(cat) || !!e.reservation;
  if (!isMeal) return null;
  if (!e.venue && !e.reservation) return null;
  const text = [e.status, e.note, e.description, e.activity?.description, ...(e.activity?.tips || []), e.reservation?.status].filter(Boolean).join(' ');
  if (e.reservation) return { kind: 'booked', label: '已訂位', icon: '✅' };
  if (/尚未訂|未訂位|四位未訂|待訂|開始查位|需訂位/.test(text)) return { kind: 'todo', label: '尚未訂位', icon: '⚠️' };
  if (/無法訂位|無法預訂|不接受訂位|現場候位|先到排隊/.test(text)) return { kind: 'walkin', label: '不能訂・現場排隊', icon: '🚶' };
  if (/已訂位|已訂\d|使用者確認已訂/.test(text)) return { kind: 'booked', label: '已訂位', icon: '✅' };
  if (/未提供訂位確認/.test(text)) return { kind: 'unconfirmed', label: '未確認訂位', icon: '❔' };
  if (/早餐|甜點|酒吧|餐飲散步|備選/.test(cat)) return { kind: 'open', label: '免訂位・直接去', icon: '🙂' };
  return { kind: 'open', label: '未訂位・現場用餐', icon: '🙂' };
}

// Every dining stop of the trip with its booking state, for the overview list.
export function bookingOverview(trip) {
  const out = [];
  for (const day of trip.days) {
    for (const e of day.events) {
      for (const c of e.mealOptions?.length ? e.mealOptions.map(o => ({ ...e, ...o, category: e.category, activity: { ...e.activity, ...o.activity } })) : [e]) {
        const b = bookingStatus(c);
        if (b && c.venue) out.push({ date: day.date, time: (c.start || e.start).slice(11, 16), name: c.venue.nameZh?.split(/[・／]/)[0] || c.venue.nameEn, en: c.venue.nameEn, key: `${c.venue.cityId}|${c.venue.nameEn}`, category: e.category, mapUrl: c.mapUrl || e.mapUrl, ...b });
      }
    }
    for (const s of day.optionalStops || []) {
      const b = bookingStatus({ ...s, category: '備選' });
      if (b && s.venue && b.kind !== 'open') out.push({ date: day.date, time: '彈性', name: s.venue.nameZh?.split(/[・／]/)[0] || s.venue.nameEn, en: s.venue.nameEn, key: `${s.venue.cityId}|${s.venue.nameEn}`, category: '備選', mapUrl: s.mapUrl, ...b });
    }
  }
  return out;
}
