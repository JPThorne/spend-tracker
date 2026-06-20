// =============================================================================
// Spend — application logic
// =============================================================================
// Single-file vanilla JS. No build step. Hash-routed views, keyboard control,
// drawer + modal. Data loaded from /api on init; all mutations persisted.
// =============================================================================

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const state = {
  /** @type {Category[]} */ categories: [],
  /** @type {Txn[]}      */ transactions: [],
  currentMonth: '',
  filter: 'all',
  /** focused row id on the Categorize page */
  focusedId: null,
  /** undo stack for category assignments */
  undo: [],
  /** count of categorizations made this session (for the progress bar) */
  sessionDone: 0,
  /** current build version (set in init() from /api/info) */
  version: null,
  /** latest known version, or null if no update check has resolved one */
  latestVersion: null,
  /** version string the user has dismissed the update notice for */
  updateDismissed: localStorage.getItem('spend.updateDismissed'),
  /** Categorize list sort */
  sort: { key: 'date', dir: 'desc' },
  /** multi-select on the Categorize list */
  selectedIds: new Set(),
  /** last plainly-clicked row id, anchor for shift-click range selection */
  selectionAnchor: null,
  /** whether the "all categories" assign panel is open */
  assignPanelOpen: false,
};

// Color palette for categories (cycled by index)
const CAT_PALETTE = ['cat-1','cat-2','cat-3','cat-4','cat-5','cat-6','cat-7','cat-8'];

// -----------------------------------------------------------------------------
// Data helpers
// -----------------------------------------------------------------------------

function mapTxn(t) {
  return {
    id: t.id,
    date: t.transactionDate.substring(0, 10),
    desc: t.description,
    // negative = debit/expense; positive = credit/income
    amount: t.credit != null ? t.credit : -(t.debit ?? 0),
    categoryId: t.categoryId ?? null,
  };
}

function sixMonthsAgoDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().substring(0, 10);
}

// -----------------------------------------------------------------------------
// "API" — real fetch calls to the backend
// -----------------------------------------------------------------------------
const api = {
  async categorize(txnId, categoryId) {
    const txn = state.transactions.find(t => t.id === txnId);
    if (!txn) return;
    const prev = txn.categoryId;
    state.undo.push({ txnId, prev });
    if (state.undo.length > 50) state.undo.shift();

    await fetch(`/api/transactions/${txnId}/category`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId }),
    });

    txn.categoryId = categoryId;
    if (prev == null && categoryId != null) state.sessionDone++;
  },

  async uncategorize(txnId) {
    const txn = state.transactions.find(t => t.id === txnId);
    if (!txn) return;
    const prev = txn.categoryId;
    state.undo.push({ txnId, prev });
    if (state.undo.length > 50) state.undo.shift();

    await fetch(`/api/transactions/${txnId}/category`, { method: 'DELETE' });

    txn.categoryId = null;
  },

  async addCategory(name) {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: null }),
    });
    const dto = await res.json();
    const color = `var(--${CAT_PALETTE[state.categories.length % CAT_PALETTE.length]})`;
    const cat = { id: dto.id, name: dto.name, color };
    state.categories.push(cat);
    return cat;
  },

  async renameCategory(id, name) {
    await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description: null }),
    });
    const cat = state.categories.find(c => c.id === id);
    if (cat) cat.name = name;
  },

  async deleteCategory(id, deleteTransactions = false) {
    await fetch(`/api/categories/${id}?deleteTransactions=${deleteTransactions}`, { method: 'DELETE' });
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx >= 0) state.categories.splice(idx, 1);
    if (deleteTransactions) {
      state.transactions = state.transactions.filter(t => t.categoryId !== id);
    } else {
      state.transactions.forEach(t => { if (t.categoryId === id) t.categoryId = null; });
    }
  },

  async categorizeBulk(txnIds, categoryId) {
    const entries = txnIds.map(id => {
      const txn = state.transactions.find(t => t.id === id);
      return txn ? { txnId: id, prev: txn.categoryId } : null;
    }).filter(Boolean);
    if (entries.length === 0) return;
    state.undo.push(entries);
    if (state.undo.length > 50) state.undo.shift();

    await fetch('/api/transactions/bulk-categorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionIds: entries.map(e => e.txnId), categoryId }),
    });

    for (const { txnId, prev } of entries) {
      const txn = state.transactions.find(t => t.id === txnId);
      if (!txn) continue;
      txn.categoryId = categoryId;
      if (prev == null) state.sessionDone++;
    }
  },

  async checkLatestVersion() {
    // TODO: point at a real source (e.g. a GitHub releases manifest or a /version endpoint)
    return '0.5';
  },
};

