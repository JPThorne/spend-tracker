// =============================================================================
// Spend — application logic
// =============================================================================
// Single-file vanilla JS. No build step. Hash-routed views, keyboard control,
// drawer + modal, sample data seeded into memory.
//
// Where to plug in the backend:
//   - `api.*` calls below are stubs that touch in-memory state. Swap them for
//     fetch() against your Cloud Function endpoints (/export, /categories,
//     /categorize, /categorize-bulk) when wiring up the real thing.
// =============================================================================

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const state = {
  /** @type {Category[]} */ categories: [],
  /** @type {Txn[]}      */ transactions: [],
  currentMonth: '2026-05',
  filter: 'all',
  /** focused row id on the Categorize page */
  focusedId: null,
  /** undo stack for category assignments */
  undo: [],
  /** count of categorizations made this session (for the progress bar) */
  sessionDone: 0,
};

// -----------------------------------------------------------------------------
// Sample data (replace with API calls)
// -----------------------------------------------------------------------------

const CAT_PALETTE = ['cat-1','cat-2','cat-3','cat-4','cat-5','cat-6','cat-7','cat-8'];

function seed() {
  state.categories = [
    { id: 'c1', name: 'Groceries',     color: 'var(--cat-1)' },
    { id: 'c2', name: 'Transport',     color: 'var(--cat-2)' },
    { id: 'c3', name: 'Bills',         color: 'var(--cat-3)' },
    { id: 'c4', name: 'Dining',        color: 'var(--cat-4)' },
    { id: 'c5', name: 'Subscriptions', color: 'var(--cat-5)' },
    { id: 'c6', name: 'Health',        color: 'var(--cat-6)' },
    { id: 'c7', name: 'Shopping',      color: 'var(--cat-7)' },
    { id: 'c8', name: 'Other',         color: 'var(--cat-8)' },
  ];

  const MERCHANTS = {
    c1: [['WOOLWORTHS GARDENS', 350, 1500], ['CHECKERS HYPER CAVENDISH', 600, 2200], ['PICK N PAY OBSERVATORY', 200, 1100], ['SPAR ON KLOOF', 80, 450]],
    c2: [['UBER TRIP HELP.UBER.COM', 50, 280], ['SHELL ULTRA CITY N1', 400, 850], ['BP SOUTHERN SUNS', 350, 800], ['MYCITI TOPUP', 100, 200], ['CITY PARKING WC', 30, 90]],
    c3: [['CITY OF CT ELECTRICITY', 900, 1800], ['VODACOM POSTPAID', 599, 599], ['VUMATEL FIBRE', 899, 899], ['CITY OF CT WATER', 480, 720]],
    c4: [['CAFE PARADISO', 180, 480], ['KAUAI BREE STREET', 75, 180], ['MISS K FOOD CAFE', 220, 520], ['UBER EATS', 90, 280], ['THE TEST KITCHEN', 1200, 2400]],
    c5: [['NETFLIX.COM 0277014', 199, 199], ['SPOTIFY P0F4', 119, 119], ['APPLE.COM/BILL', 99, 379], ['ICLOUD STORAGE', 39, 39]],
    c6: [['DISCHEM CAVENDISH', 80, 420], ['DISCOVERY HEALTH PREMIUM', 3450, 3450], ['VIRGIN ACTIVE WATERFRONT', 595, 595]],
    c7: [['TAKEALOT.COM', 120, 1800], ['ZARA V&A', 280, 1400], ['MR PRICE HOME', 150, 800], ['AMAZON.CO.UK', 200, 900]],
    c8: [['INTERNAL TRANSFER', 100, 5000], ['EFT FEE', 6, 20], ['ATM WITHDRAWAL', 200, 1000]],
  };

  // Build 6 months of data, May 2026 being "current"
  const months = [
    { ym: '2025-12', month: 11, year: 2025 },
    { ym: '2026-01', month: 0,  year: 2026 },
    { ym: '2026-02', month: 1,  year: 2026 },
    { ym: '2026-03', month: 2,  year: 2026 },
    { ym: '2026-04', month: 3,  year: 2026 },
    { ym: '2026-05', month: 4,  year: 2026 },
  ];

  const txns = [];
  let idCounter = 1;

  // Older months: all categorized; current month: mostly uncategorized
  for (const m of months) {
    const daysInMonth = new Date(m.year, m.month + 1, 0).getDate();
    const isCurrent = m.ym === '2026-05';
    const isoMonth = String(m.month + 1).padStart(2, '0');

    // Distribute across categories
    for (const cat of state.categories) {
      const recipes = MERCHANTS[cat.id] || [];
      // count of txns per cat per month — varies by category
      const baseCount = ({c1:8,c2:6,c3:3,c4:7,c5:3,c6:2,c7:4,c8:3})[cat.id] || 3;
      const count = Math.max(1, baseCount + Math.round((seedRand(m.ym+cat.id) - 0.5) * 3));

      for (let i = 0; i < count; i++) {
        const recipe = recipes[Math.floor(seedRand(m.ym+cat.id+i) * recipes.length)];
        if (!recipe) continue;
        const [name, min, max] = recipe;
        const amt = -(min + seedRand('amt'+m.ym+cat.id+i) * (max - min));
        const day = Math.max(1, Math.min(daysInMonth, Math.floor(seedRand('d'+m.ym+cat.id+i) * daysInMonth) + 1));
        // For current month, only include up to day 14 (mid-month feel)
        if (isCurrent && day > 14) continue;
        txns.push({
          id: 't' + (idCounter++),
          date: `${m.year}-${isoMonth}-${String(day).padStart(2,'0')}`,
          desc: name,
          amount: Math.round(amt * 100) / 100,
          categoryId: isCurrent ? null : cat.id,
        });
      }
    }

    // Add a salary credit
    if (!isCurrent) {
      txns.push({
        id: 't' + (idCounter++),
        date: `${m.year}-${isoMonth}-25`,
        desc: 'SALARY DEPOSIT',
        amount: 38500,
        categoryId: 'c8',
      });
    }
  }

  // Sort: most recent first
  txns.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  state.transactions = txns;

  // For current month, seed the focus to the first uncategorized txn
  const firstUncat = txns.find(t => t.categoryId == null);
  state.focusedId = firstUncat ? firstUncat.id : null;
}

