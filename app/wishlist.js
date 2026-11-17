// Wishlist ("願望清單"): shared recommendations from data/wishlist.json plus each
// device's own additions, completion stamps and team votes, with light game rules.
import { PARTY } from './world/team.js';

export const WISH_CITIES = [
  { id: 'madrid', name: '馬德里', color: '#ffd23f' }, { id: 'sevilla', name: '塞維亞', color: '#ff9a3c' },
  { id: 'granada', name: '格拉納達', color: '#e8574a' }, { id: 'barcelona', name: '巴塞隆納', color: '#3fa7ff' },
  { id: 'spain', name: '全西班牙', color: '#9d70e0' },
];
export const LEVELS = [
  [0, '見習旅人'], [30, '背包新手'], [80, 'Tapas 學徒'], [150, '廣場常客'], [240, '高第粉絲'], [350, '佛朗明哥之星'], [480, '西班牙通'],
  [640, '美食探險家'], [820, '城市漫遊大師'], [1050, '傳說旅行團'], [1300, '西班牙榮譽市民'],
];
export const CATEGORIES = [['all', '全部'], ['景點', '🏛️ 景點'], ['美食', '🍴 美食'], ['飲品', '🍷 飲品'], ['購物', '🛍️ 逛街'], ['伴手禮', '🎁 伴手禮'], ['體驗', '🎟️ 體驗'], ['散步', '🚶 散步'], ['拍照', '📸 拍照']];
const FOUR = ['madrid', 'sevilla', 'granada', 'barcelona'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const emptyWishState = () => ({ done: {}, votes: {}, custom: [], hidden: [] });

export function validWishData(data) {
  return !!data && Array.isArray(data.items) && data.items.every(i => i && typeof i.id === 'string' && typeof i.title === 'string' && ['do', 'buy'].includes(i.type));
}

export function allWishes(base, state) {
  const hidden = new Set(state.hidden || []);
  const seen = new Set();
  const list = [];
  for (const item of [...(base?.items || []), ...(state.custom || []).map(i => ({ ...i, custom: true }))]) {
    if (seen.has(item.id) || hidden.has(item.id)) continue;
    seen.add(item.id);
    const base = { points: 10, tags: [], emoji: item.type === 'buy' ? '🎁' : '⭐', city: 'spain', ...item };
    if (!Array.isArray(base.cities) || !base.cities.length) base.cities = base.city === 'spain' ? FOUR : [base.city];
    list.push(base);
  }
  return list;
}

export function levelFor(xp) {
  let i = 0;
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1][0]) i++;
  const [floor, title] = LEVELS[i], next = LEVELS[i + 1]?.[0] ?? floor;
  return { level: i + 1, title, floor, next, progress: next > floor ? (xp - floor) / (next - floor) : 1 };
}

export function score(items, state) {
  const done = items.filter(i => state.done[i.id]);
  return { xp: done.reduce((s, i) => s + (Number(i.points) || 10), 0), done: done.length, total: items.length };
}

