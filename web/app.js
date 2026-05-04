// ── Configuration ────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:5000/api';

// ── State ─────────────────────────────────────────────────────────────────────
let categories = [];           // All categories – used for management & dropdowns
let analyticsCategories = [];  // Date-filtered – used only for the spending analytics cards
let transactions = [];         // Uncategorised transactions
let selectedTransactions = new Set();
let currentView = 'categorize';
let expandedCategories = new Set();
let categoryTransactions = {};
let selectedDateRange = { preset: 'this-month', startDate: null, endDate: null };
let previousPeriodData = null;
let transactionSearchTerm = '';
let pickerTargetTransactionId = null; // null = bulk mode, number = single transaction

// ── Category colour palette ───────────────────────────────────────────────────
const CATEGORY_COLORS = [
    '#667eea', '#e96c1c', '#e91c6b', '#43c59e', '#4facfe',
    '#a855f7', '#22d3ee', '#f59e0b', '#ec4899', '#6366f1',
    '#10b981', '#3b82f6', '#8b5cf6', '#f97316', '#14b8a6',
    '#84cc16', '#ef4444', '#06b6d4', '#eab308', '#6b7280',
];

function getCategoryColor(categoryId) {
    return CATEGORY_COLORS[(categoryId - 1) % CATEGORY_COLORS.length];
}

// ── DOM references ────────────────────────────────────────────────────────────
const elements = {
    mainContent:           document.getElementById('mainContent'),
    loading:               document.getElementById('loading'),
    categoryList:          document.getElementById('categoryList'),
    transactionTableBody:  document.getElementById('transactionTableBody'),
    selectAll:             document.getElementById('selectAll'),
    categorizeSelectedBtn: document.getElementById('categorizeSelectedBtn'),
    selectedCount:         document.getElementById('selectedCount'),
    addCategoryBtn:        document.getElementById('addCategoryBtn'),
    categoryModal:         document.getElementById('categoryModal'),
    categoryForm:          document.getElementById('categoryForm'),
    modalClose:            document.getElementById('modalClose'),
    cancelBtn:             document.getElementById('cancelBtn'),
    categoryName:          document.getElementById('categoryName'),
    categoryDescription:   document.getElementById('categoryDescription'),
    modalTitle:            document.getElementById('modalTitle'),
    csvFileInput:          document.getElementById('csvFile'),
    uploadBtn:             document.getElementById('uploadBtn'),
    transactionSearch:     document.getElementById('transactionSearch'),
};

// ── Startup ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        showLoading();
        await loadCategories();
        await loadTransactions();

        const connectionPanel = document.getElementById('connectionPanel');
        if (connectionPanel) connectionPanel.style.display = 'none';

        if (elements.mainContent) elements.mainContent.style.display = 'block';

        const viewTabs = document.getElementById('viewTabs');
        if (viewTabs) viewTabs.style.display = 'flex';

        hideLoading();
    } catch (err) {
        console.error('Startup error:', err);
        showError('Failed to connect to local server: ' + err.message);
        hideLoading();
    }

    try {
        const info = await apiRequest('/info');
        if (info?.version) {
            const el = document.getElementById('appVersion');
            if (el) el.textContent = `SpendTracker v${info.version}`;
        }
    } catch (_) { /* version is non-critical */ }
});

// ── API helper ────────────────────────────────────────────────────────────────
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = { method, headers: {} };

    if (body && !(body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
        options.body = body;
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);

    if (response.status === 204) return null;

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
    }

    return response.json();
}

// ── Data loaders ──────────────────────────────────────────────────────────────
async function loadCategories() {
    try {
        const data = await apiRequest('/categories');
        if (!data) return;
        categories = data;
        renderCategories();
    } catch (err) {
        console.error('Error loading categories:', err);
        showError('Failed to load categories: ' + err.message);
    }
}

async function loadTransactions() {
    try {
        showLoading();
        const data = await apiRequest('/transactions?uncategorized=true');
        if (!data) { hideLoading(); return; }
        transactions = data;
        renderTransactions();
        hideLoading();
    } catch (err) {
        console.error('Error loading transactions:', err);
        showError('Failed to load transactions: ' + err.message);
        hideLoading();
    }
}

