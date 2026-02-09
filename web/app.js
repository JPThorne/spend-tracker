// API Client Configuration
let API_URL = 'http://localhost:5062/api'; // Default to local .NET API
let API_KEY = '';
let categories = [];
let transactions = [];
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
    selectAll: document.getElementById('selectAll'),
    categorizeSelectedBtn: document.getElementById('categorizeSelectedBtn'),
    selectedCount: document.getElementById('selectedCount'),
    addCategoryBtn: document.getElementById('addCategoryBtn'),
    categoryModal: document.getElementById('categoryModal'),
    categoryForm: document.getElementById('categoryForm'),
    modalClose: document.getElementById('modalClose'),
    cancelBtn: document.getElementById('cancelBtn'),
    categoryName: document.getElementById('categoryName'),
    categoryDescription: document.getElementById('categoryDescription'),
    modalTitle: document.getElementById('modalTitle'),
    bulkModal: document.getElementById('bulkModal'),
    bulkModalClose: document.getElementById('bulkModalClose'),
    bulkCategory: document.getElementById('bulkCategory'),
    bulkSaveBtn: document.getElementById('bulkSaveBtn'),
    bulkCancelBtn: document.getElementById('bulkCancelBtn'),
    uploadForm: document.getElementById('uploadForm'),
    csvFileInput: document.getElementById('csvFile'),
    uploadBtn: document.getElementById('uploadBtn')
};

// Set default API URL
if (elements.apiUrl) {
    elements.apiUrl.value = API_URL;
}