export const inCity = (item, city) => city === 'all' || item.cities?.includes(city);
export const inCategory = (item, cat) => cat === 'all' || (cat === '伴手禮' ? item.type === 'buy' : item.tags?.includes(cat));
export function matchesQuery(item, q) {
  const t = String(q || '').trim().toLowerCase();
  if (!t) return true;
  return `${item.no ? '#' + item.no : ''} ${item.title} ${item.note || ''} ${(item.tags || []).join(' ')}`.toLowerCase().includes(t.replace(/^#/, '#'));
}
export function filterWishes(items, state, { city = 'all', cat = 'all', q = '', hideDone = false } = {}) {
  return items.filter(i => inCity(i, city) && inCategory(i, cat) && matchesQuery(i, q) && !(hideDone && state.done[i.id]));
}

export function badges(items, state) {
  const done = i => !!state.done[i.id];
  const count = f => items.filter(i => f(i) && done(i)).length;
  const gaudi = items.filter(i => i.tags?.includes('高第') && i.type === 'do');
  const voters = new Set(Object.values(state.votes || {}).flat());
  const numbered = count(i => i.no);
  const list = [
    { id: 'first', icon: '🌱', name: '第一個願望', desc: '完成任何一個願望', got: count(() => true) >= 1 },
    { id: 'ten', icon: '🔟', name: '十件達成', desc: '完成清單上的 10 件事', got: numbered >= 10 },
    { id: 'thirty', icon: '🥉', name: '三十而立', desc: '完成清單上的 30 件事', got: numbered >= 30 },
    { id: 'sixty', icon: '🥈', name: '過半冒險家', desc: '完成清單上的 60 件事', got: numbered >= 60 },
    { id: 'hundred', icon: '🥇', name: '百件全制霸', desc: '100 件事全部完成', got: numbered >= 100 },
    { id: 'foodie', icon: '🍴', name: '美食獵人', desc: '完成 10 個美食願望', got: count(i => i.tags?.includes('美食')) >= 10 },
    { id: 'drinks', icon: '🍷', name: '微醺品酒家', desc: '完成 5 個飲品願望', got: count(i => i.tags?.includes('飲品')) >= 5 },
    { id: 'shop', icon: '🛍️', name: '逛街達人', desc: '逛完 8 個購物願望', got: count(i => i.tags?.includes('購物')) >= 8 },
    { id: 'shopper', icon: '🎁', name: '伴手禮達人', desc: '買到 6 樣伴手禮', got: count(i => i.type === 'buy') >= 6 },
    { id: 'gaudi', icon: '🦎', name: '高第迷', desc: '完成所有高第建築願望', got: gaudi.length > 0 && gaudi.every(done) },
    { id: 'photo', icon: '📸', name: '攝影師之眼', desc: '完成 6 個拍照任務', got: count(i => i.tags?.includes('拍照')) >= 6 },
    { id: 'nye', icon: '🍇', name: '跨年好運', desc: '跨年吃下 12 顆葡萄', got: !!state.done['bcn-grapes'] },
    { id: 'team', icon: '🤝', name: '全員參與', desc: 'holyman、勳、ㄓㄒ、33 都投過「想要」', got: PARTY.every(m => voters.has(m.id)) },
  ];
  for (const c of WISH_CITIES.slice(0, 4)) {
    const cityDo = items.filter(i => i.type === 'do' && i.cities?.length === 1 && i.cities[0] === c.id);
    list.push({ id: `city-${c.id}`, icon: '🏅', name: `${c.name}制霸`, desc: `完成只在${c.name}的 ${cityDo.length} 件事`, got: cityDo.length > 0 && cityDo.every(done) });
  }
  return list;
}

export function wishesForPlace(items, key) {
  if (key.endsWith('|souvenir')) { const city = key.split('|')[0]; return items.filter(i => i.type === 'buy' && inCity(i, city)); }
  return items.filter(i => i.place === key);
}
export function openWishCount(items, state, key) {
  if (key.endsWith('|souvenir')) return 1;
  return wishesForPlace(items, key).filter(i => !state.done[i.id]).length;
}

export function pickGacha(items, state, city, random = Math.random) {
  const open = items.filter(i => !state.done[i.id]);
  const local = open.filter(i => inCity(i, city));
  const pool = local.length && random() < .8 ? local : open;
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

// A small, stable set of open wishes for one city on one day (used by 現在, 行程 and the 3D quest).
export function dailyPicks(items, state, city, date, n = 3) {
  const open = items.filter(i => !state.done[i.id] && inCity(i, city));
  const seed = [...`${date}${city}`].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const specific = open.filter(i => i.cities.length < 4), shared = open.filter(i => i.cities.length === 4);
  const order = list => list.map((i, k) => [((seed ^ (k * 2654435761)) >>> 0) % 9973, i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  return [...order(specific), ...order(shared)].slice(0, n);
}

export function makeCustom({ title, type, city, emoji, note }, now = Date.now()) {
  const t = String(title || '').trim().slice(0, 60);
  if (!t) throw new Error('請輸入願望名稱');
  const c = WISH_CITIES.some(x => x.id === city) ? city : 'spain';
  return {
    id: `my-${now.toString(36)}`, type: type === 'buy' ? 'buy' : 'do', city: c, cities: c === 'spain' ? FOUR : [c],
    emoji: [...String(emoji || '').trim()].slice(0, 2).join('') || (type === 'buy' ? '🎁' : '⭐'),
    title: t, note: String(note || '').trim().slice(0, 200), points: 10, tags: ['自己新增'],
  };
}

// ---------- rendering ----------
const cityName = id => WISH_CITIES.find(c => c.id === id)?.name || '全西班牙';
const cityColor = id => WISH_CITIES.find(c => c.id === id)?.color || '#9d70e0';
const SHORT = { madrid: '馬', sevilla: '塞', granada: '格', barcelona: '巴' };
const cityTags = item => item.cities.length === 4 ? '<span class="ctag all">四城</span>' : item.cities.map(c => `<span class="ctag" style="--c:${cityColor(c)}">${SHORT[c]}</span>`).join('');

function votesHtml(item, state) {
  const votes = state.votes?.[item.id] || [];
  return `<div class="wish-votes" aria-label="誰想要">${PARTY.map(m => `<button class="vote ${votes.includes(m.id) ? 'on' : ''}" data-action="wish-vote" data-id="${esc(item.id)}" data-member="${m.id}" style="--shirt:${m.shirt}" aria-pressed="${votes.includes(m.id)}" title="${esc(m.name)}想要">${esc(m.name)}</button>`).join('')}${item.custom ? `<button class="vote del" data-action="wish-delete" data-id="${esc(item.id)}" title="刪除">🗑</button>` : ''}</div>`;
}
const checkButton = (item, done, cls = 'wish-check') => `<button class="${cls}" data-action="wish-toggle" data-id="${esc(item.id)}" aria-pressed="${done}" aria-label="${done ? '取消完成' : '完成'}：${esc(item.title)}">${done ? '<span class="stamp">¡HECHO!</span>' : (item.type === 'buy' ? '買到' : '完成')}</button>`;

export function wishCard(item, state, compact = false) {
  const done = !!state.done[item.id];
  return `<article class="wish ${done ? 'done' : ''} ${item.type}" style="--c:${cityColor(item.city)}" id="wish-${esc(item.id)}">
    <div class="wish-emoji">${esc(item.emoji)}</div>
    <div class="wish-main">
      <div class="wish-meta">${item.no ? `<span class="wish-no">#${item.no}</span>` : ''}${cityTags(item)}<span>${item.type === 'buy' ? '伴手禮' : '想做的事'}</span><span class="wish-pts">+${esc(item.points)} XP</span>${item.custom ? '<span>我新增</span>' : ''}</div>
      <h3>${esc(item.title)}</h3>
      ${item.note && !compact ? `<p>${esc(item.note)}</p>` : ''}
      ${compact ? '' : votesHtml(item, state)}
    </div>
    ${checkButton(item, done)}
  </article>`;
}

// One-line row for fast scanning; tap the row to see notes, votes and the map shortcut.
export function wishRow(item, state) {
  const done = !!state.done[item.id];
  const votes = state.votes?.[item.id] || [];
  return `<div class="wrow ${done ? 'done' : ''}" id="wish-${esc(item.id)}">
    <details><summary><span class="wrow-no">${item.no ? item.no : '＋'}</span><span class="wrow-emoji">${esc(item.emoji)}</span><span class="wrow-main"><b>${esc(item.title)}</b><span class="wrow-tags">${cityTags(item)}${votes.length ? `<span class="wrow-votes">♥${votes.length}</span>` : ''}</span></span></summary>
      <div class="wrow-body">${item.note ? `<p>${esc(item.note)}</p>` : ''}${votesHtml(item, state)}${item.place ? `<button class="text-button" data-action="wish-map" data-place="${esc(item.place)}">🗺️ 在冒險地圖上看這個地點 →</button>` : ''}</div>
    </details>
    ${checkButton(item, done, 'wrow-check')}
  </div>`;
}

export function wishPage(base, state, ui) {
  const items = allWishes(base, state);
  const { xp, done, total } = score(items, state);
  const lv = levelFor(xp);
  const tab = ['list', 'stamps', 'badges'].includes(ui.tab) ? ui.tab : 'list';
  const city = ui.city || 'all', cat = ui.cat || 'all', view = ui.view || 'rows';
  const numbered = items.filter(i => i.no), numberedDone = numbered.filter(i => state.done[i.id]).length;
  const header = `<section class="wish-hero">
      <div class="wish-level"><span>Lv.${lv.level}</span><small>${esc(lv.title)}</small></div>
      <div class="wish-xp"><div class="wish-xp-top"><strong>100 件事冒險手帳</strong><span>${xp} XP${lv.next > lv.floor ? ` · 再 ${lv.next - xp} 升級` : ' · 滿級！'}</span></div><div class="xp-bar"><i style="width:${Math.round(lv.progress * 100)}%"></i></div>
      <div class="wish-stats"><span>📋 清單 ${numberedDone}/${numbered.length}</span><span>🏵️ 全部集章 ${done}/${total}</span><span>🏆 成就 ${badges(items, state).filter(b => b.got).length}</span></div></div>
    </section>`;
  const gacha = `<section class="gacha ${ui.gachaSpin ? 'spin' : ''}">
      <div class="gacha-machine" aria-hidden="true"><div class="gacha-dome">${['#ff6b6b', '#ffd23f', '#3fc5ff', '#6be675', '#ff9de2'].map((c, i) => `<i style="--c:${c};--i:${i}"></i>`).join('')}</div><div class="gacha-body"><span></span></div></div>
      <div class="gacha-text"><strong>不知道做什麼？轉一顆！</strong><p>優先抽${ui.todayCity ? `「${cityName(ui.todayCity)}」` : '目前所在城市'}還沒完成的事。</p></div><button class="button primary gacha-go" data-action="wish-gacha">🎲</button>
      ${ui.gachaPick ? `<div class="gacha-result">${wishCard(ui.gachaPick, state, true)}</div>` : ''}
    </section>`;
  const tabs = `<div class="wish-tabs" role="tablist">${[['list', '📋 100 件事'], ['stamps', '🏵️ 集章簿'], ['badges', '🏆 成就']].map(([k, l]) => `<button role="tab" class="${tab === k ? 'on' : ''}" aria-selected="${tab === k}" data-action="wish-tab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'list') {
    const cityChips = [{ id: 'all', name: '全部' }, ...(ui.todayCity ? [{ id: ui.todayCity, name: `📍 今天・${cityName(ui.todayCity)}`, today: true }] : []), ...WISH_CITIES.slice(0, 4).filter(c => c.id !== ui.todayCity)];
    const controls = `<div class="wish-tools">
        <label class="wish-search">🔍<input id="wish-search" type="search" placeholder="搜尋：編號、Tapas、ZARA、高第…" value="${esc(ui.q || '')}" aria-label="搜尋願望"></label>
        <div class="wish-cities">${cityChips.map(c => `<button class="${city === c.id ? 'on' : ''} ${c.today ? 'today' : ''}" data-action="wish-city" data-city="${c.id}">${esc(c.name)}</button>`).join('')}</div>
        <div class="wish-cities cats">${CATEGORIES.map(([k, l]) => `<button class="${cat === k ? 'on' : ''}" data-action="wish-cat" data-cat="${k}">${l}</button>`).join('')}</div>
        <div class="wish-view"><button class="${ui.hideDone ? 'on' : ''}" data-action="wish-hide" aria-pressed="${!!ui.hideDone}">${ui.hideDone ? '☑' : '☐'} 隱藏已完成</button><button class="${view === 'rows' ? 'on' : ''}" data-action="wish-view" data-view="rows">☰ 快速清單</button><button class="${view === 'cards' ? 'on' : ''}" data-action="wish-view" data-view="cards">▦ 卡片</button></div>
      </div>`;
    const searching = !!String(ui.q || '').trim();
    const list = filterWishes(items, state, searching ? { q: ui.q, hideDone: ui.hideDone } : { city, cat, hideDone: ui.hideDone });
    const groups = [['', list.filter(i => i.no)], ['✨ 補充推薦', list.filter(i => !i.no && !i.custom)], ['📝 我們新增的', list.filter(i => i.custom)]];
    const render = arr => view === 'cards' ? `<div class="wish-list">${arr.map(i => wishCard(i, state)).join('')}</div>` : `<div class="wrows">${arr.map(i => wishRow(i, state)).join('')}</div>`;
    body = controls + `<p class="wish-count">${searching ? '🔍 搜尋全部城市與分類・' : ''}顯示 ${list.length} 項・已完成 ${list.filter(i => state.done[i.id]).length}</p>${gacha}` +
      (list.length ? groups.filter(([, arr]) => arr.length).map(([title, arr]) => `${title ? `<h3 class="wish-sub">${title}</h3>` : ''}${render(arr)}`).join('') : '<p class="caption">沒有符合的願望，換個城市或分類看看，或從下方新增一個！</p>');
    body += addForm(cat === '伴手禮' ? 'buy' : 'do', city === 'all' ? 'spain' : city);
  } else if (tab === 'stamps') {
    const doneItems = items.filter(i => state.done[i.id]).sort((a, b) => state.done[a.id] - state.done[b.id]);
    const passport = new Set(ui.passport || []);
    body = `<h3 class="wish-sub">🛂 城市入境章（在冒險地圖搭車抵達就會蓋章）</h3><div class="stamp-passport">${WISH_CITIES.slice(0, 4).map(c => `<span class="${passport.has(c.id) ? '' : 'off'}" style="--c:${c.color}">${passport.has(c.id) ? '✔' : '?'}<br>${esc(c.name)}</span>`).join('')}</div><h3 class="wish-sub">🏵️ 願望章 ${doneItems.length}/${total}</h3><div class="stamp-book">${doneItems.map((i, n) => `<div class="stamp-slot got" style="--c:${cityColor(i.city)};--r:${(n * 37 % 21) - 10}deg"><span>${esc(i.emoji)}</span><small>${esc(i.title)}</small><em>${new Date(state.done[i.id]).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</em></div>`).join('')}${Array.from({ length: Math.max(0, Math.min(total, 24) - doneItems.length) }, () => '<div class="stamp-slot"><span>?</span></div>').join('')}</div><p class="caption">完成願望就會蓋上一枚章，順序就是你們的冒險紀錄。</p>`;
  } else {
    body = `<div class="badge-grid">${badges(items, state).map(b => `<div class="badge-card ${b.got ? 'got' : ''}"><span>${b.icon}</span><strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small></div>`).join('')}</div>`;
  }
  const footer = ui.syncCard || `<section class="settings-card wish-share"><h2>和朋友同步願望</h2><p>勾選完成、投票和自己新增的願望只存在這支手機。想讓所有人都看到新願望，把下面複製的內容加進 GitHub 的 <code>app/data/wishlist.json</code>，推送後 Vercel 會自動更新。</p><div class="actions"><button class="button secondary" data-action="wish-export">複製我新增的願望</button><button class="button secondary" data-action="wish-reset">重設這台裝置的進度</button></div></section>`;
  return `<div class="page-heading"><div><p class="eyebrow">WISH LIST</p><h1>願望清單</h1></div></div>${header}${tabs}${body}${footer}`;
}

function addForm(type, city) {
  return `<details class="wish-add"><summary>＋ 新增一個願望</summary>
    <form data-wish-form>
      <label class="field-label">名稱<input name="title" maxlength="60" required placeholder="${type === 'buy' ? '例如：買巴薩圍巾' : '例如：看一場足球賽'}"></label>
      <div class="wish-form-row">
        <label class="field-label">類型<select name="type"><option value="do" ${type === 'do' ? 'selected' : ''}>想做的事</option><option value="buy" ${type === 'buy' ? 'selected' : ''}>伴手禮</option></select></label>
        <label class="field-label">城市<select name="city">${WISH_CITIES.map(c => `<option value="${c.id}" ${c.id === city ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
        <label class="field-label">圖示<input name="emoji" maxlength="4" placeholder="${type === 'buy' ? '🎁' : '⭐'}"></label>
      </div>
      <label class="field-label">備註<input name="note" maxlength="200" placeholder="在哪裡、給誰、注意事項…"></label>
      <button class="button primary" type="submit">加入願望清單</button>
    </form></details>`;
}