// Tiny semver-ish comparator: returns true if `a` is newer than `b`.
function isNewer(a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] || 0, db = pb[i] || 0;
    if (da !== db) return da > db;
  }
  return false;
}

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

function sortedPending() {
  const { key, dir } = state.sort;
  const mul = dir === 'asc' ? 1 : -1;
  return pendingTxns().slice().sort((a, b) => {
    if (key === 'date') return mul * a.date.localeCompare(b.date);
    if (key === 'desc') return mul * a.desc.localeCompare(b.desc);
    if (key === 'amount') return mul * (a.amount - b.amount);
    return 0;
  });
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
    if (c > mostCount) { mostCount = c; mostId = Number(id); }
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
  const pending = sortedPending();

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
      const selected = state.selectedIds.size > 1 && state.selectedIds.has(t.id);
      const cls = ['row', focused ? 'is-focused' : '', selected ? 'is-selected' : ''].filter(Boolean).join(' ');
      return `
        <div class="${cls}" data-id="${t.id}" tabindex="0">
          <div class="c-date">${shortDate(t.date)}</div>
          <div class="c-desc">${escapeHtml(t.desc)}</div>
          <div class="c-amount amount-debit">${fmtMoney(t.amount)}</div>
          <div class="c-status">${focused ? `<span class="muted small">← assign below</span>` : `<span class="muted small">uncategorized</span>`}</div>
        </div>
      `;
    }).join('');
  }

  // Selection toolbar
  $('#selectionToolbar').hidden = state.selectedIds.size <= 1;
  $('#selectionCount').textContent = state.selectedIds.size;

  // Sidebar badge
  renderSidebar();

  // Rail
  renderRail();

  // Sort header glyphs
  $$('#txnTableHead [data-sort-key]').forEach(th => {
    th.classList.toggle('is-sorted', th.dataset.sortKey === state.sort.key);
  });
  $$('#txnTableHead [data-sort-glyph]').forEach(g => {
    g.textContent = g.dataset.sortGlyph === state.sort.key ? (state.sort.dir === 'asc' ? '↑' : '↓') : '';
  });
}

function renderVersion() {
  $('#appVersionText').textContent = state.version ? `v${state.version}` : '';
  const hasUpdate = state.latestVersion
    && isNewer(state.latestVersion, state.version)
    && state.updateDismissed !== state.latestVersion;
  $('#versionDot').hidden = !hasUpdate;
  $('#appVersion').classList.toggle('has-update', hasUpdate);
  if (!hasUpdate) closeVersionPopover();
}

let versionPopoverOpen = false;

function openVersionPopover() {
  if (!$('#appVersion').classList.contains('has-update')) return;
  versionPopoverOpen = true;
  $('#versionPopoverTitle').textContent = `v${state.latestVersion} available`;
  $('#versionPopoverSub').textContent = `you're on v${state.version}`;
  $('#versionPopover').hidden = false;
}

function closeVersionPopover() {
  versionPopoverOpen = false;
  $('#versionPopover').hidden = true;
}

function dismissUpdate() {
  state.updateDismissed = state.latestVersion;
  localStorage.setItem('spend.updateDismissed', state.latestVersion);
  closeVersionPopover();
  renderVersion();
}

