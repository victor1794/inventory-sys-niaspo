// Если хочешь всегда ходить на 8000 на локалхосте:
const API_BASE = 'http://localhost:8000';

// Универсальный хелпер
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);

        // 204 No Content – это норм для DELETE
        if (response.status === 204) {
            return null;
        }

        if (!response.ok) {
            let errorDetail = `HTTP ${response.status}`;
            try {
                const errJson = await response.json();
                if (errJson && errJson.detail) {
                    errorDetail = errJson.detail;
                }
            } catch (_) {
                // тело не JSON – забиваем
            }
            throw new Error(errorDetail);
        }

        // Если тело пустое – вернём null
        const text = await response.text();
        if (!text) return null;

        return JSON.parse(text);
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Сообщения
function showMessage(text, type = 'info') {
    const msgId = 'status-message';
    let msg = document.getElementById(msgId);

    if (!msg) {
        const wrapper = document.querySelector('.wrapper');
        msg = document.createElement('div');
        msg.id = msgId;
        wrapper.prepend(msg);
    }

    msg.className = `status-message ${type}`;
    msg.textContent = text;

    if (type !== 'error') {
        setTimeout(() => {
            const m = document.getElementById(msgId);
            if (m) m.remove();
        }, 3000);
    }
}

/* ==================== МАГАЗИНЫ ==================== */

