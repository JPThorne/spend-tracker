# Handoff: Spend Tracker — UI Rework

## Overview

A self-hosted, single-user spend tracker. The user uploads bank CSV exports, categorizes the
imported transactions, and views a monthly spend breakdown. There is **no login, no account
creation, no multi-user** anything — it runs as a local website on the user's own machine.

This rework does two things to the previous version:
1. **Separates the spend view from the category view.** They used to be lumped together on one
   tab. Now **Spend** is the home page and **Categorize** is its own page; **Categories**
   management lives in a drawer that opens from anywhere.
2. **Modernizes the look** — warm off-white "paper" palette, a single warm accent, soft shadows,
   Geist type, and a fast keyboard-driven categorize flow.

## About the Design Files

This bundle contains two things:

- **`web/`** — a **high-fidelity, working reference implementation** in plain HTML/CSS/JS. It is
  the design source of truth: final colors, type, spacing, layout, interactions, and keyboard
  behavior all live here and all work in a browser today. It runs on in-memory sample data.
- **`wireframes/`** — the earlier **low-fidelity** sketch exploration (React/Babel, sketchy
  hand-drawn style). Included for context on *why* the layout is shaped the way it is. **Do not
  implement from these** — they are superseded by `web/`. They render on a pan/zoom canvas; open
  `Spend Tracker Wireframes.html` to view.

**The target stack is the same as the reference: plain HTML, CSS, and JavaScript (no React, no
build step).** So this is **not** a port to a new framework. The implementation task is to:
1. Drop `web/index.html`, `web/styles.css`, `web/app.js` into the real project (or merge with the
   existing files), and
2. **Replace the in-memory data layer with calls to the real backend** (see *Wiring the Backend*).

If you prefer to rebuild rather than adopt the files wholesale, the rest of this README documents
every screen, token, and interaction precisely enough to reproduce it.

## Fidelity

**High-fidelity.** `web/` is pixel-accurate and final. Match it exactly — colors, spacing,
typography, radii, shadows, and the motion/keyboard behavior described below.

---

## Screens / Views

The app shell is a CSS grid: a fixed **220px sidebar** on the left + a fluid **main** column
(`max-width: 1240px`). Two routable views (`Spend`, `Categorize`) swap inside main via hash
routing (`#/spend`, `#/categorize`). The **Categories** drawer and **Upload** modal are overlays
that can appear over either view.

### 1. Sidebar (persistent)

- **Purpose:** brand, the always-visible **Upload CSV** action, navigation, and the Categories
  opener.
- **Layout:** `flex-column`, `gap: 12px`, `padding: 20px 14px 14px`, `position: sticky; top: 0;
  height: 100vh`. Background `--bg-soft`, right border `--line`.
- **Components:**
  - **Brand** — 18×18 rounded `--ink` mark with a `--bg` inset square punched out; wordmark
    "spend" + an accent-colored period. Font 15px / 600.
  - **Upload CSV button** (`#uploadBtn`) — primary button (`--ink` fill, `--bg` text), full width,
    upload glyph + label. Opens the upload modal.
  - **Nav label** "Navigate" — 11px / 500, uppercase, `letter-spacing: 0.08em`, `--ink-3`.
  - **Nav items** — `Spend` (link, `#/spend`), `Categorize` (link, `#/categorize`, with a pending
    **count badge**), `Categories` (button, opens drawer, shows a `C` kbd hint). Item height ~32px,
    `gap: 10px`, 16px icon in `--ink-3`, 13.5px / 500 label. Active item gets a white surface,
    `--shadow-xs`, and a 1px `--line` ring.
  - **Badge** — pill, `--ink` bg, `--bg` text, 11px tabular; hidden when count is 0
    (`data-empty="true"`).
  - **Footer** — two mono 11px lines: "self-hosted · local-only" and "v0.4", top border `--line`,
    pushed to the bottom with `margin-top: auto`.

### 2. Spend view (`#view-spend`) — home

- **Purpose:** answer "how much have I spent this month, and where did it go?" at a glance.
- **Layout:** `flex-column`, `gap: 22px`.
- **Header** — `h1` "Spend" + subtitle ("May 2026 so far · N txns still uncategorized"). Right
  side: a **segmented month switcher** (`‹  May 2026  ›`), each segment 13px, the label 600 and
  110px min-width, hairline dividers, `--shadow-xs`.