// Tiny deterministic PRNG so the seed data is stable between reloads
function seedRand(key) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

// -----------------------------------------------------------------------------
// "API" — swap these for real fetches against your backend
// -----------------------------------------------------------------------------
const api = {
  async categorize(txnId, categoryId) {
    const t = state.transactions.find(x => x.id === txnId);
    if (!t) return;
    const prev = t.categoryId;
    t.categoryId = categoryId;
    state.undo.push({ txnId, prev });
    if (state.undo.length > 50) state.undo.shift();
    if (prev == null && categoryId != null) state.sessionDone++;
  },
  async addCategory(name) {
    const color = `var(--${CAT_PALETTE[state.categories.length % CAT_PALETTE.length]})`;
    const cat = { id: 'c' + Date.now(), name, color };
    state.categories.push(cat);
    return cat;
  },
  async renameCategory(id, name) {
    const c = state.categories.find(x => x.id === id);
    if (c) c.name = name;
  },
  async deleteCategory(id) {
    state.categories = state.categories.filter(c => c.id !== id);
    state.transactions.forEach(t => { if (t.categoryId === id) t.categoryId = null; });
  },
  async reorderCategory(id, toIndex) {
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx < 0) return;
    const [cat] = state.categories.splice(idx, 1);
    state.categories.splice(toIndex, 0, cat);
  },
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

function fmtMoney(n, opts = {}) {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : n > 0 ? (opts.signed ? '+' : '') : '';
  const rounded = abs >= 1000 ? Math.round(abs) : (Math.round(abs * 100) / 100);
  const str = abs >= 1000 ? rounded.toLocaleString('en-ZA') : rounded.toFixed(2);
  return `${sign}R ${str}`;
}