// API Helper Functions
async function apiRequest(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: {
            'x-api-key': API_KEY
        }
    };

    if (body && !(body instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    } else if (body instanceof FormData) {
        options.body = body;
        // Don't set Content-Type for FormData, browser will set it with boundary
    }

    const response = await fetch(`${API_URL}${endpoint}`, options);
    
    if (response.status === 401) {
        showError('Authentication failed. Please check your API key.');
        return null;
    }

    if (response.status === 204) {
        return null; // No content
    }

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

async function loadCategories() {
    try {
        const data = await apiRequest('/categories');
        if (!data) return;
        
        categories = data;
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
        const data = await apiRequest('/transactions?uncategorized=true');
        if (!data) {
            hideLoading();
            return;
        }
        
        transactions = data;
        renderTransactions();
        hideLoading();
    } catch (err) {
        console.error('Error loading transactions:', err);
        showError('Failed to load transactions: ' + err.message);
        hideLoading();
    }
}

// Rendering Functions
function renderCategories() {
    if (!elements.categoryList) return;
    
    elements.categoryList.innerHTML = categories.map(cat => `
        <div class="category-card">
            <div class="category-info">
                <div class="category-badge">
                    ${cat.name}
                </div>
                <div class="category-stats">
                    ${cat.transactionCount} transactions | ${formatCurrency(cat.totalSpending)}
                </div>
            </div>
            <div class="category-actions">
                <button class="btn-icon" onclick="editCategory(${cat.id})" title="Edit">
                    ✏️
                </button>
                <button class="btn-icon" onclick="deleteCategory(${cat.id})" title="Delete">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

function renderTransactions() {
    if (!elements.transactionTableBody) return;
    
    if (transactions.length === 0) {
        elements.transactionTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 2rem;">
                    No uncategorized transactions found.
                </td>
            </tr>
        `;
        return;
    }

    elements.transactionTableBody.innerHTML = transactions.map(t => {
        const date = formatDate(t.transactionDate);
        const amount = formatAmount(t.debit, t.credit);
        
        return `
            <tr data-id="${t.id}">
                <td>
                    <input type="checkbox" class="transaction-checkbox" data-id="${t.id}">
                </td>
                <td>${date}</td>
                <td>${t.description}</td>
                <td>${amount}</td>
                <td>
                    <select class="category-select" data-id="${t.id}">
                        <option value="">-- Select --</option>
                        ${categories.map(cat => `
                            <option value="${cat.id}">${cat.name}</option>
                        `).join('')}
                    </select>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="categorizeSingle(${t.id})">
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
    if (!elements.bulkCategory) return;
    
    const options = categories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
    ).join('');
    
    elements.bulkCategory.innerHTML = `<option value="">-- Select a category --</option>${options}`;
}

function updateSelectedTransactions() {
    selectedTransactions.clear();
    document.querySelectorAll('.transaction-checkbox:checked').forEach(checkbox => {
        selectedTransactions.add(parseInt(checkbox.dataset.id));
    });
    
    if (elements.selectedCount) {
        elements.selectedCount.textContent = selectedTransactions.size;
    }
    if (elements.categorizeSelectedBtn) {
        elements.categorizeSelectedBtn.disabled = selectedTransactions.size === 0;
    }
    
    // Update "select all" checkbox state
    const allCheckboxes = document.querySelectorAll('.transaction-checkbox');
    const checkedCheckboxes = document.querySelectorAll('.transaction-checkbox:checked');
    if (elements.selectAll) {
        elements.selectAll.checked = allCheckboxes.length > 0 && allCheckboxes.length === checkedCheckboxes.length;
    }
}

// Utility Functions
function formatCurrency(amount) {
    if (!amount && amount !== 0) return 'R 0.00';
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatAmount(debit, credit) {
    if (debit && debit !== 0) {
        return `<span class="amount-debit">-${formatCurrency(debit)}</span>`;
    } else if (credit && credit !== 0) {
        return `<span class="amount-credit">+${formatCurrency(credit)}</span>`;
    }
    return formatCurrency(0);
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function showLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'flex';
    }
}

function hideLoading() {
    if (elements.loading) {
        elements.loading.style.display = 'none';
    }
}

function showError(message) {
    alert('Error: ' + message);
}

function showSuccess(message) {
    const notification = document.createElement('div');
    notification.className = 'notification success';
    notification.textContent = message;
    notification.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:1rem 2rem;border-radius:4px;z-index:10000;';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Category Management Functions
window.editCategory = async function(categoryId) {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return;
    
    elements.modalTitle.textContent = 'Edit Category';
    elements.categoryName.value = category.name;
    elements.categoryDescription.value = category.description || '';
    
    elements.categoryModal.style.display = 'flex';
    elements.categoryForm.dataset.mode = 'edit';
    elements.categoryForm.dataset.id = categoryId;
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
window.categorizeSingle = async function(transactionId) {
    const selectElement = document.querySelector(`select[data-id="${transactionId}"]`);
    const categoryId = parseInt(selectElement.value);
    
    if (!categoryId) {
        showError('Please select a category first');
        return;
    }
    
    try {
        showLoading();
        await apiRequest(`/transactions/${transactionId}/category`, 'PUT', {
            categoryId: categoryId
        });
        
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
    const categoryId = parseInt(elements.bulkCategory.value);
    
    if (!categoryId) {
        showError('Please select a category');
        return;
    }
    
    const transactionIds = Array.from(selectedTransactions);
    
    try {
        showLoading();
        elements.bulkModal.style.display = 'none';
        
        const result = await apiRequest('/transactions/bulk-categorize', 'POST', {
            transactionIds: transactionIds,
            categoryId: categoryId
        });
        
        if (result) {
            selectedTransactions.clear();
            await loadCategories();
            await loadTransactions();
            showSuccess(`${result.processed} transactions categorized successfully!`);
        }
        hideLoading();
    } catch (err) {
        console.error('Error in bulk categorization:', err);
        showError('Failed to categorize transactions: ' + err.message);
        hideLoading();
    }
}

// CSV Upload Function
async function uploadCsv() {
    const fileInput = elements.csvFileInput;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        showError('Please select a CSV file');
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        showLoading();
        const result = await apiRequest('/transactions/upload', 'POST', formData);
        
        if (result) {
            showSuccess(`Uploaded successfully! ${result.successfulImports} transactions imported.`);
            fileInput.value = ''; // Clear file input
            await loadTransactions();
        }
        hideLoading();
    } catch (err) {
        console.error('Error uploading CSV:', err);
        showError('Failed to upload CSV: ' + err.message);
        hideLoading();
    }
}

// Event Listeners
if (elements.connectBtn) {
    elements.connectBtn.addEventListener('click', async () => {
        API_URL = elements.apiUrl.value.trim();
        API_KEY = elements.apiKey.value.trim();
        
        if (!API_URL || !API_KEY) {
            showError('Please enter both API URL and API Key');
            return;
        }

        // Remove trailing slash from API URL if present
        API_URL = API_URL.replace(/\/$/, '');
        
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
}

if (elements.selectAll) {
    elements.selectAll.addEventListener('change', (e) => {
        document.querySelectorAll('.transaction-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        updateSelectedTransactions();
    });
}

if (elements.categorizeSelectedBtn) {
    elements.categorizeSelectedBtn.addEventListener('click', () => {
        elements.bulkModal.style.display = 'flex';
    });
}

if (elements.addCategoryBtn) {
    elements.addCategoryBtn.addEventListener('click', () => {
        elements.modalTitle.textContent = 'Add Category';
        elements.categoryForm.reset();
        elements.categoryModal.style.display = 'flex';
        elements.categoryForm.dataset.mode = 'add';
        delete elements.categoryForm.dataset.id;
    });
}

if (elements.modalClose) {
    elements.modalClose.addEventListener('click', () => {
        elements.categoryModal.style.display = 'none';
    });
}

if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener('click', () => {
        elements.categoryModal.style.display = 'none';
    });
}

if (elements.bulkModalClose) {
    elements.bulkModalClose.addEventListener('click', () => {
        elements.bulkModal.style.display = 'none';
    });
}

if (elements.bulkCancelBtn) {
    elements.bulkCancelBtn.addEventListener('click', () => {
        elements.bulkModal.style.display = 'none';
    });
}

if (elements.bulkSaveBtn) {
    elements.bulkSaveBtn.addEventListener('click', categorizeBulk);
}

if (elements.categoryForm) {
    elements.categoryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const mode = elements.categoryForm.dataset.mode;
        const name = elements.categoryName.value.trim();
        const description = elements.categoryDescription.value.trim();
        
        try {
            showLoading();
            
            if (mode === 'edit') {
                const id = parseInt(elements.categoryForm.dataset.id);
                await apiRequest(`/categories/${id}`, 'PUT', { name, description });
                showSuccess('Category updated successfully!');
            } else {
                await apiRequest('/categories', 'POST', { name, description });
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
}

if (elements.uploadBtn) {
    elements.uploadBtn.addEventListener('click', uploadCsv);
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === elements.categoryModal) {
        elements.categoryModal.style.display = 'none';
    }
    if (e.target === elements.bulkModal) {
        elements.bulkModal.style.display = 'none';
    }
});