- **Hero card** — `grid: minmax(260px,1fr) 1.4fr`, `gap: 28px`, `padding: 28px 28px 24px`, white
  surface, `--r-lg`, 1px `--line`, `--shadow-sm`.
  - **Left:** uppercase 11px label "Total spent"; **hero value** 56px / 600,
    `letter-spacing: -0.03em`, tabular (e.g. `R 20,450`); **delta** line below — colored pill icon
    (↑ danger / ↓ success / · flat) + "−R 1,240 (6%) vs. Apr 2026".
  - **Right:** a **6-month sparkline** (`<svg>` 320×80, `preserveAspectRatio="none"`) with three
    dashed gridlines, a `--ink` line, a faint fill area, and an accent end-dot ringed in surface
    color. Above it: "last 6 months" + a "peak R …" caption. Below it: 6 mono month labels, the
    current month bold `--ink`. On narrow widths the right column drops below the left with a top
    border instead of a left border.
- **Stat strip** — `grid` of **4 equal cards** (`gap: 12px`): *Biggest charge*, *Trending up*
  (category, +% in danger color, with its color dot), *Most transactions* (category + count),
  *To categorize* (accent number + "Open inbox →" link). Each card: 14×16 padding, `--r`, 1px
  `--line`, `--shadow-xs`. Labels uppercase 11px `--ink-3`; values 22px / 600 tabular, ellipsized.
- **Two-column section** — `grid: 1.4fr 1fr`, `gap: 16px`:
  - **By category card** — sorted **bar list**, most-spent first. Each row is a 5-col grid:
    color dot (10px) · name (110px, 13px/500) · **track** (8px tall, `--bg-soft`, rounded) with a
    **fill** (`transform: scaleX()`, animated 600ms) in the category color · amount (tabular,
    right) · MoM delta (↑/↓ % colored, or "new"). Rows hover to `--bg-soft`.
  - **Biggest this month card** — top-6 debits, each: color dot, name + mono meta
    ("3 May · Dining"), tabular amount. "View all →" link in the header routes to Categorize.

### 3. Categorize view (`#view-categorize`)

- **Purpose:** clear the backlog of uncategorized transactions fast, keyboard-first.
- **Header** — `h1` "N to categorize" + a subtitle of `kbd` hints (`j`/`k` move, `1–9` assign,
  `⌘Z` undo). Right side: **filter pills** (All / This month / Last month); active pill is
  `--ink` filled.
- **Progress row** — a 6px `--bg-soft` track with an `--ink` fill (width animates) + meta
  "N / M categorized this session".
- **Transactions table** — white surface, `--r-lg`, 1px `--line`. Header row (4-col grid:
  `100px 1fr 130px 100px`) with clickable column titles `Date · Description · Amount · Status`,
  uppercase 10.5px `--ink-3`, on `--surface-2`. Body rows share the grid: mono date, 13.5px/500
  description (ellipsized), tabular amount (`--ink` for debits, `--success` for credits), and a
  status cell. **One row is "focused"** — `--accent-soft` background + a 3px `--accent` left bar;
  its status reads "← assign below". Rows hover to `--bg-soft`.
  - **Empty state** (`#txnEmpty`): a circle "✓" badge, "Inbox zero." heading, muted line. Shown
    when nothing is pending; the assign rail dims to 0.4 and disables.
- **Assign rail** — `position: sticky; bottom: 16px`, white surface, `--r-lg`, 1px `--line-strong`,
  `--shadow`. Contains: an uppercase "Assign focused row →" label, a wrapping row of **category
  chips** (each: mono number `1–9` in a `--bg-soft` tile + color dot + name; press the number or
  click to assign), and a right-aligned actions group (`skip` `s`, `ignore` `x`) separated by a
  hairline.

### 4. Categories drawer (`#drawer`) — overlay, opens from anywhere

- **Purpose:** CRUD + ordering for categories. Order **is** the keyboard shortcut order on
  Categorize.
- **Trigger:** sidebar "Categories" item, or the **`C`** key from any page.
- **Layout:** right-anchored panel, **420px** wide (`max-width: calc(100vw - 24px)`), full height,
  `--shadow-lg`. Scrim `rgba(22,20,14,0.32)` fades in (180ms); panel slides in from the right
  (220ms `cubic-bezier(0.2,0.7,0.3,1)`).
- **Header:** "Categories" + muted line "N buckets · drag to reorder · the order is the keyboard
  shortcut" + a close icon button.