async function loadStores() {
    try {
        const stores = await apiRequest('/stores');
        const tbody = document.querySelector('#stores-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!stores || stores.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-message">
                        Магазины не найдены. Добавьте первый магазин!
                    </td>
                </tr>
            `;
            return;
        }

        stores.forEach(store => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${store.id}</td>
                <td>${store.name}</td>
                <td>${store.city}</td>
                <td class="table-actions">
                    <button class="btn-small danger" onclick="deleteStore(${store.id})"> Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showMessage(`Ошибка загрузки магазинов: ${error.message}`, 'error');
    }
}

async function addStore() {
    const name = document.getElementById('store-name').value.trim();
    const city = document.getElementById('store-city').value.trim();

    if (!name || !city) {
        showMessage('Пожалуйста, заполните все поля', 'error');
        return;
    }

    try {
        await apiRequest('/stores', 'POST', { name, city });
        document.getElementById('store-name').value = '';
        document.getElementById('store-city').value = '';
        await loadStores();
        showMessage(`Магазин "${name}" добавлен`, 'success');
    } catch (error) {
        showMessage(`Ошибка добавления магазина: ${error.message}`, 'error');
    }
}

async function deleteStore(storeId) {
    if (!confirm(`Удалить магазин #${storeId}? Все остатки по нему тоже удалятся.`)) return;

    try {
        await apiRequest(`/stores/${storeId}`, 'DELETE');
        await loadStores();
        await loadStock();
        showMessage('Магазин удалён', 'success');
    } catch (error) {
        showMessage(`Ошибка удаления магазина: ${error.message}`, 'error');
    }
}

/* ==================== ТОВАРЫ ==================== */

async function loadProducts() {
    try {
        const products = await apiRequest('/products');
        const tbody = document.querySelector('#products-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!products || products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-message">
                        Товары не найдены. Добавьте первый товар!
                    </td>
                </tr>
            `;
            return;
        }

        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.sku}</td>
                <td class="table-actions">
                    <button class="btn-small danger" onclick="deleteProduct(${product.id})">Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showMessage(`Ошибка загрузки товаров: ${error.message}`, 'error');
    }
}

async function addProduct() {
    const name = document.getElementById('product-name').value.trim();
    const sku = document.getElementById('product-sku').value.trim();

    if (!name || !sku) {
        showMessage('Пожалуйста, заполните все поля', 'error');
        return;
    }

    try {
        await apiRequest('/products', 'POST', { name, sku });
        document.getElementById('product-name').value = '';
        document.getElementById('product-sku').value = '';
        await loadProducts();
        showMessage(`Товар "${name}" добавлен`, 'success');
    } catch (error) {
        showMessage(`Ошибка добавления товара: ${error.message}`, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm(`Удалить товар #${productId}? Все остатки по нему тоже удалятся.`)) return;

    try {
        await apiRequest(`/products/${productId}`, 'DELETE');
        await loadProducts();
        await loadStock();
        showMessage('Товар удалён', 'success');
    } catch (error) {
        showMessage(`Ошибка удаления товара: ${error.message}`, 'error');
    }
}

/* ==================== ОСТАТКИ ==================== */

async function loadStock() {
    try {
        const stock = await apiRequest('/stock');
        const tbody = document.querySelector('#stock-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!stock || stock.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-message">
                        Остатков нет. Добавьте запись!
                    </td>
                </tr>
            `;
            return;
        }

        const [stores, products] = await Promise.all([
            apiRequest('/stores'),
            apiRequest('/products'),
        ]);

        stock.forEach(item => {
            const store = stores.find(s => s.id === item.store_id);
            const product = products.find(p => p.id === item.product_id);

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${store ? `${store.name} (ID: ${store.id})` : `Магазин #${item.store_id}`}</td>
                <td>${product ? `${product.name} (SKU: ${product.sku})` : `Товар #${item.product_id}`}</td>
                <td>${item.quantity}</td>
                <td class="table-actions">
                    <button class="btn-small" onclick="updateStockPrompt(${item.store_id}, ${item.product_id})">✏️ Изменить</button>
                    <button class="btn-small danger" onclick="deleteStockItem(${item.store_id}, ${item.product_id})">🗑️ Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        showMessage(`Ошибка загрузки остатков: ${error.message}`, 'error');
    }
}

async function addStock() {
    const storeId = parseInt(document.getElementById('stock-store').value);
    const productId = parseInt(document.getElementById('stock-product').value);
    const quantity = parseInt(document.getElementById('stock-qty').value);

    if (!storeId || !productId || isNaN(quantity)) {
        showMessage('Заполните все поля корректными числами', 'error');
        return;
    }

    try {
        await apiRequest('/stock', 'POST', { store_id: storeId, product_id: productId, quantity });
        document.getElementById('stock-store').value = '';
        document.getElementById('stock-product').value = '';
        document.getElementById('stock-qty').value = '';
        await loadStock();
        showMessage('Остатки обновлены', 'success');
    } catch (error) {
        showMessage(`Ошибка обновления остатков: ${error.message}`, 'error');
    }
}

async function updateStockPrompt(storeId, productId) {
    const newQuantity = prompt('Введите новое количество:');
    if (newQuantity === null || newQuantity === '') return;

    const quantity = parseInt(newQuantity);
    if (isNaN(quantity)) {
        showMessage('Введите корректное число', 'error');
        return;
    }

    try {
        await apiRequest('/stock', 'POST', { store_id: storeId, product_id: productId, quantity });
        await loadStock();
        showMessage('Остатки обновлены', 'success');
    } catch (error) {
        showMessage(`Ошибка обновления: ${error.message}`, 'error');
    }
}

async function deleteStockItem(storeId, productId) {
    if (!confirm('Удалить запись об остатках?')) return;

    try {
        await apiRequest(`/stock?store_id=${storeId}&product_id=${productId}`, 'DELETE');
        await loadStock();
        showMessage('Запись удалена', 'success');
    } catch (error) {
        showMessage(`Ошибка удаления: ${error.message}`, 'error');
    }
}

async function clearAllData() {
    if (!confirm('⚠️ Это удалит ВСЕ данные (магазины, товары, остатки). Продолжить?')) return;

    try {
        await apiRequest('/clear', 'POST');
        await Promise.all([loadStores(), loadProducts(), loadStock()]);
        showMessage('Все данные очищены', 'success');
    } catch (error) {
        showMessage(`Ошибка очистки данных: ${error.message}`, 'error');
    }
}

/* ==================== ИНИЦИАЛИЗАЦИЯ ==================== */

async function loadAllData() {
    try {
        showMessage('Загрузка данных...', 'info');
        await Promise.all([loadStores(), loadProducts(), loadStock()]);
        showMessage('Система готова к работе', 'success');
    } catch (error) {
        showMessage(`Ошибка инициализации: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
});