function fmtMonthLabel(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function prevMonth(ym) {
  let [y, m] = ym.split('-').map(Number);
  m--; if (m < 1) { m = 12; y--; }
  return `${y}-${String(m).padStart(2,'0')}`;
}
function nextMonth(ym) {
  let [y, m] = ym.split('-').map(Number);
  m++; if (m > 12) { m = 1; y++; }
  return `${y}-${String(m).padStart(2,'0')}`;
}

function txnsInMonth(ym) {
  return state.transactions.filter(t => t.date.startsWith(ym));
}
function spendIn(ym, predicate) {
  return txnsInMonth(ym)
    .filter(t => t.amount < 0 && (!predicate || predicate(t)))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
}

function pendingTxns() {
  // For categorize view: ALL uncategorized debits (any month), most recent first
  return state.transactions
    .filter(t => t.categoryId == null && t.amount < 0)
    .filter(t => {
      if (state.filter === 'this-month') return t.date.startsWith(state.currentMonth);
      if (state.filter === 'last-month') return t.date.startsWith(prevMonth(state.currentMonth));
      return true;
    });
}

function totalPendingCount() {
  return state.transactions.filter(t => t.categoryId == null && t.amount < 0).length;
}

// -----------------------------------------------------------------------------
// Icons (inline SVG factory)
// -----------------------------------------------------------------------------
const icons = {
  pencil: () => `<svg viewBox="0 0 16 16" class="i"><path d="M2.5 13.5L3 11l7-7 2.5 2.5-7 7L3 14l-.5-.5z" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linejoin="round"/></svg>`,
  trash:  () => `<svg viewBox="0 0 16 16" class="i"><path d="M3 4h10M6.5 4V2.5h3V4M4 4l.5 9.5a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1L12 4M6.5 7v5M9.5 7v5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  check:  () => `<svg viewBox="0 0 16 16" class="i"><path d="M3 8.5L6.5 12L13 5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  grip:   () => `<svg viewBox="0 0 16 16" class="i"><circle cx="6" cy="4" r="1" fill="currentColor"/><circle cx="10" cy="4" r="1" fill="currentColor"/><circle cx="6" cy="8" r="1" fill="currentColor"/><circle cx="10" cy="8" r="1" fill="currentColor"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="10" cy="12" r="1" fill="currentColor"/></svg>`,
  trend:  (dir) => {
    if (dir > 0) return `↑`;
    if (dir < 0) return `↓`;
    return `·`;
  },
};

// -----------------------------------------------------------------------------
// Routing — hash-based
// -----------------------------------------------------------------------------
function currentRoute() {
  const h = (location.hash || '#/spend').replace(/^#\/?/, '');
  return h.split('/')[0] || 'spend';
}

function goto(route) {
  location.hash = '#/' + route;
}

function applyRoute() {
  const r = currentRoute();
  // toggle views
  $$('#view-spend, #view-categorize').forEach(v => {
    v.hidden = !v.id.endsWith(r);
  });
  // toggle nav active state
  $$('.nav-item[data-route]').forEach(a => {
    a.classList.toggle('is-active', a.dataset.route === r);
  });
  // render the active one
  if (r === 'spend') renderSpend();
  if (r === 'categorize') renderCategorize();
}

// -----------------------------------------------------------------------------
// Render — Sidebar
// -----------------------------------------------------------------------------
function renderSidebar() {
  const pending = totalPendingCount();
  const badge = $('#navPendingBadge');
  badge.textContent = pending;
  badge.dataset.empty = pending === 0 ? 'true' : 'false';
}

// -----------------------------------------------------------------------------
// Render — Spend view
// -----------------------------------------------------------------------------
function renderSpend() {
  const ym = state.currentMonth;
  const prevYm = prevMonth(ym);

  // Month label
  $('#monthLabel').textContent = fmtMonthLabel(ym);

  // Subtitle
  const today = new Date();
  const todayStr = `${today.toLocaleString('en-ZA', { weekday: 'long' })}, ${today.getDate()} ${MONTH_NAMES[today.getMonth()]}`;
  $('#spendSubtitle').textContent = `${fmtMonthLabel(ym)} so far · ${pendingTxns().length} txns still uncategorized`;

  // Hero
  const total = spendIn(ym);
  $('#heroTotal').textContent = fmtMoney(-total);
  $('#heroTotal').classList.remove('tabular');

  const prevTotal = spendIn(prevYm);
  const delta = total - prevTotal;
  const deltaEl = $('#heroDelta');
  deltaEl.className = 'hero-delta';
  if (prevTotal === 0) {
    deltaEl.classList.add('delta-flat');
    deltaEl.innerHTML = `<span class="delta-icon">·</span> No comparison yet for ${fmtMonthLabel(prevYm)}`;
  } else {
    const pct = Math.round(Math.abs(delta) / prevTotal * 100);
    const up = delta > 0;
    deltaEl.classList.add(up ? 'delta-up' : delta < 0 ? 'delta-down' : 'delta-flat');
    deltaEl.innerHTML = `
      <span class="delta-icon">${up ? '↑' : delta < 0 ? '↓' : '·'}</span>
      <span>${up ? '+' : delta < 0 ? '−' : ''}${fmtMoney(Math.abs(delta)).replace('R ', 'R ')} (${pct}%) vs. ${fmtMonthLabel(prevYm)}</span>
    `;
  }

  // Sparkline (last 6 months including current)
  renderSparkline(ym);

  // Stat strip
  renderStatStrip(ym, prevYm);

  // Category breakdown
  renderCategoryBars(ym, prevYm);

  // Biggest this month
  renderBiggest(ym);
}

function renderSparkline(ym) {
  const months = [];
  let cur = ym;
  for (let i = 0; i < 6; i++) {
    months.unshift(cur);
    cur = prevMonth(cur);
  }
  const totals = months.map(m => spendIn(m));
  const max = Math.max(1, ...totals);

  const svg = $('#spark');
  const w = 320, h = 80, pad = 6;
  const stepX = (w - pad * 2) / (totals.length - 1);
  const pts = totals.map((t, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - pad * 2) * (1 - t / max);
    return [x, y];
  });

  const lineD = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  const areaD = `${lineD} L ${pts[pts.length-1][0]},${h} L ${pts[0][0]},${h} Z`;

  // Gridlines: 0, 50%, 100%
  const grid = `
    <line class="grid" x1="${pad}" x2="${w - pad}" y1="${pad}"           y2="${pad}"/>
    <line class="grid" x1="${pad}" x2="${w - pad}" y1="${h / 2}"          y2="${h / 2}"/>
    <line class="grid" x1="${pad}" x2="${w - pad}" y1="${h - pad}"        y2="${h - pad}"/>
  `;

  const last = pts[pts.length - 1];
  svg.innerHTML = `
    ${grid}
    <path class="area" d="${areaD}"/>
    <path class="line" d="${lineD}"/>
    <circle class="dot-stroke" cx="${last[0]}" cy="${last[1]}" r="5"/>
    <circle class="dot" cx="${last[0]}" cy="${last[1]}" r="3.2"/>
  `;

  $('#chartAxisRange').textContent = `peak ${fmtMoney(max).replace('R ', 'R ')}`;
  $('#chartAxisLabels').innerHTML = months.map(m => {
    const [, mm] = m.split('-');
    const lbl = MONTH_NAMES[parseInt(mm, 10) - 1].toLowerCase();
    return `<span class="${m === ym ? 'is-current' : ''}">${lbl}</span>`;
  }).join('');
}

function renderStatStrip(ym, prevYm) {
  const txns = txnsInMonth(ym).filter(t => t.amount < 0);

  // Biggest single
  const biggest = txns.slice().sort((a, b) => a.amount - b.amount)[0];

  // Per-category totals
  const byCat = {};
  for (const t of txns) {
    if (!t.categoryId) continue;
    byCat[t.categoryId] = (byCat[t.categoryId] || 0) + Math.abs(t.amount);
  }
  const prevByCat = {};
  for (const t of txnsInMonth(prevYm)) {
    if (t.amount >= 0 || !t.categoryId) continue;
    prevByCat[t.categoryId] = (prevByCat[t.categoryId] || 0) + Math.abs(t.amount);
  }

  // Trending up: category with biggest % increase (min R200 in prev to avoid noise)
  let trendingId = null, trendingPct = -Infinity;
  for (const cat of state.categories) {
    const prev = prevByCat[cat.id] || 0;
    const curr = byCat[cat.id] || 0;
    if (prev < 200) continue;
    const pct = (curr - prev) / prev;
    if (pct > trendingPct) { trendingPct = pct; trendingId = cat.id; }
  }
  const trendingCat = trendingId ? state.categories.find(c => c.id === trendingId) : null;

  // Most txns: category by count
  const countByCat = {};
  for (const t of txns) {
    if (!t.categoryId) continue;
    countByCat[t.categoryId] = (countByCat[t.categoryId] || 0) + 1;
  }
  let mostId = null, mostCount = 0;
  for (const [id, c] of Object.entries(countByCat)) {
    if (c > mostCount) { mostCount = c; mostId = id; }
  }
  const mostCat = mostId ? state.categories.find(c => c.id === mostId) : null;

  // To categorize
  const pendingInMonth = txnsInMonth(ym).filter(t => t.categoryId == null && t.amount < 0).length;

  const stats = [
    biggest && {
      label: 'Biggest charge',
      value: fmtMoney(biggest.amount).replace('−', ''),
      sub: `${biggest.desc.slice(0, 24)} · ${shortDate(biggest.date)}`,
    },
    trendingCat && {
      label: 'Trending up',
      value: trendingCat.name,
      sub: `<span class="delta-up" style="color:var(--danger); font-weight:600">+${Math.round(trendingPct * 100)}%</span> vs ${fmtMonthLabel(prevYm)}`,
      dot: trendingCat.color,
    },
    mostCat && {
      label: 'Most transactions',
      value: mostCat.name,
      sub: `${mostCount} this month`,
      dot: mostCat.color,
    },
    {
      label: 'To categorize',
      value: String(pendingInMonth),
      sub: `<a class="stat-cta" href="#/categorize">Open inbox →</a>`,
      pending: true,
    },
  ].filter(Boolean);

  $('#statStrip').innerHTML = stats.map(s => `
    <article class="stat ${s.pending ? 'stat-pending' : ''}">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-sub">${s.dot ? `<span class="cat-pill-dot" style="background:${s.dot}; width:7px; height:7px; border-radius:999px"></span>` : ''}${s.sub}</div>
    </article>
  `).join('');
}

function shortDate(d) {
  const [, m, day] = d.split('-');
  return `${parseInt(day, 10)} ${MONTH_NAMES[parseInt(m, 10) - 1]}`;
}

function renderCategoryBars(ym, prevYm) {
  const byCat = {};
  for (const t of txnsInMonth(ym)) {
    if (t.amount >= 0 || !t.categoryId) continue;
    byCat[t.categoryId] = (byCat[t.categoryId] || 0) + Math.abs(t.amount);
  }
  const prevByCat = {};
  for (const t of txnsInMonth(prevYm)) {
    if (t.amount >= 0 || !t.categoryId) continue;
    prevByCat[t.categoryId] = (prevByCat[t.categoryId] || 0) + Math.abs(t.amount);
  }
  const rows = state.categories
    .map(c => ({ cat: c, curr: byCat[c.id] || 0, prev: prevByCat[c.id] || 0 }))
    .sort((a, b) => b.curr - a.curr);

  const max = Math.max(1, ...rows.map(r => r.curr));

  $('#catBars').innerHTML = rows.map(r => {
    const pct = r.curr / max;
    let deltaHtml = '<span class="muted">·</span>';
    if (r.prev > 0) {
      const dpct = Math.round((r.curr - r.prev) / r.prev * 100);
      const cls = dpct > 5 ? 'delta-up' : dpct < -5 ? 'delta-down' : 'delta-flat';
      const arrow = dpct > 5 ? '↑' : dpct < -5 ? '↓' : '·';
      deltaHtml = `<span class="${cls}" style="font-weight:500">${arrow}${Math.abs(dpct)}%</span>`;
    } else if (r.curr > 0) {
      deltaHtml = `<span class="delta-flat" style="font-weight:500">new</span>`;
    }
    return `
      <div class="bar-row" data-cat-id="${r.cat.id}">
        <span class="bar-dot" style="background:${r.cat.color}"></span>
        <span class="bar-name">${escapeHtml(r.cat.name)}</span>
        <span class="bar-track">
          <span class="bar-fill" style="background:${r.cat.color}; transform:scaleX(${pct.toFixed(3)})"></span>
        </span>
        <span class="bar-amount tabular">${fmtMoney(r.curr).replace('R ', 'R ')}</span>
        <span class="bar-delta">${deltaHtml}</span>
      </div>
    `;
  }).join('');
}

function renderBiggest(ym) {
  const top = txnsInMonth(ym)
    .filter(t => t.amount < 0)
    .sort((a, b) => a.amount - b.amount)
    .slice(0, 6);

  $('#biggestList').innerHTML = top.map(t => {
    const cat = t.categoryId ? state.categories.find(c => c.id === t.categoryId) : null;
    return `
      <li>
        <span class="tx-dot" style="background:${cat ? cat.color : 'var(--ink-4)'}"></span>
        <div style="min-width:0">
          <div class="tx-name">${escapeHtml(t.desc)}</div>
          <div class="tx-meta">${shortDate(t.date)}${cat ? ' · ' + escapeHtml(cat.name) : ' · uncategorized'}</div>
        </div>
        <span class="tx-amt tabular">${fmtMoney(t.amount).replace('−', '−')}</span>
      </li>
    `;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// -----------------------------------------------------------------------------
// Render — Categorize view
// -----------------------------------------------------------------------------
function renderCategorize() {
  const pending = pendingTxns();
  const all = state.transactions.filter(t => t.amount < 0);
  const totalDebits = all.length;

  $('#pendingCount').textContent = pending.length;
  $('#progressDone').textContent = state.sessionDone;
  $('#progressTotal').textContent = state.sessionDone + pending.length;
  const denom = state.sessionDone + pending.length;
  const pct = denom > 0 ? state.sessionDone / denom * 100 : 0;
  $('#progressFill').style.width = pct + '%';

  // Ensure focused id is still in the pending set; otherwise focus the first
  if (!pending.find(t => t.id === state.focusedId)) {
    state.focusedId = pending[0] ? pending[0].id : null;
  }

  // List
  const list = $('#txnList');
  if (pending.length === 0) {
    list.innerHTML = '';
    $('#txnEmpty').hidden = false;
    $('#assignRail').style.opacity = '0.4';
    $('#assignRail').style.pointerEvents = 'none';
  } else {
    $('#txnEmpty').hidden = true;
    $('#assignRail').style.opacity = '1';
    $('#assignRail').style.pointerEvents = 'auto';
    list.innerHTML = pending.map(t => {
      const focused = t.id === state.focusedId;
      return `
        <div class="row ${focused ? 'is-focused' : ''}" data-id="${t.id}" tabindex="0">
          <div class="c-date">${shortDate(t.date)}</div>
          <div class="c-desc">${escapeHtml(t.desc)}</div>
          <div class="c-amount amount-debit">${fmtMoney(t.amount)}</div>
          <div class="c-status">${focused ? `<span class="muted small">← assign below</span>` : `<span class="muted small">uncategorized</span>`}</div>
        </div>
      `;
    }).join('');
  }

  // Sidebar badge
  renderSidebar();

  // Rail
  renderRail();
}

function renderRail() {
  $('#railChips').innerHTML = state.categories.slice(0, 9).map((c, i) => `
    <button class="chip" data-cat-id="${c.id}" type="button">
      <span class="chip-num">${i + 1}</span>
      <span class="chip-dot" style="background:${c.color}"></span>
      <span>${escapeHtml(c.name)}</span>
    </button>
  `).join('');
}

// -----------------------------------------------------------------------------
// Render — Drawer (Categories)
// -----------------------------------------------------------------------------
let drawerOpen = false;

function openDrawer() {
  drawerOpen = true;
  $('#drawer').hidden = false;
  renderDrawer();
  // Focus the input later, after animation, if list is empty-ish
  setTimeout(() => $('#catNewInput').focus(), 200);
}

function closeDrawer() {
  drawerOpen = false;
  $('#drawer').hidden = true;
}

function renderDrawer() {
  $('#catCount').textContent = state.categories.length;
  $('#newCatIndex').textContent = state.categories.length + 1;

  // Per-category txn counts (all-time — gives a consistent meaning across months)
  const counts = {};
  for (const t of state.transactions) {
    if (!t.categoryId) continue;
    counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
  }

  $('#catList').innerHTML = state.categories.map((c, i) => `
    <li class="cat-row" data-cat-id="${c.id}" draggable="true">
      <span class="cat-grip" aria-hidden="true">⋮⋮</span>
      <span class="cat-num">${i + 1}</span>
      <span class="cat-dot" style="background:${c.color}"></span>
      <span class="cat-name" data-name>${escapeHtml(c.name)}</span>
      <span class="cat-count">${counts[c.id] || 0} txns</span>
      <button class="cat-action" data-action="edit" aria-label="Rename">${icons.pencil()}</button>
      <button class="cat-action del" data-action="delete" aria-label="Delete">${icons.trash()}</button>
    </li>
  `).join('');

  // Random "next" color preview
  const nextColor = `var(--${CAT_PALETTE[state.categories.length % CAT_PALETTE.length]})`;
  $('#newCatDot').style.background = nextColor;
}

// -----------------------------------------------------------------------------
// Toasts
// -----------------------------------------------------------------------------
function toast(msg, { undoLabel, onUndo, duration = 4000 } = {}) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${msg}</span>` + (undoLabel ? `<button class="undo" type="button">${undoLabel}</button>` : '');
  if (undoLabel) {
    el.querySelector('.undo').addEventListener('click', () => {
      onUndo && onUndo();
      el.remove();
    });
  }
  $('#toastStack').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 200ms'; setTimeout(() => el.remove(), 220); }, duration);
}

// -----------------------------------------------------------------------------
// Wire up — event handlers
// -----------------------------------------------------------------------------
function bind() {
  // Routing
  window.addEventListener('hashchange', applyRoute);

  // Month switcher
  $('#monthSeg').addEventListener('click', e => {
    const dir = e.target.closest('[data-month]')?.dataset.month;
    if (!dir) return;
    state.currentMonth = dir === 'prev' ? prevMonth(state.currentMonth) : nextMonth(state.currentMonth);
    renderSpend();
  });

  // Filter pills on Categorize
  $('#filterPills').addEventListener('click', e => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    state.filter = btn.dataset.filter;
    $$('#filterPills .pill').forEach(p => p.classList.toggle('pill-active', p === btn));
    renderCategorize();
  });

  // Sidebar categories button + global "C" key
  $('#openCategoriesBtn').addEventListener('click', openDrawer);

  // Bar row in spend → open categorize filtered? (just hint via cursor for now)
  $('#catBars').addEventListener('click', e => {
    const row = e.target.closest('[data-cat-id]');
    if (!row) return;
    // For now, jump to categorize (could be a category-specific filter later)
    // No-op — placeholder for future deep-dive.
  });

  // ── Categorize: row click → focus, click again → ignore.
  $('#txnList').addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    state.focusedId = row.dataset.id;
    renderCategorize();
  });

  // ── Categorize: chip click → assign
  $('#railChips').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat-id]');
    if (!btn || !state.focusedId) return;
    assignFocusedTo(btn.dataset.catId);
  });

  $('#skipBtn').addEventListener('click', () => skipFocused());
  $('#ignoreBtn').addEventListener('click', () => ignoreFocused());

  // ── Keyboard
  window.addEventListener('keydown', onKey);

  // ── Drawer
  $('#drawer').addEventListener('click', e => {
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
  });

  // Drawer: edit / delete / rename
  $('#catList').addEventListener('click', e => {
    const row = e.target.closest('.cat-row');
    if (!row) return;
    const id = row.dataset.catId;
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    if (btn.dataset.action === 'edit') startRename(row, id);
    if (btn.dataset.action === 'delete') confirmDelete(id);
  });

  // Add new category
  const newForm = $('#catNewForm');
  const newInput = $('#catNewInput');
  const newSubmit = $('#catNewSubmit');
  newInput.addEventListener('input', () => {
    newSubmit.disabled = !newInput.value.trim();
  });
  newForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name = newInput.value.trim();
    if (!name) return;
    await api.addCategory(name);
    newInput.value = '';
    newSubmit.disabled = true;
    renderDrawer();
    renderRail();
    renderSidebar();
    toast(`Added "${name}"`);
  });

  // ── Drag-reorder categories (simple HTML5 DnD)
  bindCategoryDrag();

  // ── Upload modal
  $('#uploadBtn').addEventListener('click', () => { $('#uploadModal').hidden = false; });
  $('#uploadModal').addEventListener('click', e => {
    if (e.target.closest('[data-modal-close]')) $('#uploadModal').hidden = true;
  });
  const fileInput = $('#fileInput');
  const dropZone = $('#dropZone');
  const uploadConfirm = $('#uploadConfirm');
  const bankSelect = $('#bankSelect');
  const checkReady = () => { uploadConfirm.disabled = !(bankSelect.value && fileInput.files[0]); };
  bankSelect.addEventListener('change', checkReady);
  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (f) $('#dropZone .drop-text').innerHTML = `<strong>${escapeHtml(f.name)}</strong><span class="muted">${(f.size/1024).toFixed(1)} KB</span>`;
    checkReady();
  });
  ['dragenter','dragover'].forEach(evt => dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add('is-drag'); }));
  ['dragleave','drop'].forEach(evt => dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove('is-drag'); }));
  dropZone.addEventListener('drop', e => {
    if (e.dataTransfer.files[0]) {
      const dt = new DataTransfer();
      dt.items.add(e.dataTransfer.files[0]);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });
  uploadConfirm.addEventListener('click', () => {
    // Stub — wire up to your /write endpoint
    toast(`Uploaded ${fileInput.files[0].name} (mock)`);
    $('#uploadModal').hidden = true;
    bankSelect.value = ''; fileInput.value = '';
    $('#dropZone .drop-text').innerHTML = `<strong>Drop a CSV here</strong><span class="muted">or click to choose a file</span>`;
    uploadConfirm.disabled = true;
  });
}

// -----------------------------------------------------------------------------
// Categorize actions
// -----------------------------------------------------------------------------
async function assignFocusedTo(catId) {
  if (!state.focusedId) return;
  const txn = state.transactions.find(t => t.id === state.focusedId);
  if (!txn) return;
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;

  // Move focus to next pending before mutating
  const pending = pendingTxns();
  const idx = pending.findIndex(t => t.id === state.focusedId);
  const next = pending[idx + 1] || pending[idx - 1] || null;

  await api.categorize(txn.id, cat.id);
  state.focusedId = next ? next.id : null;

  renderCategorize();
  // Spend stats can change too if user toggles back — no need to re-render Spend now.
  toast(`Assigned to ${cat.name}`, {
    undoLabel: 'Undo',
    onUndo: () => undoLast(),
  });
}

function undoLast() {
  const last = state.undo.pop();
  if (!last) return;
  const t = state.transactions.find(x => x.id === last.txnId);
  if (!t) return;
  if (last.prev == null && t.categoryId != null) state.sessionDone = Math.max(0, state.sessionDone - 1);
  t.categoryId = last.prev;
  state.focusedId = t.id;
  renderCategorize();
}

function skipFocused() {
  const pending = pendingTxns();
  const idx = pending.findIndex(t => t.id === state.focusedId);
  const next = pending[idx + 1] || pending[0];
  if (next) {
    state.focusedId = next.id;
    renderCategorize();
  }
}

function ignoreFocused() {
  // For now, "ignore" assigns to the "Other" category if present, else last category.
  // Real impl could set a hidden flag on the txn.
  const other = state.categories.find(c => c.name.toLowerCase() === 'other') || state.categories[state.categories.length - 1];
  if (other) assignFocusedTo(other.id);
}

function moveFocus(dir) {
  const pending = pendingTxns();
  if (pending.length === 0) return;
  const idx = pending.findIndex(t => t.id === state.focusedId);
  let next = idx + dir;
  if (next < 0) next = 0;
  if (next >= pending.length) next = pending.length - 1;
  state.focusedId = pending[next].id;
  renderCategorize();
  // Scroll into view
  const row = $(`.row[data-id="${state.focusedId}"]`);
  if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// -----------------------------------------------------------------------------
// Drawer: rename + delete
// -----------------------------------------------------------------------------
function startRename(row, id) {
  const nameSpan = row.querySelector('[data-name]');
  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cat-name-edit';
  input.value = cat.name;
  nameSpan.replaceWith(input);
  input.focus();
  input.select();
  const commit = async () => {
    const newName = input.value.trim();
    if (newName && newName !== cat.name) {
      await api.renameCategory(id, newName);
      toast(`Renamed to "${newName}"`);
    }
    renderDrawer();
    renderRail();
  };
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { renderDrawer(); }
  });
  input.addEventListener('blur', commit);
}

async function confirmDelete(id) {
  const cat = state.categories.find(c => c.id === id);
  if (!cat) return;
  const count = state.transactions.filter(t => t.categoryId === id).length;
  const msg = count > 0
    ? `Delete "${cat.name}"? ${count} transaction${count === 1 ? '' : 's'} will be uncategorized.`
    : `Delete "${cat.name}"?`;
  if (!confirm(msg)) return;
  await api.deleteCategory(id);
  renderDrawer();
  renderRail();
  renderSidebar();
  if (currentRoute() === 'categorize') renderCategorize();
  if (currentRoute() === 'spend') renderSpend();
  toast(`Deleted "${cat.name}"`);
}

// -----------------------------------------------------------------------------
// Drag-reorder categories
// -----------------------------------------------------------------------------
function bindCategoryDrag() {
  const list = $('#catList');
  let dragId = null;
  list.addEventListener('dragstart', e => {
    const row = e.target.closest('.cat-row');
    if (!row) return;
    dragId = row.dataset.catId;
    row.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragend', e => {
    const row = e.target.closest('.cat-row');
    if (row) row.style.opacity = '';
    dragId = null;
  });
  list.addEventListener('dragover', e => {
    if (!dragId) return;
    e.preventDefault();
    const row = e.target.closest('.cat-row');
    if (!row || row.dataset.catId === dragId) return;
    const rect = row.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    const draggingEl = list.querySelector(`[data-cat-id="${dragId}"]`);
    if (after) row.after(draggingEl); else row.before(draggingEl);
  });
  list.addEventListener('drop', async e => {
    if (!dragId) return;
    e.preventDefault();
    // Read new order from DOM
    const order = [...list.querySelectorAll('.cat-row')].map(r => r.dataset.catId);
    state.categories.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    renderDrawer();
    renderRail();
  });
}

// -----------------------------------------------------------------------------
// Keyboard
// -----------------------------------------------------------------------------
function onKey(e) {
  // Skip when typing in inputs
  const target = e.target;
  const isTyping = target.matches('input, textarea, select, [contenteditable="true"]');

  // Escape: close drawer/modal first
  if (e.key === 'Escape') {
    if (!$('#uploadModal').hidden) { $('#uploadModal').hidden = true; e.preventDefault(); return; }
    if (drawerOpen) { closeDrawer(); e.preventDefault(); return; }
    return;
  }

  // ⌘Z / Ctrl-Z: undo
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
    if (isTyping) return;
    e.preventDefault();
    undoLast();
    return;
  }

  if (isTyping) return;

  // Global: 'c' opens drawer
  if (e.key === 'c' || e.key === 'C') {
    e.preventDefault();
    drawerOpen ? closeDrawer() : openDrawer();
    return;
  }

  // Categorize-only shortcuts
  if (currentRoute() !== 'categorize') return;
  if (drawerOpen) return; // drawer "n" etc shouldn't fire categorize keys

  if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); moveFocus(1); return; }
  if (e.key === 'k' || e.key === 'ArrowUp')   { e.preventDefault(); moveFocus(-1); return; }
  if (e.key === 's') { e.preventDefault(); skipFocused(); return; }
  if (e.key === 'x') { e.preventDefault(); ignoreFocused(); return; }

  // Number keys 1-9 → assign to that category
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= 9) {
    const cat = state.categories[n - 1];
    if (cat) { e.preventDefault(); assignFocusedTo(cat.id); }
  }
}

// -----------------------------------------------------------------------------
// Init
// -----------------------------------------------------------------------------
function init() {
  seed();
  if (!location.hash) location.hash = '#/spend';
  applyRoute();
  renderSidebar();
  renderRail();
  bind();
}

init();
