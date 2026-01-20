// API Client Configuration
let API_URL = '';
let API_KEY = '';
let categories = [];
let transactions = [];
let currentPage = 0;
let totalTransactions = 0;
const ITEMS_PER_PAGE = 50;
let selectedTransactions = new Set();

// DOM Elements
const elements = {
    apiUrl: document.getElementById('apiUrl'),
    apiKey: document.getElementById('apiKey'),
    connectBtn: document.getElementById('connectBtn'),
    connectionStatus: document.getElementById('connectionStatus'),
    statusText: document.getElementById('statusText'),
    mainContent: document.getElementById('mainContent'),
    loading: document.getElementById('loading'),
    categoryList: document.getElementById('categoryList'),
    transactionTableBody: document.getElementById('transactionTableBody'),
    paginationInfo: document.getElementById('paginationInfo'),
    prevBtn: document.getElementById('prevBtn'),
    nextBtn: document.getElementById('nextBtn'),
    selectAll: document.getElementById('selectAll'),
    categorizeSelectedBtn: document.getElementById('categorizeSelectedBtn'),
    selectedCount: document.getElementById('selectedCount'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    categoryModal: document.getElementById('categoryModal'),
    categoryForm: document.getElementById('categoryForm'),
    modalClose: document.getElementById('modalClose'),
    cancelBtn: document.getElementById('cancelBtn'),
    categoryId: document.getElementById('categoryId'),
    categoryName: document.getElementById('categoryName'),
    categoryColor: document.getElementById('categoryColor'),
    modalTitle: document.getElementById('modalTitle'),
    bulkModal: document.getElementById('bulkModal'),
    bulkModalClose: document.getElementById('bulkModalClose'),
    bulkCategory: document.getElementById('bulkCategory'),
    bulkSaveBtn: document.getElementById('bulkSaveBtn'),
    bulkCancelBtn: document.getElementById('bulkCancelBtn')
};

// API Helper Functions
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

async function loadCategories() {
    try {
        const response = await apiRequest('/categories');
        categories = response.categories || [];
        renderCategories();
        populateCategoryDropdowns();
    } catch (err) {
        console.error('Error loading categories:', err);
        showError('Failed to load categories: ' + err.message);
    }
}

async function loadTransactions() {
    try {
        showLoading();
        const offset = currentPage * ITEMS_PER_PAGE;
        const response = await apiRequest(`/export?limit=${ITEMS_PER_PAGE}&offset=${offset}`);
        
        transactions = response.items || [];
        totalTransactions = response.total || 0;
        
        renderTransactions();
        updatePagination();
        hideLoading();
    } catch (err) {
        console.error('Error loading transactions:', err);
        showError('Failed to load transactions: ' + err.message);
        hideLoading();
    }
}

// Rendering Functions
function renderCategories() {
    elements.categoryList.innerHTML = categories.map(cat => `
        <div class="category-card">
            <div class="category-info">
                <div class="category-badge" style="background-color: ${cat.color}">
                    ${cat.name}
                </div>
                <div class="category-stats">
                    ${cat.totalCount} transactions | ${formatCurrency(cat.totalAmount)}
                </div>
            </div>
            <div class="category-actions">
                <button class="btn-icon" onclick="editCategory('${cat.id}')" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteCategory('${cat.id}')" title="Delete">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function renderTransactions() {
    if (transactions.length === 0) {
        elements.transactionTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 2rem;">
                    No uncategorized transactions found.
                </td>
            </tr>
        `;
        return;
    }

    elements.transactionTableBody.innerHTML = transactions.map((item, index) => {
        const transaction = item.data;
        const merchantName = transaction.merchant?.name || 'Unknown Merchant';
        const country = transaction.merchant?.country?.code || 'N/A';
        const date = formatDate(transaction.dateTime);
        const amount = formatCurrency(transaction.centsAmount);
        
        return `
            <tr data-filename="${item.filename}">
                <td>
                    <input type="checkbox" class="transaction-checkbox" data-filename="${item.filename}">
                </td>
                <td>${date}</td>
                <td>${merchantName}</td>
                <td>${amount}</td>
                <td>${country}</td>
                <td>
                    <select class="category-select" data-filename="${item.filename}">
                        <option value="">-- Select --</option>
                        ${categories.map(cat => `
                            <option value="${cat.id}">${cat.name}</option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="categorizeSingle('${item.filename}')">
                        Save
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    // Attach checkbox event listeners
    document.querySelectorAll('.transaction-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', updateSelectedTransactions);
    });
}

function populateCategoryDropdowns() {
    const options = categories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
    
    elements.bulkCategory.innerHTML = `<option value="">-- Select a category --</option>${options}`;
}

function updatePagination() {
    const start = totalTransactions === 0 ? 0 : currentPage * ITEMS_PER_PAGE + 1;
    const end = Math.min((currentPage + 1) * ITEMS_PER_PAGE, totalTransactions);
    
    elements.paginationInfo.textContent = `${start}-${end} of ${totalTransactions}`;
    elements.prevBtn.disabled = currentPage === 0;
    elements.nextBtn.disabled = end >= totalTransactions;
}

function updateSelectedTransactions() {
    selectedTransactions.clear();
    document.querySelectorAll('.transaction-checkbox:checked').forEach(checkbox => {
        selectedTransactions.add(checkbox.dataset.filename);
    });
    
    elements.selectedCount.textContent = selectedTransactions.size;
    elements.categorizeSelectedBtn.disabled = selectedTransactions.size === 0;
    
    // Update "select all" checkbox state
    const allCheckboxes = document.querySelectorAll('.transaction-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.transaction-checkbox:checked');
    elements.selectAll.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
}

// Utility Functions
function formatCurrency(centsAmount) {
    if (!centsAmount && centsAmount !== 0) return 'R 0.00';
    const amount = centsAmount / 100;
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showLoading() {
    elements.loading.style.display = 'flex';
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    // Simple success notification
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Category Management Functions
window.editCategory = function(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    elements.modalTitle.textContent = 'Edit Category';
    elements.categoryId.value = category.id;
    elements.categoryId.disabled = true; // Can't change ID
    elements.categoryName.value = category.name;
    elements.categoryColor.value = category.color;
    
    elements.categoryModal.style.display = 'flex';
    elements.categoryForm.dataset.mode = 'edit';
};

window.deleteCategory = async function(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
        showLoading();
        await apiRequest(`/categories/${categoryId}`, 'DELETE');
        await loadCategories();
        showSuccess('Category deleted successfully!');
        hideLoading();
    } catch (err) {
        console.error('Error deleting category:', err);
        showError('Failed to delete category: ' + err.message);
        hideLoading();
    }
};

// Categorization Functions
window.categorizeSingle = async function(filename) {
    const selectElement = document.querySelector(`select[data-filename="${filename}"]`);
    const categoryId = selectElement.value;
    
    if (!categoryId) {
        showError('Please select a category first');
        return;
    }
    
    try {
        showLoading();
        const response = await apiRequest('/categorize', 'POST', {
            filename,
            category: categoryId
        });
        
        // Update category stats
        const categoryIndex = categories.findIndex(c => c.id === categoryId);
        if (categoryIndex !== -1 && response.category) {
            categories[categoryIndex] = response.category;
        }
        
        // Reload data
        await loadCategories();
        await loadTransactions();
        showSuccess('Transaction categorized successfully!');
        hideLoading();
    } catch (err) {
        console.error('Error categorizing transaction:', err);
        showError('Failed to categorize transaction: ' + err.message);
        hideLoading();
    }
};

async function categorizeBulk() {
    const categoryId = elements.bulkCategory.value;
    
    if (!categoryId) {
        showError('Please select a category');
        return;
    }
    
    const items = Array.from(selectedTransactions).map(filename => ({
        filename,
        category: categoryId
    }));
    
    try {
        showLoading();
        elements.bulkModal.style.display = 'none';
        
        const response = await apiRequest('/categorize-bulk', 'POST', items);
        
        // Update categories
        if (response.categories) {
            response.categories.forEach(updatedCat => {
                const index = categories.findIndex(c => c.id === updatedCat.id);
                if (index !== -1) {
                    categories[index] = updatedCat;
                }
            });
        }
        
        selectedTransactions.clear();
        await loadCategories();
        await loadTransactions();
        showSuccess(`${response.processed} transactions categorized successfully!`);
        hideLoading();
    } catch (err) {
        console.error('Error in bulk categorization:', err);
        showError('Failed to categorize transactions: ' + err.message);
        hideLoading();
    }
}

// Event Listeners
elements.connectBtn.addEventListener('click', async () => {
    API_URL = elements.apiUrl.value.trim();
    API_KEY = elements.apiKey.value.trim();
    
    if (!API_URL || !API_KEY) {
        showError('Please enter both API URL and API Key');
        return;
    }
    
    try {
        showLoading();
        await loadCategories();
        await loadTransactions();
        
        elements.statusText.textContent = 'Connected';
        elements.connectionStatus.querySelector('.status-dot').className = 'status-dot connected';
        elements.mainContent.style.display = 'block';
        hideLoading();
    } catch (err) {
        console.error('Connection error:', err);
        showError('Failed to connect: ' + err.message);
        hideLoading();
    }
});

elements.prevBtn.addEventListener('click', async () => {
    if (currentPage > 0) {
        currentPage--;
        await loadTransactions();
    }
});

elements.nextBtn.addEventListener('click', async () => {
    if ((currentPage + 1) * ITEMS_PER_PAGE < totalTransactions) {
        currentPage++;
        await loadTransactions();
    }
});

elements.selectAll.addEventListener('change', (e) => {
    document.querySelectorAll('.transaction-checkbox').forEach(checkbox => {
        checkbox.checked = e.target.checked;
    });
    updateSelectedTransactions();
});

elements.categorizeSelectedBtn.addEventListener('click', () => {
    elements.bulkModal.style.display = 'flex';
});

elements.addCategoryBtn.addEventListener('click', () => {
    elements.modalTitle.textContent = 'Add Category';
    elements.categoryForm.reset();
    elements.categoryId.disabled = false;
    elements.categoryModal.style.display = 'flex';
    elements.categoryForm.dataset.mode = 'add';
});

elements.modalClose.addEventListener('click', () => {
    elements.categoryModal.style.display = 'none';
});

elements.cancelBtn.addEventListener('click', () => {
    elements.categoryModal.style.display = 'none';
});

elements.bulkModalClose.addEventListener('click', () => {
    elements.bulkModal.style.display = 'none';
});

elements.bulkCancelBtn.addEventListener('click', () => {
    elements.bulkModal.style.display = 'none';
});

elements.bulkSaveBtn.addEventListener('click', categorizeBulk);

elements.categoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const mode = elements.categoryForm.dataset.mode;
    const id = elements.categoryId.value.trim();
    const name = elements.categoryName.value.trim();
    const color = elements.categoryColor.value;
    
    try {
        showLoading();
        
        if (mode === 'edit') {
            await apiRequest(`/categories/${id}`, 'PUT', { name, color });
            showSuccess('Category updated successfully!');
        } else {
            await apiRequest('/categories', 'POST', { id, name, color });
            showSuccess('Category created successfully!');
        }
        
        await loadCategories();
        elements.categoryModal.style.display = 'none';
        hideLoading();
    } catch (err) {
        console.error('Error saving category:', err);
        showError('Failed to save category: ' + err.message);
        hideLoading();
    }
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === elements.categoryModal) {
        elements.categoryModal.style.display = 'none';
    }
    if (e.target === elements.bulkModal) {
        elements.bulkModal.style.display = 'none';
    }
});
