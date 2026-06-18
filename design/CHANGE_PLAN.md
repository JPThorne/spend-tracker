# Change Plan — Spend Tracker UI rework (round 2)

Companion to `README.md`. This document specifies **six changes** to the reference
implementation in `web/` (`index.html`, `styles.css`, `app.js`). It is written for an
implementing agent working against the **real** codebase. Symbol names below
(`renderRail()`, `onKey()`, `state.focusedId`, `api.categorize`, `#assignRail`, …) refer to
the reference in `web/app.js`; map them onto the equivalents in the live app where it has
drifted. Each item lists: **current behavior → desired behavior → implementation notes → edge
cases**. Items marked **⚠ DECISION** contain a choice the implementer (or product owner)
should confirm before building; the recommended option is called out.

Keep the existing design language: tokens in `styles.css`, the modal/scrim/pop-in pattern
from `#uploadModal`, toasts via `toast()`, and the keyboard-suppression-while-typing rule in
`onKey()`.

---

## 1. Version indicator with "update available" state (discrete, dismissible)

**Current** — Sidebar footer is two static mono 11px lines: `self-hosted · local-only` and
`v0.4` (see `renderSidebar()` / the footer markup in `index.html`). No notion of a newer
version.

**Desired** — The version line doubles as a quiet update affordance:
- **Idle:** just `v0.4`, unchanged — must stay visually recessed (mono 11px, `--ink-3`).
- **Update available:** a small **accent dot** (5–6px, `--accent`) appears next to the version
  string. Hovering/clicking the line opens a small **in-app popover** (not a browser dialog)
  anchored above the footer: heading `v0.5 available`, one muted line (e.g. "you're on v0.4"),
  an optional one-line changelog/"What's new" link, and two actions — a primary **Update**
  (or "How to update →" for a self-hosted app) and a ghost **Dismiss**.
- **Dismissed:** the dot and popover go away; the line returns to plain `v0.4`. Dismissal is
  **remembered per available-version** so a _later_ release re-surfaces the dot, but the
  already-seen one stays quiet.

**Implementation notes**
- State: add `state.version` (current build, a constant), `state.latestVersion` (string|null),
  and read `state.updateDismissed` from `localStorage['spend.updateDismissed']`.
- API: add `api.checkLatestVersion()` — a stub for now (return a hard-coded `'0.5'` so the
  state is demoable) with a `// TODO` to point at the real source (e.g. a GitHub releases
  manifest or a `/version` endpoint). Compare with a tiny semver-ish `isNewer(a,b)` helper.
- Render: add `renderVersion()` that draws the footer line + conditional dot. The popover is a
  small absolutely-positioned element appended near the footer (reuse the surface/`--shadow`/
  `--r` styling; it is NOT the toast root and NOT a full modal). Close on outside-click and
  `Esc`.
- Dismiss writes `localStorage['spend.updateDismissed'] = state.latestVersion`. On load, the
  dot shows only when `latestVersion` is newer than `version` **and** `updateDismissed !==
  latestVersion`.
- Call `api.checkLatestVersion()` once in `init()` (non-blocking), then `renderVersion()`.

**Edge cases** — No network / check fails → treat as "no update" (idle), never error-surface.
The popover must not steal focus from the categorize keyboard flow; `Esc` closes the popover
before anything else only when it is open.

---

## 2. Expandable quick-assign legend on the right; compact rail shows only 1–9  ⚠ DECISION

**Current** — The Categorize assign rail (`renderRail()`, `#railChips`) renders
`state.categories.slice(0, 9)` as chips, numbered 1–9, in a sticky bottom bar. Categories past
the 9th are not shown anywhere on the Categorize page. The right-hand drawer (`#drawer`) is
where category **CRUD** lives.

**Desired** — Split "the 9 fast keys" from "all categories":
- The **compact rail stays limited to the 9 number-keyed categories** (chips `1`–`9`). This is
  intentional — it is the keyboard legend, not the full list.
