// 工具 page: weather, currency, bill splitting, Spanish phrasebook, packing list, SOS.
import { PARTY } from './world/team.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const emptyToolsState = () => ({ tab: 'weather', rate: null, rateAt: null, eur: 10, expenses: [], packed: {} });

export const TOOL_CITIES = [
  { id: 'madrid', name: '馬德里', at: [40.4168, -3.7038], dates: ['2026-12-24', '2026-12-26'], climate: [10, 3] },
  { id: 'sevilla', name: '塞維亞', at: [37.3891, -5.9845], dates: ['2026-12-26', '2026-12-28'], climate: [16, 7] },
  { id: 'granada', name: '格拉納達', at: [37.1773, -3.5986], dates: ['2026-12-28', '2026-12-29'], climate: [12, 2] },
  { id: 'barcelona', name: '巴塞隆納', at: [41.3870, 2.1700], dates: ['2026-12-29', '2027-01-03'], climate: [15, 8] },
];
const WMO = c => c === 0 ? '☀️' : c <= 2 ? '🌤️' : c === 3 ? '☁️' : c <= 48 ? '🌫️' : c <= 67 ? '🌧️' : c <= 77 ? '🌨️' : c <= 82 ? '🌦️' : c <= 86 ? '🌨️' : '⛈️';

export const PHRASES = [
  { cat: '👋 打招呼', list: [['你好', 'Hola'], ['早安', 'Buenos días'], ['午安／晚上好', 'Buenas tardes'], ['晚安', 'Buenas noches'], ['謝謝', 'Gracias'], ['非常感謝', 'Muchas gracias'], ['請', 'Por favor'], ['不好意思（借過、請問）', 'Perdón'], ['再見', 'Hasta luego']] },
  { cat: '🍽️ 點餐', list: [['四個人的位子，謝謝', 'Una mesa para cuatro, por favor'], ['請給我菜單', 'La carta, por favor'], ['你推薦什麼？', '¿Qué me recomienda?'], ['一杯生啤酒', 'Una caña, por favor'], ['礦泉水（無氣泡）', 'Agua sin gas, por favor'], ['不要洋蔥', 'Sin cebolla, por favor'], ['買單，謝謝', 'La cuenta, por favor'], ['可以刷卡嗎？', '¿Puedo pagar con tarjeta?'], ['超好吃！', '¡Está buenísimo!']] },
  { cat: '🛍️ 購物', list: [['這個多少錢？', '¿Cuánto cuesta?'], ['我只是看看', 'Solo estoy mirando'], ['有其他尺寸嗎？', '¿Tiene otra talla?'], ['可以幫我辦退稅嗎？', '¿Me puede hacer el tax free, por favor?'], ['我要這個', 'Me llevo esto']] },
  { cat: '🚇 交通與問路', list: [['地鐵站在哪裡？', '¿Dónde está el metro?'], ['廁所在哪裡？', '¿Dónde están los servicios?'], ['請載我到這個地址', 'A esta dirección, por favor'], ['幾點出發？', '¿A qué hora sale?'], ['這個月台對嗎？', '¿Es este el andén correcto?']] },
  { cat: '🆘 緊急', list: [['救命！', '¡Ayuda!'], ['請叫警察', 'Llame a la policía, por favor'], ['我需要醫生', 'Necesito un médico'], ['我的東西被偷了', 'Me han robado'], ['我的護照不見了', 'He perdido mi pasaporte']] },
];

export const PACKING = [
  ['clothes', '🧥 保暖外套／羽絨衣（格拉納達夜裡可能接近 0°C）'], ['scarf', '🧣 圍巾、手套、毛帽'], ['shoes', '👟 好走的鞋（石板路很多）'],
  ['plug', '🔌 轉接頭：西班牙是 C／F 型插座、230V'], ['power', '🔋 行動電源與充電線'], ['bag', '👜 防扒斜背包或腰包（拉鍊在前面）'],
  ['passport', '🛂 護照＋影本／手機照片'], ['cards', '💳 兩張不同卡組的信用卡'], ['cash', '💶 少量歐元現金'], ['sim', '📶 歐洲 eSIM／國際漫遊'],
  ['umbrella', '☂️ 折疊傘'], ['meds', '💊 常備藥'], ['lotion', '🧴 乳液、護唇膏（冬天很乾）'], ['red', '❤️ 跨年紅色內衣（西班牙習俗，討好運）'], ['tooth', '🪥 牙刷牙膏（部分旅館不提供）'],
];

