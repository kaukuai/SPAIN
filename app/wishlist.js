// Wishlist ("願望清單"): shared recommendations from data/wishlist.json plus each
// device's own additions, completion stamps and team votes, with light game rules.
import { PARTY } from './world/team.js';

export const WISH_CITIES = [
  { id: 'madrid', name: '馬德里', color: '#ffd23f' }, { id: 'sevilla', name: '塞維亞', color: '#ff9a3c' },
  { id: 'granada', name: '格拉納達', color: '#e8574a' }, { id: 'barcelona', name: '巴塞隆納', color: '#3fa7ff' },
  { id: 'spain', name: '全西班牙', color: '#9d70e0' },
];
export const LEVELS = [
  [0, '見習旅人'], [30, '背包新手'], [80, 'Tapas 學徒'], [150, '廣場常客'], [240, '高第粉絲'], [350, '佛朗明哥之星'], [480, '西班牙通'], [640, '傳說旅行團'],
];
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
    list.push({ points: 10, tags: [], emoji: item.type === 'buy' ? '🎁' : '⭐', city: 'spain', ...item });
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

export function badges(items, state) {
  const done = i => !!state.done[i.id];
  const count = f => items.filter(i => f(i) && done(i)).length;
  const gaudi = items.filter(i => i.tags?.includes('高第') && i.type === 'do');
  const voters = new Set(Object.values(state.votes || {}).flat());
  const list = [
    { id: 'first', icon: '🌱', name: '第一個願望', desc: '完成任何一個願望', got: count(() => true) >= 1 },
    { id: 'foodie', icon: '🍴', name: '美食獵人', desc: '完成 5 個美食願望', got: count(i => i.tags?.includes('美食')) >= 5 },
    { id: 'shopper', icon: '🛍️', name: '伴手禮達人', desc: '買到 6 樣伴手禮', got: count(i => i.type === 'buy') >= 6 },
    { id: 'gaudi', icon: '🦎', name: '高第迷', desc: '完成所有高第建築願望', got: gaudi.length > 0 && gaudi.every(done) },
    { id: 'photo', icon: '📸', name: '團體照大師', desc: '完成 4 個拍照任務', got: count(i => i.tags?.includes('拍照')) >= 4 },
    { id: 'nye', icon: '🍇', name: '跨年好運', desc: '跨年吃下 12 顆葡萄', got: !!state.done['bcn-grapes'] },
    { id: 'team', icon: '🤝', name: '全員參與', desc: '四位團員都投過「想要」', got: PARTY.every(m => voters.has(m.id)) },
  ];
  for (const c of WISH_CITIES.slice(0, 4)) {
    const cityDo = items.filter(i => i.city === c.id && i.type === 'do');
    list.push({ id: `city-${c.id}`, icon: '🏅', name: `${c.name}制霸`, desc: `完成${c.name}所有想做的事`, got: cityDo.length > 0 && cityDo.every(done) });
  }
  return list;
}

export function wishesForPlace(items, key) {
  if (key.endsWith('|souvenir')) { const city = key.split('|')[0]; return items.filter(i => i.type === 'buy' && (i.city === city || i.city === 'spain')); }
  return items.filter(i => i.place === key);
}
export function openWishCount(items, state, key) {
  if (key.endsWith('|souvenir')) return 1;
  return wishesForPlace(items, key).filter(i => !state.done[i.id]).length;
}

export function pickGacha(items, state, city, random = Math.random) {
  const open = items.filter(i => !state.done[i.id]);
  const local = open.filter(i => i.city === city);
  const pool = local.length && random() < .75 ? local : open;
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}

export function makeCustom({ title, type, city, emoji, note }, now = Date.now()) {
  const t = String(title || '').trim().slice(0, 60);
  if (!t) throw new Error('請輸入願望名稱');
  return {
    id: `my-${now.toString(36)}`, type: type === 'buy' ? 'buy' : 'do',
    city: WISH_CITIES.some(c => c.id === city) ? city : 'spain',
    emoji: [...String(emoji || '').trim()].slice(0, 2).join('') || (type === 'buy' ? '🎁' : '⭐'),
    title: t, note: String(note || '').trim().slice(0, 200), points: 10, tags: ['自己新增'],
  };
}