- Add an **expand affordance** on the rail (e.g. a `+N more` chip or an "All categories →"
  button) that opens a **larger panel on the right-hand side**, in the same real-estate the
  category-creation overlay/drawer uses. That panel lists **every** category (including the
  10th onward) as click-to-assign targets, grouped/scrollable, with the 1–9 ones still marked
  with their number.

**⚠ DECISION — which right-side surface hosts the expanded legend?**
- **(Recommended) A dedicated "assign panel"** — a sibling drawer to `#drawer` that is
  assignment-focused: click a category to assign the focused row / current selection, no CRUD
  controls. Cleaner separation from category management, and it can show selection count.
- **(Alternative) Reuse `#drawer`** in an "assign mode" — same panel, rows become assign
  buttons. Less new markup, but overloads the CRUD drawer with two behaviors.

**Implementation notes** (independent of the decision)
- New render `renderAssignPanel()` listing all `state.categories`; clicking a row calls the
  same assignment path as a chip (`assignFocusedTo` / the bulk path from item 5).
- The expand control lives in the rail next to the chips; opening/closing toggles a
  `state.assignPanelOpen` flag (or reuses drawer open state if you pick the Alternative).
- This panel is the canonical answer to "categories past 9 aren't reachable" — see item 4.

**Edge cases** — With ≤9 categories the expand control can hide (nothing extra to show), or
still open the panel for click (your call — keep it visible for consistency). Keep the panel
scrollable; do not cap the list.

---

## 3. After CSV upload, route to Categorize automatically

**Current** — `uploadConfirm` click handler (in `bind()`) is a stub: it `toast()`s a mock
message, hides `#uploadModal`, and resets the form. It does **not** navigate.

**Desired** — A successful import drops the user straight into the **Categorize** page so they
can immediately clear the freshly-imported backlog.

**Implementation notes**
- In the upload-confirm success path (after the real `/write` ingest resolves), call
  `goto('categorize')`, then reload data (the new uncategorized txns) and `renderCategorize()`.
  `applyRoute()` already renders the categorize view on hash change, so `goto('categorize')`
  largely suffices — just ensure new data is loaded first.
- Reset `state.focusedId` to the first pending txn after import (mirror the `seed()` tail that
  sets focus to the first uncategorized row), and consider resetting `state.filter` to `'all'`
  so nothing is hidden.
- Keep the success `toast()` (e.g. "Imported N transactions") — it now appears on the
  Categorize page.

**Edge cases** — Import yields **0** new uncategorized txns → still route to Categorize; the
existing empty state (`#txnEmpty`, "Inbox zero.") covers it. If the user is already on
Categorize, force a re-render (don't rely on `hashchange` not firing).

---

## 4. Make all categories reachable + resolve numeric-shortcut ambiguity  ⚠ DECISION

**Current** — Two coupled limits:
1. `renderRail()` and the keyboard handler only consider the first 9 categories
   (`state.categories.slice(0,9)` and `state.categories[n-1]` for `n` in 1–9 inside `onKey()`).
   A 10th+ category has no shortcut and no chip — it is effectively unusable on Categorize.
2. Single-digit keys are inherently ambiguous past 9: if shortcuts went two-digit, pressing
   `2` can't tell whether you mean category **2** or the first digit of **21**. (This is the
   "we can't use the 21" problem.)

**Desired** — Every category is assignable, and the numeric ambiguity is designed out rather
than papered over.

**⚠ DECISION — how to reach categories beyond 9.** Recommended = A (+ keep B as a documented
fallback only if the team insists on numeric-only):

- **(Recommended) A — 1–9 keys for the first nine; type-to-search for the rest.**
  Keep `1`–`9` as instant single-key shortcuts for the first nine categories (the rail legend).
  Add a **type-to-search assign picker**: press a trigger (suggest `/` or `f`, or simply start
  typing a letter) to open a small filter-as-you-type list of **all** categories; arrow keys +
  `Enter` assign; `Esc` cancels. This scales to any number of categories and has **zero** digit
  ambiguity. The right-side assign panel from item 2 is the mouse-driven equivalent.