function renderRail() {
  $('#railChips').innerHTML = state.categories.slice(0, 9).map((c, i) => `
    <button class="chip" data-cat-id="${c.id}" type="button">
      <span class="chip-num">${i + 1}</span>
      <span class="chip-dot" style="background:${c.color}"></span>
      <span>${escapeHtml(c.name)}</span>
    </button>
  `).join('');

  const extra = state.categories.length - 9;
  $('#assignMoreBtn').textContent = extra > 0 ? `+${extra} more →` : 'All categories →';
}

// -----------------------------------------------------------------------------
// Render — Assign panel (all categories, assignment-only)
// -----------------------------------------------------------------------------
function openAssignPanel() {
  state.assignPanelOpen = true;
  $('#assignPanel').hidden = false;
  renderAssignPanel();
}

function closeAssignPanel() {
  state.assignPanelOpen = false;
  $('#assignPanel').hidden = true;
}

function renderAssignPanel() {
  const selCount = state.selectedIds.size;
  $('#assignPanelSub').textContent = selCount > 1
    ? `Assign ${selCount} selected transactions`
    : 'Click to assign the focused transaction';

  $('#assignPanelList').innerHTML = state.categories.map((c, i) => `
    <li class="assign-row" data-cat-id="${c.id}">
      <span class="cat-num">${i < 9 ? i + 1 : ''}</span>
      <span class="cat-dot" style="background:${c.color}"></span>
      <span class="cat-name">${escapeHtml(c.name)}</span>
    </li>
  `).join('');
}

// -----------------------------------------------------------------------------
// Category transactions modal (view + remove individual transactions)
// -----------------------------------------------------------------------------
let categoryTxnsOpenId = null;

function openCategoryTxnsModal(categoryId) {
  categoryTxnsOpenId = categoryId;
  $('#categoryTxnsModal').hidden = false;
  renderCategoryTxnsModal();
}

function closeCategoryTxnsModal() {
  categoryTxnsOpenId = null;
  $('#categoryTxnsModal').hidden = true;
}