// ---------- rendering ----------
const cityName = id => WISH_CITIES.find(c => c.id === id)?.name || '全西班牙';
const cityColor = id => WISH_CITIES.find(c => c.id === id)?.color || '#9d70e0';

export function wishCard(item, state, compact = false) {
  const done = !!state.done[item.id];
  const votes = state.votes?.[item.id] || [];
  return `<article class="wish ${done ? 'done' : ''} ${item.type}" style="--c:${cityColor(item.city)}" id="wish-${esc(item.id)}">
    <div class="wish-emoji">${esc(item.emoji)}</div>
    <div class="wish-main">
      <div class="wish-meta"><span>${esc(cityName(item.city))}</span><span>${item.type === 'buy' ? '伴手禮' : '想做的事'}</span><span class="wish-pts">+${esc(item.points)} XP</span>${item.custom ? '<span>我新增</span>' : ''}</div>
      <h3>${esc(item.title)}</h3>
      ${item.note && !compact ? `<p>${esc(item.note)}</p>` : ''}
      ${compact ? '' : `<div class="wish-votes" aria-label="誰想要">${PARTY.map(m => `<button class="vote ${votes.includes(m.id) ? 'on' : ''}" data-action="wish-vote" data-id="${esc(item.id)}" data-member="${m.id}" style="--shirt:${m.shirt}" aria-pressed="${votes.includes(m.id)}" title="${esc(m.name)}想要">${esc(m.name)}</button>`).join('')}${item.custom ? `<button class="vote del" data-action="wish-delete" data-id="${esc(item.id)}" title="刪除">🗑</button>` : ''}</div>`}
    </div>
    <button class="wish-check" data-action="wish-toggle" data-id="${esc(item.id)}" aria-pressed="${done}" aria-label="${done ? '取消完成' : '完成'}">${done ? '<span class="stamp">¡HECHO!</span>' : (item.type === 'buy' ? '買到！' : '完成！')}</button>
  </article>`;
}