- **B — two-digit numeric entry with a debounce buffer (fallback).** Accept multi-digit numbers
  via a short input buffer: on a digit key, start/extend a buffer and a ~400ms timer; commit on
  timeout, on `Enter`, or as soon as no longer-numbered category could match. Show the
  in-progress buffer (e.g. a small `2_` indicator on the rail) so the user sees `2` waiting to
  become `21`. This works but adds latency to the common 1–9 case and is fiddly — only do it if
  product specifically wants numeric-only.

**Implementation notes**
- Decouple "shortcut-numbered categories" (first 9) from "assignable categories" (all). The
  rail/legend stays 1–9 (item 2); the picker (A) and the right panel (item 2) cover the rest.
- For A: new `openAssignPicker()` + a filter input; reuse `assignFocusedTo` / the bulk path
  (item 5) on selection. Respect the typing-suppression rule — the picker is the one place
  typing is expected, so route its own keydown separately.
- Make sure the **Categorize view surfaces the existence of >9 categories** (e.g. the `+N more`
  chip from item 2) so users aren't left thinking only nine exist.

**Edge cases** — Category named literally `"21"` or other numerals: with approach A the picker
matches by name text, so a category *called* "21" is found by typing `21` — no collision with
shortcut index 21. Document that **shortcut numbers are positional (order in the drawer), not
the category's name.** Keep `⌘Z` undo working through picker/panel assignments.

---

## 5. Shift-click multi-select + bulk assign; sortable Date / Description columns

**Current** — Categorize has a single **focused** row (`state.focusedId`); clicking a row just
moves focus (`#txnList` click handler), `j`/`k` move focus, `1–9`/chips assign the **one**
focused txn via `assignFocusedTo(catId)`. `pendingTxns()` returns uncategorized debits in a
fixed most-recent-first order. The column headers render as clickable (`README` §Categorize)
but **no sort handler is wired** in `app.js`.

**Desired** — (a) Select multiple rows and assign them all at once; (b) sort the list by Date
or Description.

### 5a. Multi-select + bulk assign
- **Selection model:** add `state.selectedIds` (a `Set`) and `state.selectionAnchor` (last
  plainly-clicked id). In the `#txnList` click handler:
  - **Plain click** → select just that row (clear others), set it focused + anchor.
  - **Shift-click** → select the contiguous range from anchor to the clicked row **in current
    visual (sorted) order**.
  - **⌘/Ctrl-click** → toggle that row in/out of the set without clearing others.
- **Visual:** selected rows get a distinct treatment (e.g. `--accent-soft` fill + the 3px
  `--accent` left bar, reusing the focused-row styling vocabulary); the single "focused" row
  remains the keyboard cursor. Show a small **selection toolbar** when `selectedIds.size > 1`:
  "`N selected`" + a **Clear** ghost button (and `Esc` clears selection before closing
  overlays).
- **Assigning a selection:** when `selectedIds.size > 1`, `1–9` / chip / picker / right-panel
  click assigns **all selected** rows. Add `api.categorizeBulk(ids, catId)` (the backend
  contract already names `/categorize-bulk`); push **one** combined entry onto `state.undo` so a
  single `⌘Z` reverts the whole batch (`undoLast()` must handle an array of `{txnId, prev}`).
  After assigning, advance focus to the next still-pending row and clear the selection.
- `state.sessionDone` increments by the number newly categorized.