function renderCategoryTxnsModal() {
  const cat = state.categories.find(c => c.id === categoryTxnsOpenId);
  if (!cat) return;

  const txns = state.transactions
    .filter(t => t.categoryId === cat.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = txns.reduce((sum, t) => sum + Math.abs(t.amount), 0);

  $('#categoryTxnsTitle').textContent = cat.name;
  $('#categoryTxnsSub').textContent = txns.length === 0
    ? 'No transactions'
    : `${txns.length} transaction${txns.length === 1 ? '' : 's'} · ${fmtMoney(total)}`;

  $('#categoryTxnsList').innerHTML = txns.length === 0
    ? `<li class="picker-empty">No transactions in this category</li>`
    : txns.map(t => `
        <li class="cat-txn-row" data-id="${t.id}">
          <span class="tx-dot" style="background:${cat.color}"></span>
          <div style="min-width:0">
            <div class="tx-name">${escapeHtml(t.desc)}</div>
            <div class="tx-meta">${shortDate(t.date)}</div>
          </div>
          <span class="tx-amt tabular">${fmtMoney(t.amount)}</span>
          <button class="cat-action del" data-action="remove" aria-label="Remove from category">${icons.trash()}</button>
        </li>
      `).join('');
}

async function removeFromCategory(txnId) {
  const cat = state.categories.find(c => c.id === categoryTxnsOpenId);
  await api.uncategorize(txnId);
  renderCategoryTxnsModal();
  renderDrawer();
  if (currentRoute() === 'spend') renderSpend();
  toast(`Removed from "${cat ? cat.name : 'category'}"`, {
    undoLabel: 'Undo',
    onUndo: async () => {
      await undoLast();
      renderCategoryTxnsModal();
      renderDrawer();
      if (currentRoute() === 'spend') renderSpend();
    },
  });
}

// -----------------------------------------------------------------------------
// Render — Drawer (Categories)
// -----------------------------------------------------------------------------
let drawerOpen = false;

function openDrawer() {
  drawerOpen = true;
  $('#drawer').hidden = false;
  renderDrawer();
  // Focus the input later, after animation
  setTimeout(() => $('#catNewInput').focus(), 200);
}

function closeDrawer() {
  drawerOpen = false;
  $('#drawer').hidden = true;
}

function renderDrawer() {
  $('#catCount').textContent = state.categories.length;
  $('#newCatIndex').textContent = state.categories.length + 1;

  // Per-category txn counts (all-time)
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

  // Next color preview
  const nextColor = `var(--${CAT_PALETTE[state.categories.length % CAT_PALETTE.length]})`;
  $('#newCatDot').style.background = nextColor;
}

// -----------------------------------------------------------------------------
// Confirm dialog (generic, promise-based)
// -----------------------------------------------------------------------------
let confirmResolve = null;

// `choices`, if given, renders a radio group in the dialog body and the resolved
// value is the selected choice's `value` (or `false` if cancelled) instead of a boolean.
function openConfirm({ title, body, danger = false, okLabel, choices = null } = {}) {
  $('#confirmTitle').textContent = title || 'Are you sure?';
  $('#confirmBody').textContent = body || '';

  const okBtn = $('#confirmOkBtn');
  const choicesEl = $('#confirmChoices');
  let selected = choices ? (choices.find(c => c.default) || choices[0]).value : null;

  const applyOkStyle = () => {
    const isDanger = choices ? !!choices.find(c => c.value === selected)?.danger : danger;
    okBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';
    okBtn.textContent = okLabel || (isDanger ? 'Delete' : 'Confirm');
  };

  if (choices) {
    choicesEl.hidden = false;
    choicesEl.innerHTML = choices.map(c => `
      <label class="confirm-choice ${c.danger ? 'is-danger' : ''}">
        <input type="radio" name="confirmChoice" value="${c.value}" ${c.value === selected ? 'checked' : ''}>
        <span>
          <span class="confirm-choice-label">${escapeHtml(c.label)}</span>
          ${c.hint ? `<span class="confirm-choice-hint">${escapeHtml(c.hint)}</span>` : ''}
        </span>
      </label>
    `).join('');
    choicesEl.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', () => { selected = input.value; applyOkStyle(); });
    });
  } else {
    choicesEl.hidden = true;
    choicesEl.innerHTML = '';
  }

  applyOkStyle();
  $('#confirmDialog').hidden = false;
  $('#confirmCancelBtn').focus();
  return new Promise(resolve => {
    confirmResolve = confirmed => resolve(confirmed ? (choices ? selected : true) : false);
  });
}

function closeConfirm(result) {
  $('#confirmDialog').hidden = true;
  if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
}