export function wishPage(base, state, ui) {
  const items = allWishes(base, state);
  const { xp, done, total } = score(items, state);
  const lv = levelFor(xp);
  const tab = ui.tab || 'do';
  const city = ui.city || 'all';
  const header = `<section class="wish-hero">
      <div class="wish-level"><span>Lv.${lv.level}</span><small>${esc(lv.title)}</small></div>
      <div class="wish-xp"><div class="wish-xp-top"><strong>願望冒險手帳</strong><span>${xp} XP${lv.next > lv.floor ? ` · 再 ${lv.next - xp} 升級` : ' · 滿級！'}</span></div><div class="xp-bar"><i style="width:${Math.round(lv.progress * 100)}%"></i></div>
      <div class="wish-stats"><span>🏵️ 集章 ${done}/${total}</span><span>🏆 成就 ${badges(items, state).filter(b => b.got).length}</span><span>👥 ${PARTY.map(m => m.name).join('・')}</span></div></div>
    </section>`;
  const gacha = `<section class="gacha ${ui.gachaSpin ? 'spin' : ''}">
      <div class="gacha-machine" aria-hidden="true"><div class="gacha-dome">${['#ff6b6b', '#ffd23f', '#3fc5ff', '#6be675', '#ff9de2'].map((c, i) => `<i style="--c:${c};--i:${i}"></i>`).join('')}</div><div class="gacha-body"><span></span></div></div>
      <div class="gacha-text"><strong>願望扭蛋機</strong><p>不知道下一步做什麼？轉一顆，優先抽目前所在城市的願望。</p><button class="button primary" data-action="wish-gacha">轉一顆 🎲</button></div>
      ${ui.gachaPick ? `<div class="gacha-result">${wishCard(ui.gachaPick, state, true)}</div>` : ''}
    </section>`;
  const tabs = `<div class="wish-tabs" role="tablist">${[['do', '✨ 想做的事'], ['buy', '🎁 伴手禮'], ['stamps', '🏵️ 集章簿'], ['badges', '🏆 成就']].map(([k, l]) => `<button role="tab" class="${tab === k ? 'on' : ''}" aria-selected="${tab === k}" data-action="wish-tab" data-tab="${k}">${l}</button>`).join('')}</div>`;
  let body = '';
  if (tab === 'do' || tab === 'buy') {
    const chips = `<div class="wish-cities">${[{ id: 'all', name: '全部' }, ...WISH_CITIES].map(c => `<button class="${city === c.id ? 'on' : ''}" data-action="wish-city" data-city="${c.id}">${c.name}</button>`).join('')}</div>`;
    const list = items.filter(i => i.type === tab && (city === 'all' || i.city === city));
    const sorted = [...list.filter(i => !state.done[i.id]), ...list.filter(i => state.done[i.id])];
    body = chips + (sorted.length ? `<div class="wish-list">${sorted.map(i => wishCard(i, state)).join('')}</div>` : '<p class="caption">這裡還沒有願望，從下方新增一個吧！</p>');
    body += addForm(tab, city === 'all' ? 'spain' : city);
  } else if (tab === 'stamps') {
    const doneItems = items.filter(i => state.done[i.id]).sort((a, b) => state.done[a.id] - state.done[b.id]);
    const passport = new Set(ui.passport || []);
    body = `<h3 class="wish-sub">🛂 城市入境章（在冒險地圖搭車抵達就會蓋章）</h3><div class="stamp-passport">${WISH_CITIES.slice(0, 4).map(c => `<span class="${passport.has(c.id) ? '' : 'off'}" style="--c:${c.color}">${passport.has(c.id) ? '✔' : '?'}<br>${esc(c.name)}</span>`).join('')}</div><h3 class="wish-sub">🏵️ 願望章</h3><div class="stamp-book">${doneItems.map((i, n) => `<div class="stamp-slot got" style="--c:${cityColor(i.city)};--r:${(n * 37 % 21) - 10}deg"><span>${esc(i.emoji)}</span><small>${esc(i.title)}</small><em>${new Date(state.done[i.id]).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' })}</em></div>`).join('')}${Array.from({ length: Math.max(0, Math.min(total, 24) - doneItems.length) }, () => '<div class="stamp-slot"><span>?</span></div>').join('')}</div><p class="caption">完成願望就會蓋上一枚章，順序就是你們的冒險紀錄。</p>`;
  } else {
    body = `<div class="badge-grid">${badges(items, state).map(b => `<div class="badge-card ${b.got ? 'got' : ''}"><span>${b.icon}</span><strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small></div>`).join('')}</div>`;
  }
  const footer = ui.syncCard || `<section class="settings-card wish-share"><h2>和朋友同步願望</h2><p>勾選完成、投票和自己新增的願望只存在這支手機。想讓所有人都看到新願望，把下面複製的內容加進 GitHub 的 <code>app/data/wishlist.json</code>，推送後 Vercel 會自動更新。</p><div class="actions"><button class="button secondary" data-action="wish-export">複製我新增的願望</button><button class="button secondary" data-action="wish-reset">重設這台裝置的進度</button></div></section>`;
  return `<div class="page-heading"><div><p class="eyebrow">WISH LIST</p><h1>願望清單</h1></div></div>${header}${gacha}${tabs}${body}${footer}`;
}

function addForm(type, city) {
  return `<details class="wish-add"><summary>＋ 新增${type === 'buy' ? '伴手禮' : '想做的事'}</summary>
    <form data-wish-form>
      <label class="field-label">名稱<input name="title" maxlength="60" required placeholder="${type === 'buy' ? '例如：買巴薩圍巾' : '例如：看一場足球賽'}"></label>
      <div class="wish-form-row">
        <label class="field-label">類型<select name="type"><option value="do" ${type === 'do' ? 'selected' : ''}>想做的事</option><option value="buy" ${type === 'buy' ? 'selected' : ''}>伴手禮</option></select></label>
        <label class="field-label">城市<select name="city">${WISH_CITIES.map(c => `<option value="${c.id}" ${c.id === city ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
        <label class="field-label">圖示<input name="emoji" maxlength="4" placeholder="${type === 'buy' ? '🎁' : '⭐'}"></label>
      </div>
      <label class="field-label">備註<input name="note" maxlength="200" placeholder="在哪裡買、給誰、注意事項…"></label>
      <button class="button primary" type="submit">加入願望清單</button>
    </form></details>`;
}