### 5b. Sortable columns
- Add `state.sort = { key: 'date' | 'desc' | 'amount', dir: 'asc' | 'desc' }` (default
  `{key:'date', dir:'desc'}` to preserve today's most-recent-first).
- Wire a click handler on the header row: clicking a column sets its key; clicking the active
  key flips `dir`. Reflect the active column + direction with the `↓`/`↑` glyph already in the
  header markup. Apply the sort inside `pendingTxns()` (or a `sortedPending()` wrapper used by
  `renderCategorize()`).
- Sort keys: `date` (ISO string compare), `desc` (locale `localeCompare`), `amount` (numeric;
  decide whether to sort by signed value or magnitude — suggest signed).

**Edge cases**
- **Sort × shift-range:** range selection uses the **current sorted order**, so re-sorting
  changes what a future shift-click spans (expected). Don't try to preserve ranges across sorts.
- **Sort × j/k focus:** `moveFocus()` must walk the **sorted** pending order, not the raw array.
- After a bulk assign, recompute the pending list and re-resolve `focusedId` (the existing
  "focused id no longer pending → focus first" guard in `renderCategorize()` already helps).
- Keep `prefers-reduced-motion` honored for any new selection transitions.

---

## 6. Replace native `confirm()` on category delete with an in-app dialog

**Current** — `confirmDelete(id)` in `app.js` calls the browser `confirm(msg)`; on OK it runs
`api.deleteCategory(id)` (which re-buckets that category's txns to uncategorized) and
re-renders. This is a system-style modal, inconsistent with the app.

**Desired** — An **in-app** confirmation, styled like the rest of the UI (follow the
`#uploadModal` scrim + centered card + pop-in pattern, or an inline popover anchored to the
delete button — implementer's choice; modal is simplest and matches existing code).

**Implementation notes**
- Add a small confirm dialog to `index.html` (e.g. `#confirmDialog`) with a title, a body line,
  and **Cancel** (ghost) + **Delete** (danger-styled, `--danger`) buttons; reuse modal scrim +
  `pop-in` animation and `Esc`/scrim-to-cancel from the upload modal.
- Refactor `confirmDelete(id)` to **open the dialog** instead of calling `confirm()`. Populate
  the body with the existing count-aware copy: when the category has txns,
  *"Delete "{name}"? {N} transaction(s) will be uncategorized."*; otherwise *"Delete
  "{name}"?"*. Wire the dialog's Delete button to run the existing post-confirm body
  (`await api.deleteCategory(id)`, re-render drawer/rail/sidebar + active view, `toast('Deleted
  "{name}"')`).
- Make it promise/callback-based (`openConfirm({title, body, danger}) → Promise<boolean>`) so
  it can be reused for any future destructive action.

**Edge cases** — `Esc` closes this dialog before the drawer/upload modal when it is the topmost
overlay (extend the `Esc` precedence chain in `onKey()`). Focus the Cancel button on open for
safety. Don't delete on scrim-click — only the explicit Delete button.

---

## Suggested build order

1. **6** (in-app confirm) — small, self-contained, reusable dialog primitive.
2. **3** (upload → categorize) — tiny flow change.
3. **1** (version indicator) — isolated to the sidebar footer.
4. **5b** (column sort) — pure state + render, no new surfaces.
5. **5a** (multi-select + bulk assign) — needs `api.categorizeBulk` + undo-batch.
6. **2 + 4** (expand panel + reach-all-categories + assign picker) — do together; they share
   the "all categories assign" surface and the picker.

## New / changed surface area (summary)

| Area | Change |
|---|---|
| `state` | `+ selectedIds`, `+ selectionAnchor`, `+ sort`, `+ version`, `+ latestVersion`, `+ assignPanelOpen` |
| `api` | `+ categorizeBulk(ids, catId)`, `+ checkLatestVersion()` |
| Renderers | `+ renderVersion`, `+ renderAssignPanel`, edits to `renderRail`, `renderCategorize`, `renderDrawer`(delete), `moveFocus`, `undoLast` |
| `index.html` | `+ #confirmDialog`, `+ assign panel markup`, version popover, rail expand control, selection toolbar, sortable header wiring |
| `styles.css` | selection row state, assign panel, confirm dialog, version dot/popover, sort header active state |

## Open questions for product (please confirm before build)

- **Item 2:** dedicated assign panel (recommended) vs. reuse the CRUD drawer in "assign mode"?
- **Item 4:** type-to-search picker (recommended) vs. two-digit numeric buffer — or both?
- **Item 4 trigger key** for the picker (`/`, `f`, or any letter) — preference?
- **Item 1:** for a self-hosted app, should "Update" link to docs/releases, or is a passive
  "new version available" notice (no in-app updater) enough?