// ---------- bill splitting ----------
export function balances(expenses) {
  const bal = Object.fromEntries(PARTY.map(m => [m.id, 0]));
  for (const e of expenses) {
    const who = (e.split?.length ? e.split : PARTY.map(m => m.id)).filter(id => id in bal);
    if (!who.length || !(e.payer in bal)) continue;
    const share = e.amount / who.length;
    bal[e.payer] += e.amount;
    for (const id of who) bal[id] -= share;
  }
  return bal;
}
export function settle(bal) {
  const debt = Object.entries(bal).map(([id, v]) => ({ id, v: Math.round(v * 100) / 100 }));
  const pay = debt.filter(d => d.v < -.004).sort((a, b) => a.v - b.v), get = debt.filter(d => d.v > .004).sort((a, b) => b.v - a.v);
  const out = [];
  let i = 0, j = 0;
  while (i < pay.length && j < get.length) {
    const amt = Math.min(-pay[i].v, get[j].v);
    out.push({ from: pay[i].id, to: get[j].id, amount: Math.round(amt * 100) / 100 });
    pay[i].v += amt; get[j].v -= amt;
    if (pay[i].v > -.005) i++;
    if (get[j].v < .005) j++;
  }
  return out;
}
export function makeExpense({ title, amount, payer, split }, now = Date.now()) {
  const a = Math.round(Number(String(amount).replace(',', '.')) * 100) / 100;
  if (!Number.isFinite(a) || a <= 0) throw new Error('請輸入正確金額');
  if (!PARTY.some(m => m.id === payer)) throw new Error('請選擇付款的人');
  const who = (Array.isArray(split) ? split : [split]).filter(id => PARTY.some(m => m.id === id));
  if (!who.length) throw new Error('至少選一位分攤的人');
  return { id: `x${now.toString(36)}`, title: String(title || '').trim().slice(0, 40) || '花費', amount: a, payer, split: who, at: now };
}
const nameOf = id => PARTY.find(m => m.id === id)?.name || id;
const eur = n => `€${Number(n).toFixed(2)}`;