- **Body:**
  - **Category rows** (`draggable`) — 7-col grid: grip "⋮⋮" (`cursor: grab`) · mono index · 10px
    color dot · name (ellipsized) · mono "N txns" (all-time count) · **edit** (pencil) · **delete**
    (trash). Edit/delete are hidden until row hover/focus (`opacity` transition). Delete hover
    turns danger-colored. Hover row gets `--bg-soft` + 1px `--line`.
  - **Rename:** clicking edit swaps the name for an inline input (`Enter` commits, `Esc` cancels,
    blur commits).
  - **Add new** (`#catNewForm`) — a dashed `--bg-soft` row: next index, color-preview dot, a text
    input ("New category name…"), and a disabled-until-typed "+ Add" primary button. Submitting
    appends the category, clears the input, and re-renders the rail + sidebar.
  - **Reorder:** native HTML5 drag-and-drop; dropping reads DOM order back into state.

### 5. Upload modal (`#uploadModal`) — overlay

- **Purpose:** import a bank CSV.
- **Layout:** centered modal, `max-width: 460px`, `--r-lg`, `--shadow-lg`, pop-in 180ms. Scrim
  `rgba(22,20,14,0.36)`.
- **Body:** muted note ("CSV files stay on this machine…"); a **Bank** `<select>` (Investec / Absa
  / Nedbank); a **drop zone** (dashed border, upload glyph, "Drop a CSV here / or click to choose")
  that also accepts a native file pick. Drag-over paints it `--accent-soft` + `--accent` border;
  choosing a file shows its name + size.
- **Footer:** "Cancel" ghost + an "Upload" primary button, disabled until **both** a bank and a
  file are chosen.

### Toasts (`#toastStack`)

Bottom-center, `--ink` pill, 13px `--bg` text, slide-up 220ms. Used for confirmations. The assign
action's toast includes an **Undo** button (accent-tinted).

---

## Interactions & Behavior

- **Routing:** hash-based (`#/spend`, `#/categorize`). `applyRoute()` toggles `hidden` on the two
  views, sets the active nav item, and renders the active view. Default route is `#/spend`.
- **Month switching** (Spend): prev/next mutate `state.currentMonth` (`YYYY-MM`) and re-render the
  whole Spend view, including recomputing the sparkline window and MoM deltas.
- **Categorize focus model:** exactly one pending row is "focused". `j`/`k` (or ↓/↑) move focus and
  smooth-scroll it into view (`scrollIntoView({ block:'nearest' })` — note: only used here, deliberately).
  Clicking a row focuses it.
- **Assigning:** number keys `1–9` or clicking a chip assigns the focused txn to that category.
  Focus advances to the next pending row; a toast with **Undo** appears; the session progress bar
  and sidebar badge update. `s` skips (advance without assigning), `x` ignores (assigns to
  "Other"/last category — see *State* for where to harden this).
- **Undo:** `⌘Z` / `Ctrl+Z` (and the toast button) pop the last assignment off `state.undo` and
  restore the previous category, re-focusing that row. Stack capped at 50.
- **Keyboard global:** `C` toggles the Categories drawer from anywhere; `Esc` closes the modal
  first, then the drawer. All shortcuts are suppressed while typing in an input/select/textarea.
- **Drawer rename/delete/reorder:** described per-screen above. Delete on a category with
  transactions prompts a `confirm()` and re-buckets those txns to uncategorized.
- **Animations:** fade-in (180ms), slide-in (220ms), pop-in (180ms), toast-in (220ms), bar-fill
  (600ms), progress (400ms). All easing `cubic-bezier(0.2,0.7,0.3,1)` unless linear. A
  `prefers-reduced-motion: reduce` block collapses all durations to ~0.
- **Responsive:** ≤1080px the hero stacks, stat strip → 2 cols, two-col → 1 col; ≤720px the
  sidebar becomes a horizontal scroll bar and the table drops its status column.

---

## State Management

All state is a single in-memory `state` object in `app.js`:

| Key | Meaning |
|---|---|
| `categories` | `[{ id, name, color }]` — order is significant (it's the 1–9 shortcut order) |
| `transactions` | `[{ id, date:'YYYY-MM-DD', desc, amount, categoryId|null }]`; negative = debit |
| `currentMonth` | `'YYYY-MM'`, drives the Spend view |
| `filter` | `'all' | 'this-month' | 'last-month'` for the Categorize list |
| `focusedId` | currently focused pending txn on Categorize |
| `undo` | stack of `{ txnId, prev }` for undo |
| `sessionDone` | count categorized this session (progress bar) |

Derived selectors: `txnsInMonth`, `spendIn`, `pendingTxns`, `totalPendingCount`. Renderers are
plain functions (`renderSpend`, `renderCategorize`, `renderDrawer`, `renderRail`, `renderSidebar`)
that rebuild innerHTML from state — call them after any mutation.

### Wiring the Backend

`app.js` isolates all writes behind an **`api` object** (`categorize`, `addCategory`,
`renameCategory`, `deleteCategory`, `reorderCategory`). They currently mutate `state` in memory.
To go live:
1. Replace each `api.*` method body with a `fetch` to the corresponding endpoint
   (`/categorize`, `/categorize-bulk`, `/categories` POST/PUT/DELETE) and update local state from
   the response.
2. Replace the `seed()` call in `init()` with a load from `/export` (uncategorized txns) +
   `/categories`.
3. Harden **ignore**: today `ignoreFocused()` assigns to "Other". If you want a true "ignore" that
   hides a txn without categorizing it, add an `ignored` flag on the txn and exclude such txns from
   `pendingTxns()` and the spend totals.
4. The **Upload** confirm handler is a stub that just toasts — point it at your `/write` ingestion
   endpoint (parse CSV client- or server-side per your existing pipeline).

---

## Design Tokens

All defined as CSS custom properties at the top of `styles.css`.

### Color
```
--bg:           #f6f2ea   (app background, warm paper)
--bg-soft:      #efeae0   (sidebar, tracks, subtle fills)
--surface:      #ffffff   (cards, panels)
--surface-2:    #fbf8f1   (table header, drop zone)

--ink:          #16140e   (primary text, primary buttons)
--ink-1:        #2a261d
--ink-2:        #5e574a   (secondary text)
--ink-3:        #8b8472   (tertiary / labels)
--ink-4:        #b2ab98   (faint)

--line:         rgba(22,20,14,0.08)   (hairlines)
--line-strong:  rgba(22,20,14,0.14)

--accent:       #c25a2c   (single warm accent — used sparingly)
--accent-soft:  #f4e1d2
--success:      #4e7a4c   --success-soft: #dde6d8
--danger:       #b04535   --danger-soft:  #f1d8d2
--focus:        #4070d8

Category swatches (muted on purpose):
--cat-1 #6b8e63  --cat-2 #c47a4a  --cat-3 #6a82b3  --cat-4 #b0584d
--cat-5 #8a6cab  --cat-6 #4e9aa6  --cat-7 #c69a4a  --cat-8 #8c8273
```

### Shadows
```
--shadow-xs: 0 1px 1px rgba(22,20,14,.04)
--shadow-sm: 0 1px 2px rgba(22,20,14,.04), 0 2px 6px rgba(22,20,14,.04)
--shadow:    0 2px 4px rgba(22,20,14,.04), 0 6px 18px rgba(22,20,14,.06)
--shadow-lg: 0 10px 30px rgba(22,20,14,.10), 0 22px 60px rgba(22,20,14,.08)
```

### Radius
```
--r-xs 4px · --r-sm 6px · --r 10px · --r-lg 14px · --r-xl 20px
```

### Spacing scale
```
--gap-xs 4 · --gap-sm 8 · --gap 16 · --gap-lg 24 · --gap-xl 32   (px; use multiples of 4)
```

### Typography
- Family: **Geist** (UI) and **Geist Mono** (numbers, dates, kbd). Loaded from Google Fonts in
  `index.html`. `font-feature-settings: 'cv11','ss01','ss03'`. Numeric displays use
  `font-variant-numeric: tabular-nums`.
- Scale: `h1` 24/600/-0.015em · `h2` 16/600 · `h3` 15/600 · body 14/1.45 · sub & small 12–13
  `--ink-2` · uppercase labels 11/500/0.1em `--ink-3`. Hero value 56/600/-0.03em; stat value
  22/600.
- Layout constant: `--sidebar-w: 220px`.

### Currency
South African Rand. Format `R 1,234` (rounded, thousands-separated) for values ≥ 1000, `R 12.34`
otherwise. Minus sign uses the real unicode minus `−` (U+2212), not a hyphen. See `fmtMoney()`.

---

## Assets

- **No image/icon files.** All icons are inline SVG (sidebar nav, drawer pencil/trash/grip,
  delta arrows, upload glyph, empty-state check). See the `icons` factory and the inline SVGs in
  `index.html`.
- **Fonts:** Geist + Geist Mono via Google Fonts `<link>` in `index.html`. If the real app must
  work fully offline, self-host these instead.

---

## Files

In this bundle:

- `web/index.html` — markup for the shell, both views, drawer, modal, toast root.
- `web/styles.css` — all tokens + component styles (no preprocessor).
- `web/app.js` — state, sample-data seed, `api` stubs, renderers, routing, keyboard, drag-reorder.
- `wireframes/` — earlier low-fi exploration (context only; **do not implement from these**). Open
  `Spend Tracker Wireframes.html`.

To preview the reference: serve the `web/` folder over any static server (e.g. `npx http-server
web`) and open it. It runs immediately on sample data — no backend required to see every screen
and interaction.