// ── Render: category management list ─────────────────────────────────────────
function renderCategories() {
    if (!elements.categoryList) return;

    if (categories.length === 0) {
        elements.categoryList.innerHTML = '<p class="empty-state">No categories yet. Click &ldquo;+ Add Category&rdquo; to create one.</p>';
        return;
    }

    const sorted = [...categories].sort((a, b) => a.name.localeCompare(b.name));

    elements.categoryList.innerHTML = sorted.map(cat => {
        const color = getCategoryColor(cat.id);
        return `
            <div class="category-card">
                <span class="category-color-dot" style="background:${color}"></span>
                <span class="category-card-name">${cat.name}</span>
                <span class="category-card-count">${cat.transactionCount} txn${cat.transactionCount !== 1 ? 's' : ''}</span>
                <div class="category-actions">
                    <button class="btn-icon" onclick="editCategory(${cat.id})" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="deleteCategory(${cat.id})" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// ── Render: uncategorised transactions table ──────────────────────────────────
function renderTransactions() {
    if (!elements.transactionTableBody) return;

    const filtered = transactionSearchTerm
        ? transactions.filter(t => t.description.toLowerCase().includes(transactionSearchTerm))
        : transactions;

    if (filtered.length === 0) {
        const msg = transactionSearchTerm
            ? 'No transactions match your filter.'
            : 'All transactions have been categorised. Great work! 🎉';
        elements.transactionTableBody.innerHTML = `
            <tr><td colspan="5" class="empty-state">${msg}</td></tr>
        `;
        return;
    }

    elements.transactionTableBody.innerHTML = filtered.map(t => {
        const desc = t.description.length > 60
            ? t.description.substring(0, 60) + '…'
            : t.description;
        return `
            <tr data-id="${t.id}">
                <td class="col-check">
                    <input type="checkbox" class="transaction-checkbox" data-id="${t.id}">
                </td>
                <td class="col-date">${formatDate(t.transactionDate)}</td>
                <td class="col-desc" title="${escapeHtml(t.description)}">${escapeHtml(desc)}</td>
                <td class="col-amount">${formatAmount(t.debit, t.credit)}</td>
                <td class="col-actions">
                    <button class="btn btn-sm btn-assign" onclick="openCategoryPicker(${t.id})">
                        Assign
                    </button>
                    <button class="btn-icon" onclick="deleteTransaction(${t.id})" title="Delete">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');

    document.querySelectorAll('.transaction-checkbox').forEach(cb => {
        cb.addEventListener('change', updateSelectedTransactions);
    });
}

// ── Transaction search ────────────────────────────────────────────────────────
window.onTransactionSearch = function () {
    transactionSearchTerm = (elements.transactionSearch?.value ?? '').toLowerCase();
    renderTransactions();
};

// ── Selection state ───────────────────────────────────────────────────────────
function updateSelectedTransactions() {
    selectedTransactions.clear();
    document.querySelectorAll('.transaction-checkbox:checked').forEach(cb => {
        selectedTransactions.add(parseInt(cb.dataset.id));
    });

    if (elements.selectedCount) elements.selectedCount.textContent = selectedTransactions.size;
    if (elements.categorizeSelectedBtn) {
        elements.categorizeSelectedBtn.disabled = selectedTransactions.size === 0;
    }

    const all = document.querySelectorAll('.transaction-checkbox');
    const checked = document.querySelectorAll('.transaction-checkbox:checked');
    if (elements.selectAll) {
        elements.selectAll.checked = all.length > 0 && all.length === checked.length;
    }
}

// ── Category picker ───────────────────────────────────────────────────────────
window.openCategoryPicker = function (transactionId) {
    pickerTargetTransactionId = transactionId !== undefined ? transactionId : null;

    const modal   = document.getElementById('categoryPickerModal');
    const title   = document.getElementById('pickerModalTitle');
    const search  = document.getElementById('categoryPickerSearch');

    if (title) {
        title.textContent = pickerTargetTransactionId !== null
            ? 'Assign Category'
            : `Assign Category to ${selectedTransactions.size} Transaction${selectedTransactions.size !== 1 ? 's' : ''}`;
    }
    if (search) search.value = '';
    renderCategoryPicker('');
    if (modal)  modal.style.display = 'flex';
    if (search) search.focus();
};

function renderCategoryPicker(searchTerm) {
    const grid = document.getElementById('categoryPickerGrid');
    if (!grid) return;

    const term = (searchTerm ?? '').toLowerCase();
    const filtered = term
        ? categories.filter(c => c.name.toLowerCase().includes(term))
        : categories;

    const tiles = filtered.map(cat => {
        const color = getCategoryColor(cat.id);
        return `
            <button class="category-tile" onclick="assignCategoryFromPicker(${cat.id})"
                    style="background:${color}; border-color:${color};">
                ${escapeHtml(cat.name)}
            </button>
        `;
    }).join('');

    const newBtn = `
        <button class="category-tile category-tile-new" onclick="openAddCategoryFromPicker()">
            + New Category
        </button>
    `;

    grid.innerHTML = tiles + newBtn;
}

window.onCategoryPickerSearch = function () {
    const val = document.getElementById('categoryPickerSearch')?.value ?? '';
    renderCategoryPicker(val);
};

window.assignCategoryFromPicker = async function (categoryId) {
    document.getElementById('categoryPickerModal').style.display = 'none';

    if (pickerTargetTransactionId !== null) {
        await categorizeSingle(pickerTargetTransactionId, categoryId);
    } else {
        await categorizeBulk(categoryId);
    }
};

window.openAddCategoryFromPicker = function () {
    document.getElementById('categoryPickerModal').style.display = 'none';

    elements.modalTitle.textContent = 'Add Category';
    elements.categoryForm.reset();
    elements.categoryForm.dataset.mode = 'add';
    elements.categoryForm.dataset.returnToPicker = 'true';
    delete elements.categoryForm.dataset.id;
    elements.categoryModal.style.display = 'flex';
    setTimeout(() => elements.categoryName?.focus(), 50);
};

// ── Categorisation ────────────────────────────────────────────────────────────
async function categorizeSingle(transactionId, categoryId) {
    try {
        showLoading();
        await apiRequest(`/transactions/${transactionId}/category`, 'PUT', { categoryId });

        const row = document.querySelector(`tr[data-id="${transactionId}"]`);
        if (row) row.remove();
        transactions = transactions.filter(t => t.id !== transactionId);
        selectedTransactions.delete(transactionId);
        updateSelectedTransactions();

        // Show empty state if the filtered list is now empty
        const visibleCount = transactionSearchTerm
            ? transactions.filter(t => t.description.toLowerCase().includes(transactionSearchTerm)).length
            : transactions.length;
        if (visibleCount === 0) renderTransactions();

        loadCategories(); // background refresh of counts
        showSuccess('Transaction categorised!');
        hideLoading();
    } catch (err) {
        console.error('Error categorising transaction:', err);
        showError('Failed to categorise: ' + err.message);
        hideLoading();
    }
}

async function categorizeBulk(categoryId) {
    const ids = Array.from(selectedTransactions);
    if (ids.length === 0) return;

    try {
        showLoading();
        const result = await apiRequest('/transactions/bulk-categorize', 'POST', {
            transactionIds: ids,
            categoryId,
        });

        if (result) {
            ids.forEach(id => {
                const row = document.querySelector(`tr[data-id="${id}"]`);
                if (row) row.remove();
            });
            transactions = transactions.filter(t => !ids.includes(t.id));
            selectedTransactions.clear();
            updateSelectedTransactions();

            const visibleCount = transactionSearchTerm
                ? transactions.filter(t => t.description.toLowerCase().includes(transactionSearchTerm)).length
                : transactions.length;
            if (visibleCount === 0) renderTransactions();

            loadCategories();
            showSuccess(`${result.processed} transaction${result.processed !== 1 ? 's' : ''} categorised!`);
        }
        hideLoading();
    } catch (err) {
        console.error('Error in bulk categorisation:', err);
        showError('Failed to categorise: ' + err.message);
        hideLoading();
    }
}

// ── Category CRUD ─────────────────────────────────────────────────────────────
window.editCategory = async function (categoryId) {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    elements.modalTitle.textContent = 'Edit Category';
    elements.categoryName.value = cat.name;
    elements.categoryDescription.value = cat.description ?? '';
    elements.categoryForm.dataset.mode = 'edit';
    elements.categoryForm.dataset.id = categoryId;
    delete elements.categoryForm.dataset.returnToPicker;
    elements.categoryModal.style.display = 'flex';
};

window.deleteCategory = async function (categoryId) {
    if (!confirm('Delete this category?')) return;

    try {
        showLoading();
        await apiRequest(`/categories/${categoryId}`, 'DELETE');
        await loadCategories();
        showSuccess('Category deleted.');
        hideLoading();
    } catch (err) {
        console.error('Error deleting category:', err);
        showError('Failed to delete category: ' + err.message);
        hideLoading();
    }
};

// ── View switching ────────────────────────────────────────────────────────────
function showCategorizeView() {
    currentView = 'categorize';
    document.getElementById('categorizeView').style.display = 'block';
    document.getElementById('categoryDetailView').style.display = 'none';
    document.getElementById('tabCategorize').classList.add('active');
    document.getElementById('tabCategories').classList.remove('active');
}

function showCategoryView() {
    currentView = 'categories';
    document.getElementById('categorizeView').style.display = 'none';
    document.getElementById('categoryDetailView').style.display = 'block';
    document.getElementById('tabCategorize').classList.remove('active');
    document.getElementById('tabCategories').classList.add('active');

    renderCategories();
    applyDateFilter();
}

// ── Category detail / analytics ───────────────────────────────────────────────
function renderCategoryDetailView() {
    const container = document.getElementById('categoryDetailContainer');
    if (!container) return;

    if (analyticsCategories.length === 0) {
        container.innerHTML = '<p class="empty-state">No spending data for this period.</p>';
        return;
    }

    const sorted = [...analyticsCategories].sort((a, b) => b.totalSpending - a.totalSpending);

    container.innerHTML = sorted.map(cat => {
        const isExpanded = expandedCategories.has(cat.id);
        const color = getCategoryColor(cat.id);

        let comparisonHtml = '';
        if (previousPeriodData) {
            const prev = previousPeriodData.find(p => p.id === cat.id);
            if (prev && prev.totalSpending > 0) {
                const comp = calculateComparison(cat.totalSpending, prev.totalSpending);
                if (comp) {
                    const arrow = comp.direction === 'up' ? '↑' : comp.direction === 'down' ? '↓' : '→';
                    const cls   = comp.increase ? 'comparison-up' : 'comparison-down';
                    comparisonHtml = `<span class="category-comparison ${cls}">${arrow} ${comp.percentage}%</span>`;
                }
            }
        }

        return `
            <div class="category-detail-card" data-category-id="${cat.id}">
                <div class="category-detail-header" onclick="toggleCategoryTransactions(${cat.id})">
                    <span class="expand-icon">${isExpanded ? '▼' : '▶'}</span>
                    <span class="category-color-bar" style="background:${color}"></span>
                    <div class="category-detail-info">
                        <h3>${escapeHtml(cat.name)}</h3>
                        <p class="category-detail-stats">
                            ${formatCurrency(cat.totalSpending)}
                            &nbsp;•&nbsp; ${cat.transactionCount} transaction${cat.transactionCount !== 1 ? 's' : ''}
                            ${comparisonHtml ? `&nbsp;${comparisonHtml}` : ''}
                        </p>
                    </div>
                </div>
                <div class="category-detail-transactions" id="transactions-${cat.id}"
                     style="display:${isExpanded ? 'block' : 'none'};">
                    ${isExpanded ? renderCategoryTransactions(cat.id) : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderCategoryTransactions(categoryId) {
    const txns = categoryTransactions[categoryId];

    if (!txns) return '<div class="loading-transactions">Loading…</div>';
    if (txns.length === 0) return '<div class="no-transactions">No transactions in this period.</div>';

    return `
        <table class="category-transactions-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${txns.map(t => `
                    <tr>
                        <td>${formatDate(t.transactionDate)}</td>
                        <td>${escapeHtml(t.description)}</td>
                        <td>${formatAmount(t.debit, t.credit)}</td>
                        <td class="transaction-actions">
                            <button class="btn btn-sm btn-secondary" onclick="removeTransactionFromCategory(${t.id})">
                                Remove
                            </button>
                            <select class="reassign-select" onchange="reassignTransaction(${t.id}, this.value)">
                                <option value="">Re-assign…</option>
                                ${categories.filter(c => c.id !== categoryId).map(c => `
                                    <option value="${c.id}">${escapeHtml(c.name)}</option>
                                `).join('')}
                            </select>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

window.toggleCategoryTransactions = async function (categoryId) {
    if (expandedCategories.has(categoryId)) {
        expandedCategories.delete(categoryId);
    } else {
        expandedCategories.add(categoryId);
        if (!categoryTransactions[categoryId]) {
            await loadCategoryTransactions(categoryId);
        }
    }
    renderCategoryDetailView();
};

async function loadCategoryTransactions(categoryId) {
    try {
        let endpoint = `/categories/${categoryId}/transactions`;
        if (selectedDateRange.startDate && selectedDateRange.endDate) {
            endpoint += `?startDate=${formatDateForApi(selectedDateRange.startDate)}&endDate=${formatDateForApi(selectedDateRange.endDate)}`;
        }
        const data = await apiRequest(endpoint);
        if (data) categoryTransactions[categoryId] = data;
    } catch (err) {
        console.error(`Error loading transactions for category ${categoryId}:`, err);
        categoryTransactions[categoryId] = [];
    }
}

window.removeTransactionFromCategory = async function (transactionId) {
    if (!confirm('Remove this transaction from its category?')) return;

    try {
        showLoading();
        await apiRequest(`/transactions/${transactionId}/category`, 'DELETE');

        categoryTransactions = {};
        expandedCategories.clear();
        await loadCategories();
        await loadTransactions();

        if (currentView === 'categories') await applyDateFilter();

        showSuccess('Transaction removed from category.');
        hideLoading();
    } catch (err) {
        console.error('Error removing transaction:', err);
        showError('Failed to remove transaction: ' + err.message);
        hideLoading();
    }
};

window.reassignTransaction = async function (transactionId, newCategoryId) {
    if (!newCategoryId) return;

    try {
        showLoading();
        await apiRequest(`/transactions/${transactionId}/category`, 'PUT', {
            categoryId: parseInt(newCategoryId),
        });

        categoryTransactions = {};
        expandedCategories.clear();
        await loadCategories();

        if (currentView === 'categories') await applyDateFilter();

        showSuccess('Transaction reassigned.');
        hideLoading();
    } catch (err) {
        console.error('Error reassigning transaction:', err);
        showError('Failed to reassign transaction: ' + err.message);
        hideLoading();
    }
};

// ── Date filtering ────────────────────────────────────────────────────────────
function calculateDateRange(preset) {
    const now = new Date();
    const ranges = {
        'this-month':    () => ({ start: new Date(now.getFullYear(), now.getMonth(), 1),     end: new Date(now.getFullYear(), now.getMonth() + 1, 0) }),
        'last-month':    () => ({ start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) }),
        'last-3-months': () => ({ start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: new Date(now.getFullYear(), now.getMonth(), 0) }),
        'this-quarter':  () => { const q = Math.floor(now.getMonth() / 3);       return { start: new Date(now.getFullYear(), q * 3, 1),     end: new Date(now.getFullYear(), (q + 1) * 3, 0) }; },
        'last-quarter':  () => { const q = Math.floor(now.getMonth() / 3) - 1; const y = q < 0 ? now.getFullYear() - 1 : now.getFullYear(); const aq = q < 0 ? 3 : q; return { start: new Date(y, aq * 3, 1), end: new Date(y, (aq + 1) * 3, 0) }; },
        'this-year':     () => ({ start: new Date(now.getFullYear(), 0, 1),      end: new Date(now.getFullYear(), 11, 31) }),
        'last-year':     () => ({ start: new Date(now.getFullYear() - 1, 0, 1), end: new Date(now.getFullYear() - 1, 11, 31) }),
        'all-time':      () => ({ start: null, end: null }),
    };
    return ranges[preset] ? ranges[preset]() : { start: null, end: null };
}

function calculatePreviousPeriod(startDate, endDate) {
    if (!startDate || !endDate) return { start: null, end: null };
    const duration = endDate - startDate;
    const prevEnd  = new Date(startDate.getTime() - 86400000);
    const prevStart = new Date(prevEnd.getTime() - duration);
    return { start: prevStart, end: prevEnd };
}

function formatDateForApi(date) {
    if (!date) return null;
    return date.toISOString().split('T')[0];
}

async function loadCategoriesWithDateFilter(startDate, endDate) {
    try {
        let endpoint = '/categories';
        if (startDate && endDate) {
            endpoint += `?startDate=${formatDateForApi(startDate)}&endDate=${formatDateForApi(endDate)}`;
        }
        return await apiRequest(endpoint) ?? null;
    } catch (err) {
        console.error('Error loading categories with date filter:', err);
        showError('Failed to load categories: ' + err.message);
        return null;
    }
}

async function applyDateFilter() {
    if (selectedDateRange.preset === 'custom') {
        if (!selectedDateRange.startDate || !selectedDateRange.endDate) {
            showError('Please select both start and end dates.');
            return;
        }
    } else {
        const range = calculateDateRange(selectedDateRange.preset);
        selectedDateRange.startDate = range.start;
        selectedDateRange.endDate   = range.end;
    }

    showLoading();

    analyticsCategories = await loadCategoriesWithDateFilter(selectedDateRange.startDate, selectedDateRange.endDate) ?? [];

    const prev = calculatePreviousPeriod(selectedDateRange.startDate, selectedDateRange.endDate);
    previousPeriodData = prev.start && prev.end
        ? await loadCategoriesWithDateFilter(prev.start, prev.end)
        : null;

    categoryTransactions = {};
    expandedCategories.clear();

    renderCategoryDetailView();
    updateDateFilterDisplay();
    hideLoading();
}

function updateDateFilterDisplay() {
    const el = document.getElementById('dateRangeDisplay');
    if (!el) return;

    const dateText   = formatDateRangeDisplay(selectedDateRange.startDate, selectedDateRange.endDate);
    const total      = analyticsCategories.reduce((s, c) => s + c.totalSpending, 0);

    let comparisonHtml = '';
    if (previousPeriodData) {
        const prevTotal = previousPeriodData.reduce((s, c) => s + c.totalSpending, 0);
        const comp = calculateComparison(total, prevTotal);
        if (comp) {
            const arrow = comp.direction === 'up' ? '↑' : comp.direction === 'down' ? '↓' : '→';
            const cls   = comp.increase ? 'comparison-up' : 'comparison-down';
            const label = getPreviousPeriodName(selectedDateRange.preset);
            comparisonHtml = `<span class="${cls}">${arrow} ${comp.percentage}% vs ${label}</span>`;
        }
    }

    el.innerHTML = `
        <span class="date-range-text">📅 ${dateText}</span>
        <span class="total-spending">• ${formatCurrency(total)}</span>
        ${comparisonHtml ? ` • ${comparisonHtml}` : ''}
    `;
}

function formatDateRangeDisplay(startDate, endDate) {
    if (!startDate || !endDate) return 'All Time';
    const opts = { month: 'short', year: 'numeric' };
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
        return s.toLocaleDateString('en-ZA', opts);
    }
    return `${s.toLocaleDateString('en-ZA', opts)} – ${e.toLocaleDateString('en-ZA', opts)}`;
}

function calculateComparison(current, previous) {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return {
        percentage: Math.abs(change).toFixed(1),
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same',
        increase: change > 0,
    };
}

function getPreviousPeriodName(preset) {
    return {
        'this-month':    'Last Month',
        'last-month':    'Month Before',
        'last-3-months': 'Previous 3 Months',
        'this-quarter':  'Last Quarter',
        'last-quarter':  'Quarter Before',
        'this-year':     'Last Year',
        'last-year':     'Year Before',
    }[preset] ?? 'Previous Period';
}

window.onDatePresetChange = function () {
    const sel = document.getElementById('datePreset');
    if (!sel) return;
    selectedDateRange.preset = sel.value;

    const custom = document.getElementById('customDateInputs');
    if (custom) custom.style.display = selectedDateRange.preset === 'custom' ? 'flex' : 'none';

    if (selectedDateRange.preset !== 'custom') applyDateFilter();
};

window.applyCustomDateRange = function () {
    const s = document.getElementById('customStartDate')?.value;
    const e = document.getElementById('customEndDate')?.value;

    if (!s || !e) { showError('Please select both start and end dates.'); return; }

    const start = new Date(s);
    const end   = new Date(e);

    if (start > end) { showError('Start date must be before end date.'); return; }

    selectedDateRange.startDate = start;
    selectedDateRange.endDate   = end;
    selectedDateRange.preset    = 'custom';
    applyDateFilter();
};

// ── CSV upload ────────────────────────────────────────────────────────────────
async function uploadCsv() {
    const fileInput     = elements.csvFileInput;
    const bankTypeSelect = document.getElementById('bankType');

    if (!fileInput?.files?.length) { showError('Please select a CSV file.'); return; }
    if (!bankTypeSelect?.value)     { showError('Please select a bank type.'); return; }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('bankType', bankTypeSelect.value);

    try {
        showLoading();
        const result = await apiRequest('/transactions/upload', 'POST', formData);
        if (result) {
            showUploadResult(result);
            fileInput.value = '';
            bankTypeSelect.value = '';
            await loadTransactions();
        }
        hideLoading();
    } catch (err) {
        console.error('Error uploading CSV:', err);
        showError('Failed to upload CSV: ' + err.message);
        hideLoading();
    }
}

function showUploadResult(result) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'flex';

    const dupSection = result.duplicatesSkipped > 0 ? `
        <div class="upload-result-section warning">
            <strong>⚠️ Duplicates Skipped:</strong> ${result.duplicatesSkipped} transactions
            ${result.duplicateWarnings.length > 0 ? `
                <details class="duplicate-details">
                    <summary>View duplicate transactions</summary>
                    <ul class="duplicate-list">
                        ${result.duplicateWarnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
                    </ul>
                </details>
            ` : ''}
        </div>
    ` : '';

    const errSection = result.failedImports > 0 ? `
        <div class="upload-result-section error">
            <strong>❌ Failed:</strong> ${result.failedImports} transactions
            ${result.errors.length > 0 ? `
                <details>
                    <summary>View errors</summary>
                    <ul class="error-list">
                        ${result.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
                    </ul>
                </details>
            ` : ''}
        </div>
    ` : '';

    modal.innerHTML = `
        <div class="modal-content upload-result-modal">
            <div class="modal-header">
                <h2>CSV Upload Complete</h2>
                <button class="modal-close" onclick="this.closest('.modal').remove()">&times;</button>
            </div>
            <div class="upload-result-body">
                <div class="upload-result-section success">
                    <strong>✅ Successfully Imported:</strong> ${result.successfulImports} transactions
                </div>
                ${dupSection}
                ${errSection}
                <div class="upload-result-batch">
                    <small>Batch ID: ${result.uploadBatchId}</small>
                </div>
            </div>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Close</button>
                ${result.successfulImports > 0 ? `
                    <button class="btn btn-danger" onclick="deleteUploadBatch('${result.uploadBatchId}')">
                        Delete This Upload
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.deleteUploadBatch = async function (uploadBatchId) {
    if (!confirm('Delete all transactions from this upload? This cannot be undone.')) return;

    try {
        showLoading();
        const result = await apiRequest(`/transactions/batch/${uploadBatchId}`, 'DELETE');

        if (result) {
            document.querySelectorAll('.upload-result-modal').forEach(m => m.closest('.modal').remove());
            showSuccess(`Deleted ${result.deletedCount} transactions.`);
            await loadCategories();
            await loadTransactions();
            if (currentView === 'categories') await applyDateFilter();
        }
        hideLoading();
    } catch (err) {
        console.error('Error deleting batch:', err);
        showError('Failed to delete batch: ' + err.message);
        hideLoading();
    }
};

window.deleteTransaction = async function (transactionId) {
    if (!confirm('Delete this transaction?')) return;

    try {
        showLoading();
        await apiRequest(`/transactions/${transactionId}`, 'DELETE');
        await loadCategories();
        await loadTransactions();
        if (currentView === 'categories') {
            categoryTransactions = {};
            expandedCategories.clear();
            await applyDateFilter();
        }
        showSuccess('Transaction deleted.');
        hideLoading();
    } catch (err) {
        console.error('Error deleting transaction:', err);
        showError('Failed to delete transaction: ' + err.message);
        hideLoading();
    }
};

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
    if (!amount && amount !== 0) return 'R 0.00';
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(debit, credit) {
    if (debit  && debit  !== 0) return `<span class="amount-debit">-${formatCurrency(debit)}</span>`;
    if (credit && credit !== 0) return `<span class="amount-credit">+${formatCurrency(credit)}</span>`;
    return formatCurrency(0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showLoading() {
    if (elements.loading) elements.loading.style.display = 'flex';
}

function hideLoading() {
    if (elements.loading) elements.loading.style.display = 'none';
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    const n = document.createElement('div');
    n.className = 'notification success';
    n.textContent = message;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
}

// ── Event listeners ───────────────────────────────────────────────────────────
if (elements.selectAll) {
    elements.selectAll.addEventListener('change', e => {
        document.querySelectorAll('.transaction-checkbox').forEach(cb => {
            cb.checked = e.target.checked;
        });
        updateSelectedTransactions();
    });
}

if (elements.categorizeSelectedBtn) {
    elements.categorizeSelectedBtn.addEventListener('click', () => {
        if (selectedTransactions.size === 0) return;
        openCategoryPicker(undefined); // bulk mode
    });
}

if (elements.addCategoryBtn) {
    elements.addCategoryBtn.addEventListener('click', () => {
        elements.modalTitle.textContent = 'Add Category';
        elements.categoryForm.reset();
        elements.categoryForm.dataset.mode = 'add';
        delete elements.categoryForm.dataset.returnToPicker;
        delete elements.categoryForm.dataset.id;
        elements.categoryModal.style.display = 'flex';
        setTimeout(() => elements.categoryName?.focus(), 50);
    });
}

if (elements.modalClose)  elements.modalClose.addEventListener('click',  () => { elements.categoryModal.style.display = 'none'; });
if (elements.cancelBtn)   elements.cancelBtn.addEventListener('click',   () => { elements.categoryModal.style.display = 'none'; });

document.getElementById('pickerModalClose')?.addEventListener('click', () => {
    document.getElementById('categoryPickerModal').style.display = 'none';
});
document.getElementById('pickerCancelBtn')?.addEventListener('click', () => {
    document.getElementById('categoryPickerModal').style.display = 'none';
});

if (elements.categoryForm) {
    elements.categoryForm.addEventListener('submit', async e => {
        e.preventDefault();

        const mode        = elements.categoryForm.dataset.mode;
        const name        = elements.categoryName.value.trim();
        const description = elements.categoryDescription.value.trim();
        const returnToPicker = elements.categoryForm.dataset.returnToPicker === 'true';

        try {
            showLoading();
            if (mode === 'edit') {
                const id = parseInt(elements.categoryForm.dataset.id);
                await apiRequest(`/categories/${id}`, 'PUT', { name, description });
                showSuccess('Category updated.');
            } else {
                await apiRequest('/categories', 'POST', { name, description });
                showSuccess('Category created.');
            }

            await loadCategories();
            elements.categoryModal.style.display = 'none';
            hideLoading();

            if (returnToPicker) {
                delete elements.categoryForm.dataset.returnToPicker;
                openCategoryPicker(pickerTargetTransactionId !== null ? pickerTargetTransactionId : undefined);
            }
        } catch (err) {
            console.error('Error saving category:', err);
            showError('Failed to save category: ' + err.message);
            hideLoading();
        }
    });
}

if (elements.uploadBtn) {
    elements.uploadBtn.addEventListener('click', uploadCsv);
}

window.addEventListener('click', e => {
    const catModal    = document.getElementById('categoryModal');
    const pickerModal = document.getElementById('categoryPickerModal');
    if (e.target === catModal)    catModal.style.display    = 'none';
    if (e.target === pickerModal) pickerModal.style.display = 'none';
});