// -----------------------------------------------------------------------------
// Upload result modal
// -----------------------------------------------------------------------------
function showUploadResult(result) {
  const parts = [`Imported ${result.successfulImports} transaction${result.successfulImports === 1 ? '' : 's'}`];
  if (result.duplicatesSkipped > 0) {
    parts.push(`skipped ${result.duplicatesSkipped} duplicate${result.duplicatesSkipped === 1 ? '' : 's'} already in your account`);
  }
  $('#uploadResultSummary').textContent = parts.join(' — ') + '.';

  const list = $('#uploadResultDuplicates');
  if (result.duplicateWarnings && result.duplicateWarnings.length > 0) {
    list.hidden = false;
    list.innerHTML = result.duplicateWarnings.map(w => `<li>${escapeHtml(w)}</li>`).join('');
  } else {
    list.hidden = true;
    list.innerHTML = '';
  }

  $('#uploadResultModal').hidden = false;
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

  // Bar row in spend — opens the category's transactions
  $('#catBars').addEventListener('click', e => {
    const row = e.target.closest('[data-cat-id]');
    if (!row) return;
    openCategoryTxnsModal(Number(row.dataset.catId));
  });

  // ── Category transactions modal
  $('#categoryTxnsModal').addEventListener('click', e => {
    if (e.target.closest('[data-cat-txns-close]')) { closeCategoryTxnsModal(); return; }
    const btn = e.target.closest('[data-action="remove"]');
    if (btn) {
      const row = e.target.closest('[data-id]');
      removeFromCategory(Number(row.dataset.id));
    }
  });

  // ── Categorize: row click → focus / select
  $('#txnList').addEventListener('click', e => {
    const row = e.target.closest('[data-id]');
    if (!row) return;
    const id = Number(row.dataset.id);
    const pending = sortedPending();

    if (e.shiftKey && state.selectionAnchor != null) {
      const ids = pending.map(t => t.id);
      const from = ids.indexOf(state.selectionAnchor);
      const to = ids.indexOf(id);
      if (from >= 0 && to >= 0) {
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        state.selectedIds = new Set(ids.slice(lo, hi + 1));
      }
      state.focusedId = id;
    } else if (e.metaKey || e.ctrlKey) {
      if (state.selectedIds.has(id)) state.selectedIds.delete(id);
      else state.selectedIds.add(id);
      state.focusedId = id;
      state.selectionAnchor = id;
    } else {
      state.selectedIds = new Set([id]);
      state.selectionAnchor = id;
      state.focusedId = id;
    }
    renderCategorize();
  });

  // ── Selection toolbar
  $('#selectionClearBtn').addEventListener('click', () => { clearSelection(); renderCategorize(); });

  // ── Categorize: header click → sort
  $('#txnTableHead').addEventListener('click', e => {
    const th = e.target.closest('[data-sort-key]');
    if (!th) return;
    const key = th.dataset.sortKey;
    if (state.sort.key === key) {
      state.sort.dir = state.sort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sort = { key, dir: key === 'date' ? 'desc' : 'asc' };
    }
    renderCategorize();
  });

  // ── Categorize: chip click → assign
  $('#railChips').addEventListener('click', e => {
    const btn = e.target.closest('[data-cat-id]');
    if (!btn || !state.focusedId) return;
    assignFocusedTo(Number(btn.dataset.catId));
  });

  $('#skipBtn').addEventListener('click', () => skipFocused());
  $('#ignoreBtn').addEventListener('click', () => ignoreFocused());

  // ── Assign panel
  $('#assignMoreBtn').addEventListener('click', openAssignPanel);
  $('#assignPanel').addEventListener('click', e => {
    if (e.target.closest('[data-assign-panel-close]')) { closeAssignPanel(); return; }
    const row = e.target.closest('[data-cat-id]');
    if (row) { assignFocusedTo(Number(row.dataset.catId)); closeAssignPanel(); }
  });

  // ── Assign picker
  $('#assignPicker').addEventListener('click', e => {
    if (e.target.closest('[data-picker-close]')) { closeAssignPicker(); return; }
    if (e.target.closest('[data-create-cat]')) { pickerCreateAndAssign($('#pickerInput').value.trim()); return; }
    const item = e.target.closest('[data-cat-id]');
    if (item) { assignFocusedTo(Number(item.dataset.catId)); closeAssignPicker(); }
  });
  $('#pickerInput').addEventListener('input', e => renderPickerList(e.target.value));
  $('#pickerInput').addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); pickerIndex = Math.min(pickerItems.length - 1, pickerIndex + 1); renderPickerList($('#pickerInput').value); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pickerIndex = Math.max(0, pickerIndex - 1); renderPickerList($('#pickerInput').value); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const query = $('#pickerInput').value.trim();
      if (pickerItems.length === 0 && query) pickerCreateAndAssign(query);
      else pickerAssignActive();
    }
  });

  // ── Confirm dialog
  $('#confirmDialog').addEventListener('click', e => {
    if (e.target.closest('[data-confirm-cancel]')) closeConfirm(false);
  });
  $('#confirmOkBtn').addEventListener('click', () => closeConfirm(true));

  // ── Upload result modal
  $('#uploadResultModal').addEventListener('click', e => {
    if (e.target.closest('[data-result-close]')) $('#uploadResultModal').hidden = true;
  });

  // ── Version popover
  $('#appVersion').addEventListener('click', () => {
    versionPopoverOpen ? closeVersionPopover() : openVersionPopover();
  });
  $('#versionDismissBtn').addEventListener('click', e => { e.stopPropagation(); dismissUpdate(); });
  document.addEventListener('click', e => {
    if (!versionPopoverOpen) return;
    if (e.target.closest('#versionPopover') || e.target.closest('#appVersion')) return;
    closeVersionPopover();
  });

  // ── Keyboard
  window.addEventListener('keydown', onKey);

  // ── Drawer
  $('#drawer').addEventListener('click', e => {
    if (e.target.closest('[data-drawer-close]')) closeDrawer();
  });

  // Drawer: edit / delete / rename / view transactions
  $('#catList').addEventListener('click', e => {
    const row = e.target.closest('.cat-row');
    if (!row) return;
    const id = Number(row.dataset.catId);
    const btn = e.target.closest('[data-action]');
    if (btn) {
      if (btn.dataset.action === 'edit') startRename(row, id);
      if (btn.dataset.action === 'delete') confirmDelete(id);
      return;
    }
    if (e.target.closest('.cat-grip') || e.target.closest('.cat-name-edit')) return;
    openCategoryTxnsModal(id);
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
  uploadConfirm.addEventListener('click', async () => {
    const file = fileInput.files[0];
    const bank = bankSelect.value;
    uploadConfirm.disabled = true;
    uploadConfirm.textContent = 'Uploading…';

    try {
      const form = new FormData();
      form.append('file', file);
      form.append('bankType', bank);
      const res = await fetch('/api/transactions/upload', { method: 'POST', body: form });
      const result = await res.json();

      // Reload transactions to include newly imported ones
      const txnDtos = await fetch(`/api/transactions?startDate=${sixMonthsAgoDate()}`).then(r => r.json());
      state.transactions = txnDtos.map(mapTxn);
      state.sessionDone = 0;
      state.filter = 'all';
      $$('#filterPills .pill').forEach(p => p.classList.toggle('pill-active', p.dataset.filter === 'all'));
      const firstUncat = state.transactions.find(t => t.categoryId == null && t.amount < 0);
      state.focusedId = firstUncat ? firstUncat.id : null;

      $('#uploadModal').hidden = true;
      bankSelect.value = ''; fileInput.value = '';
      $('#dropZone .drop-text').innerHTML = `<strong>Drop a CSV here</strong><span class="muted">or click to choose a file</span>`;
      uploadConfirm.textContent = 'Upload';
      uploadConfirm.disabled = true;

      goto('categorize');
      renderSpend();
      renderCategorize();
      renderSidebar();
      showUploadResult(result);
    } catch {
      uploadConfirm.textContent = 'Upload';
      uploadConfirm.disabled = false;
      toast('Upload failed — please try again');
    }
  });
}

// -----------------------------------------------------------------------------
// Categorize actions
// -----------------------------------------------------------------------------
async function assignFocusedTo(catId) {
  if (state.selectedIds.size > 1) return assignSelectionTo(catId);

  if (!state.focusedId) return;
  const txn = state.transactions.find(t => t.id === state.focusedId);
  if (!txn) return;
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;

  // Move focus to next pending before mutating
  const pending = sortedPending();
  const idx = pending.findIndex(t => t.id === state.focusedId);
  const next = pending[idx + 1] || pending[idx - 1] || null;

  await api.categorize(txn.id, cat.id);
  state.focusedId = next ? next.id : null;

  renderCategorize();
  toast(`Assigned to ${cat.name}`, {
    undoLabel: 'Undo',
    onUndo: () => undoLast(),
  });
}

async function assignSelectionTo(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;
  const ids = [...state.selectedIds];
  if (ids.length === 0) return;

  const pending = sortedPending();
  const lastIdx = Math.max(...ids.map(id => pending.findIndex(t => t.id === id)));
  const next = pending.slice(lastIdx + 1).find(t => !state.selectedIds.has(t.id));

  await api.categorizeBulk(ids, cat.id);
  clearSelection();
  state.focusedId = next ? next.id : null;

  renderCategorize();
  toast(`Assigned ${ids.length} to ${cat.name}`, {
    undoLabel: 'Undo',
    onUndo: () => undoLast(),
  });
}

function clearSelection() {
  state.selectedIds.clear();
  state.selectionAnchor = null;
}

async function revertOne(entry) {
  const t = state.transactions.find(x => x.id === entry.txnId);
  if (!t) return;

  if (entry.prev === null) {
    await fetch(`/api/transactions/${entry.txnId}/category`, { method: 'DELETE' });
  } else {
    await fetch(`/api/transactions/${entry.txnId}/category`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId: entry.prev }),
    });
  }

  if (entry.prev == null && t.categoryId != null) state.sessionDone = Math.max(0, state.sessionDone - 1);
  t.categoryId = entry.prev;
  return t.id;
}