export function toolsPage(st, live) {
  const tabs = [['weather', '🌤️ 天氣'], ['money', '💱 匯率'], ['split', '🧾 分帳'], ['phrases', '🗣️ 西文'], ['pack', '🎒 打包'], ['sos', '🆘 緊急']];
  let body = '';
  if (st.tab === 'weather') {
    const w = live.weather;
    body = `<p class="caption">現在天氣來自 Open-Meteo；出發前 16 天內會顯示你們在每座城市那幾天的預報，更早則顯示 12 月平均氣溫。</p><div class="tool-weather">${TOOL_CITIES.map(c => {
      const now = w?.current?.[c.id], fc = w?.forecast?.[c.id] || [];
      return `<article class="tw-city"><header><h3>${c.name}</h3>${now ? `<span class="tw-now">${WMO(now.code)} ${now.temp}°</span>` : ''}</header>
        <p class="caption">停留 ${c.dates[0].slice(5).replace('-', '/')}–${c.dates[1].slice(5).replace('-', '/')} · 12 月平均 ${c.climate[1]}–${c.climate[0]}°C</p>
        ${fc.length ? `<div class="tw-days">${fc.map(d => `<div><small>${d.date.slice(5).replace('-', '/')}</small><span>${WMO(d.code)}</span><b>${d.max}°</b><em>${d.min}°</em></div>`).join('')}</div>` : `<p class="tw-hint">${w ? '預報會在出發前 16 天出現' : '連線後會顯示即時天氣'}</p>`}
      </article>`;
    }).join('')}</div>`;
  } else if (st.tab === 'money') {
    const rate = st.rate || 35;
    const val = Number(st.eur) || 0;
    body = `<section class="tool-card money"><div class="money-row"><label>歐元 €<input type="number" inputmode="decimal" min="0" step="0.5" value="${esc(st.eur)}" data-tool-input="eur"></label><span>≈</span><div class="money-out"><small>新台幣</small><strong>NT$ ${Math.round(val * rate).toLocaleString('zh-TW')}</strong></div></div>
      <div class="money-quick">${[1, 3, 5, 10, 20, 50, 100].map(n => `<button data-action="tool-eur" data-v="${n}">€${n}</button>`).join('')}</div>
      <label class="field-label">匯率（1 歐元 = ? 台幣）<input type="number" step="0.01" min="1" value="${esc(rate)}" data-tool-input="rate"></label>
      <p class="caption">${st.rateAt ? `已於 ${new Date(st.rateAt).toLocaleString('zh-TW')} 從網路更新（open.er-api.com，參考用）。` : '目前是預設估計值，連線後按下方按鈕更新，或自行輸入銀行匯率。'}刷卡另有海外手續費約 1.5%。</p>
      <button class="button secondary" data-action="tool-rate">更新匯率</button></section>
      <section class="tool-card"><h3>常見價格感</h3><ul class="tool-list"><li>咖啡 Café con leche：約 €1.5–2.5</li><li>一杯生啤 Caña：約 €2–3.5</li><li>地鐵單程：約 €1.5–3（依城市與票種，以官方票價為準）</li><li>Tapas 一小盤：約 €3–6</li></ul></section>`;
  } else if (st.tab === 'split') {
    const bal = balances(st.expenses), plan = settle(bal), total = st.expenses.reduce((s, e) => s + e.amount, 0);
    body = `<section class="tool-card"><h3>新增一筆花費</h3><form data-split-form class="split-form">
        <label class="field-label">項目<input name="title" maxlength="40" placeholder="例如：Botín 晚餐"></label>
        <label class="field-label">金額 €<input name="amount" inputmode="decimal" required placeholder="0.00"></label>
        <label class="field-label">誰付的<select name="payer">${PARTY.map(m => `<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label>
        <fieldset class="split-who"><legend>誰要分攤</legend>${PARTY.map(m => `<label><input type="checkbox" name="split" value="${m.id}" checked><span style="--c:${m.shirt}">${esc(m.name)}</span></label>`).join('')}</fieldset>
        <button class="button primary" type="submit">記一筆</button></form></section>
      <section class="tool-card"><h3>結算 <small>總計 ${eur(total)}</small></h3>
        <div class="split-bal">${PARTY.map(m => `<div style="--c:${m.shirt}"><b>${esc(m.name)}</b><span class="${bal[m.id] >= 0 ? 'pos' : 'neg'}">${bal[m.id] >= 0 ? '+' : '−'}${eur(Math.abs(bal[m.id]))}</span></div>`).join('')}</div>
        ${plan.length ? `<ul class="tool-list settle">${plan.map(p => `<li><b>${esc(nameOf(p.from))}</b> 給 <b>${esc(nameOf(p.to))}</b> ${eur(p.amount)}</li>`).join('')}</ul>` : '<p class="caption">目前大家都平衡了 👍</p>'}
        <div class="actions"><button class="button secondary" data-action="split-copy">複製結算給大家</button>${st.expenses.length ? '<button class="button secondary" data-action="split-clear">清空</button>' : ''}</div></section>
      <section class="tool-card"><h3>明細</h3>${st.expenses.length ? `<ul class="split-list">${st.expenses.slice().reverse().map(e => `<li><div><b>${esc(e.title)}</b><small>${esc(nameOf(e.payer))} 付 · ${e.split.length === PARTY.length ? '四人平分' : e.split.map(nameOf).join('、')}</small></div><span>${eur(e.amount)}</span><button class="vote del" data-action="split-del" data-id="${esc(e.id)}" aria-label="刪除">✕</button></li>`).join('')}</ul>` : '<p class="caption">還沒有紀錄。記帳只存在這支手機，結算後用「複製」貼到群組。</p>'}</section>`;
  } else if (st.tab === 'phrases') {
    body = `<p class="caption">點 🔊 用手機的西班牙文語音念出來（需要手機有西班牙文語音，iPhone 一般都有）。</p>${PHRASES.map(g => `<section class="tool-card"><h3>${g.cat}</h3><ul class="phrases">${g.list.map(([zh, es]) => `<li><div><b>${esc(es)}</b><small>${esc(zh)}</small></div><button class="speak" data-action="speak" data-text="${esc(es)}" aria-label="念出 ${esc(es)}">🔊</button></li>`).join('')}</ul></section>`).join('')}`;
  } else if (st.tab === 'pack') {
    const n = PACKING.filter(([id]) => st.packed[id]).length;
    body = `<section class="tool-card"><h3>打包清單 <small>${n}/${PACKING.length}</small></h3><div class="xp-bar"><i style="width:${Math.round(n / PACKING.length * 100)}%"></i></div><ul class="pack-list">${PACKING.map(([id, label]) => `<li><label><input type="checkbox" data-action="pack" data-id="${id}" ${st.packed[id] ? 'checked' : ''}><span>${esc(label)}</span></label></li>`).join('')}</ul></section>`;
  } else {
    body = `<section class="tool-card sos"><h3>🚨 西班牙緊急電話</h3><a class="sos-call" href="tel:112"><b>112</b><span>警察・救護車・消防（歐盟通用，可說英文）</span></a></section>
      <section class="tool-card sos"><h3>🇹🇼 外交部急難救助</h3><a class="sos-call" href="tel:0080008850885"><b>00-800-0885-0885</b><span>旅外國人急難救助全球免付費專線（從西班牙撥打）</span></a>
        <a class="button secondary" href="https://www.roc-taiwan.org/es/" target="_blank" rel="noopener noreferrer">駐西班牙台北經濟文化辦事處網站 ↗</a></section>
      <section class="tool-card"><h3>護照遺失怎麼辦</h3><ol class="tool-list"><li>先到附近警察局報案，拿到報案證明（Denuncia）。</li><li>聯絡駐西班牙台北經濟文化辦事處，申請返國用的入國證明書。</li><li>同時聯絡航空公司與旅館說明狀況。</li></ol></section>
      <section class="tool-card"><h3>防扒提醒</h3><ul class="tool-list"><li>蘭布拉大道、地鐵、聖家堂與熱門景點周邊扒手很多。</li><li>手機不要放後口袋或桌上，背包背前面。</li><li>有人突然搭話、問路、潑東西在你身上時，先護住包包。</li></ul></section>`;
  }
  return `<div class="page-heading"><div><p class="eyebrow">TRAVEL TOOLS</p><h1>旅行工具</h1></div></div>
    <div class="wish-tabs tool-tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}" data-action="tool-tab" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
}

export function settleText(st) {
  const bal = balances(st.expenses), plan = settle(bal);
  return ['🧾 holyman 西班牙團分帳', ...st.expenses.map(e => `・${e.title} ${eur(e.amount)}（${nameOf(e.payer)} 付）`), '— 結算 —', ...(plan.length ? plan.map(p => `${nameOf(p.from)} → ${nameOf(p.to)} ${eur(p.amount)}`) : ['大家都平衡了'])].join('\n');
}

export async function fetchToolWeather(today) {
  const lat = TOOL_CITIES.map(c => c.at[0]).join(','), lon = TOOL_CITIES.map(c => c.at[1]).join(',');
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=16&timezone=Europe%2FMadrid`);
  if (!res.ok) throw new Error('weather');
  const data = await res.json(), arr = Array.isArray(data) ? data : [data];
  const current = {}, forecast = {};
  TOOL_CITIES.forEach((c, i) => {
    const d = arr[i]; if (!d) return;
    if (d.current) current[c.id] = { temp: Math.round(d.current.temperature_2m), code: d.current.weather_code };
    forecast[c.id] = (d.daily?.time || []).map((date, k) => ({ date, code: d.daily.weather_code[k], max: Math.round(d.daily.temperature_2m_max[k]), min: Math.round(d.daily.temperature_2m_min[k]) })).filter(x => x.date >= c.dates[0] && x.date <= c.dates[1]);
  });
  return { current, forecast, at: today };
}
export async function fetchRate() {
  const res = await fetch('https://open.er-api.com/v6/latest/EUR');
  if (!res.ok) throw new Error('rate');
  const data = await res.json();
  const r = Number(data?.rates?.TWD);
  if (!Number.isFinite(r) || r < 10 || r > 80) throw new Error('rate');
  return Math.round(r * 100) / 100;
}