async function undoLast() {
  const last = state.undo.pop();
  if (!last) return;

  if (Array.isArray(last)) {
    let firstId = null;
    for (const entry of last) {
      const id = await revertOne(entry);
      if (firstId == null) firstId = id;
    }
    if (firstId != null) state.focusedId = firstId;
  } else {
    const id = await revertOne(last);
    if (id != null) state.focusedId = id;
  }
  renderCategorize();
}

function skipFocused() {
  const pending = sortedPending();
  const idx = pending.findIndex(t => t.id === state.focusedId);
  const next = pending[idx + 1] || pending[0];
  if (next) {
    state.focusedId = next.id;
    renderCategorize();
  }
}

function ignoreFocused() {
  // "ignore" assigns to Miscellaneous if present, else last category
  const ignore = state.categories.find(c => /misc|other/i.test(c.name)) || state.categories[state.categories.length - 1];
  if (ignore) assignFocusedTo(ignore.id);
}

function moveFocus(dir) {
  const pending = sortedPending();
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
// Assign picker (type-to-search, triggered by "/")
// -----------------------------------------------------------------------------
let pickerOpen = false;
let pickerIndex = 0;
let pickerItems = [];

function openAssignPicker() {
  pickerOpen = true;
  pickerIndex = 0;
  $('#assignPicker').hidden = false;
  $('#pickerInput').value = '';
  renderPickerList('');
  setTimeout(() => $('#pickerInput').focus(), 0);
}

function closeAssignPicker() {
  pickerOpen = false;
  $('#assignPicker').hidden = true;
}

function renderPickerList(query) {
  const q = query.trim().toLowerCase();
  pickerItems = state.categories.filter(c => c.name.toLowerCase().includes(q));
  if (pickerIndex >= pickerItems.length) pickerIndex = Math.max(0, pickerItems.length - 1);

  $('#pickerList').innerHTML = pickerItems.length === 0
    ? (q
        ? `<li class="picker-empty picker-create" data-create-cat>No matching categories — press <kbd>Enter</kbd> to create "${escapeHtml(query.trim())}"</li>`
        : `<li class="picker-empty">No categories yet</li>`)
    : pickerItems.map((c, i) => `
        <li class="picker-item ${i === pickerIndex ? 'is-active' : ''}" data-cat-id="${c.id}">
          <span class="cat-dot" style="background:${c.color}"></span>
          <span>${escapeHtml(c.name)}</span>
        </li>
      `).join('');
}

function pickerAssignActive() {
  const cat = pickerItems[pickerIndex];
  if (!cat) return;
  assignFocusedTo(cat.id);
  closeAssignPicker();
}

async function pickerCreateAndAssign(name) {
  const cat = await api.addCategory(name);
  assignFocusedTo(cat.id);
  closeAssignPicker();
  renderDrawer();
  renderRail();
  renderSidebar();
  toast(`Created "${name}" and assigned`);
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

  let deleteTransactions = false;
  if (count > 0) {
    const choice = await openConfirm({
      title: 'Delete category',
      body: `"${cat.name}" has ${count} transaction${count === 1 ? '' : 's'}. What should happen to them?`,
      choices: [
        {
          value: 'uncategorize',
          label: 'Move to Uncategorized',
          hint: 'They’ll show up in the Categorize inbox to sort later.',
          default: true,
        },
        {
          value: 'delete',
          label: `Delete ${count} transaction${count === 1 ? '' : 's'}`,
          hint: 'Removed for good — spend totals will drop accordingly.',
          danger: true,
        },
      ],
    });
    if (!choice) return;
    deleteTransactions = choice === 'delete';
  } else {
    const ok = await openConfirm({ title: 'Delete category', body: `Delete "${cat.name}"?`, danger: true });
    if (!ok) return;
  }

  await api.deleteCategory(id, deleteTransactions);
  renderDrawer();
  renderRail();
  renderSidebar();
  if (currentRoute() === 'categorize') renderCategorize();
  if (currentRoute() === 'spend') renderSpend();
  toast(deleteTransactions
    ? `Deleted "${cat.name}" and ${count} transaction${count === 1 ? '' : 's'}`
    : `Deleted "${cat.name}"`);
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
    // Read new order from DOM; dataset values are always strings, so coerce with String()
    const order = [...list.querySelectorAll('.cat-row')].map(r => r.dataset.catId);
    state.categories.sort((a, b) => order.indexOf(String(a.id)) - order.indexOf(String(b.id)));

    // Persist new order to backend
    await fetch('/api/categories/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state.categories.map((c, i) => ({ id: c.id, sortOrder: i }))),
    });

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

  // Escape: close topmost overlay first
  if (e.key === 'Escape') {
    if (!$('#confirmDialog').hidden) { closeConfirm(false); e.preventDefault(); return; }
    if (!$('#uploadResultModal').hidden) { $('#uploadResultModal').hidden = true; e.preventDefault(); return; }
    if (!$('#uploadModal').hidden) { $('#uploadModal').hidden = true; e.preventDefault(); return; }
    if (versionPopoverOpen) { closeVersionPopover(); e.preventDefault(); return; }
    if (pickerOpen) { closeAssignPicker(); e.preventDefault(); return; }
    if (state.assignPanelOpen) { closeAssignPanel(); e.preventDefault(); return; }
    if (categoryTxnsOpenId != null) { closeCategoryTxnsModal(); e.preventDefault(); return; }
    if (drawerOpen) { closeDrawer(); e.preventDefault(); return; }
    if (state.selectedIds.size > 1) { clearSelection(); renderCategorize(); e.preventDefault(); return; }
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
  if (drawerOpen || pickerOpen || state.assignPanelOpen || categoryTxnsOpenId != null) return;

  if (e.key === '/') { e.preventDefault(); openAssignPicker(); return; }
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
async function init() {
  const [catDtos, txnDtos] = await Promise.all([
    fetch('/api/categories').then(r => r.json()),
    fetch(`/api/transactions?startDate=${sixMonthsAgoDate()}`).then(r => r.json()),
  ]);

  state.categories = catDtos.map((c, i) => ({
    id: c.id,
    name: c.name,
    color: `var(--${CAT_PALETTE[i % CAT_PALETTE.length]})`,
  }));

  state.transactions = txnDtos.map(mapTxn);
  state.currentMonth = new Date().toISOString().substring(0, 7);

  const firstUncat = state.transactions.find(t => t.categoryId == null && t.amount < 0);
  state.focusedId = firstUncat ? firstUncat.id : null;

  if (!location.hash) location.hash = '#/spend';
  applyRoute();
  renderSidebar();
  renderRail();
  bind();

  fetch('/api/info').then(r => r.json()).then(async info => {
    state.version = info.version;
    try {
      state.latestVersion = await api.checkLatestVersion();
    } catch {
      state.latestVersion = null;
    }
    renderVersion();
  }).catch(() => {});
}

init();
