const API_BASE = 'http://localhost:8000';

// Вспомогательные функции
function showMessage(text, type = 'info') {
    const msg = document.getElementById('status-message');
    if (!msg) {
        const wrapper = document.querySelector('.wrapper');
        const div = document.createElement('div');
        div.id = 'status-message';
        div.className = `status-message ${type}`;
        div.textContent = text;
        wrapper.insertBefore(div, wrapper.firstChild);
    } else {
        msg.className = `status-message ${type}`;
        msg.textContent = text;
    }

    if (type !== 'error') {
        setTimeout(() => {
            const msg = document.getElementById('status-message');
            if (msg) msg.remove();
        }, 3000);
    }
}

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

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(error.detail || `HTTP ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/* ==================== МАГАЗИНЫ ==================== */

async function loadStores() {
    try {
        const stores = await apiRequest('/stores');
        const tbody = document.querySelector('#stores-table tbody');

        if (!tbody) {
            console.error('Stores table tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (stores.length === 0) {
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
                    <button class="btn-small" onclick="deleteStore(${store.id})">🗑️ Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        showMessage(`Загружено ${stores.length} магазинов`, 'success');
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

        // Очищаем поля
        document.getElementById('store-name').value = '';
        document.getElementById('store-city').value = '';

        // Обновляем таблицу
        await loadStores();
        showMessage(`Магазин "${name}" успешно добавлен`, 'success');
    } catch (error) {
        showMessage(`Ошибка добавления магазина: ${error.message}`, 'error');
    }
}

async function deleteStore(storeId) {
    if (!confirm(`Удалить магазин #${storeId}? Это также удалит все связанные остатки.`)) {
        return;
    }

    try {
        // Сначала удаляем остатки для этого магазина
        const stock = await apiRequest(`/stock?store_id=${storeId}`);
        for (const item of stock) {
            await apiRequest(`/stock?store_id=${storeId}&product_id=${item.product_id}`, 'DELETE');
        }

        // Удаляем магазин из базы
        const stores = await apiRequest('/stores');
        const index = stores.findIndex(s => s.id === storeId);
        if (index !== -1) {
            stores.splice(index, 1);
        }

        await loadStores();
        await loadStock();
        showMessage('Магазин удален', 'success');
    } catch (error) {
        showMessage(`Ошибка удаления магазина: ${error.message}`, 'error');
    }
}

/* ==================== ТОВАРЫ ==================== */

async function loadProducts() {
    try {
        const products = await apiRequest('/products');
        const tbody = document.querySelector('#products-table tbody');

        if (!tbody) {
            console.error('Products table tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (products.length === 0) {
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
                    <button class="btn-small" onclick="deleteProduct(${product.id})">🗑️ Удалить</button>
                </td>
            `;
            tbody.appendChild(row);
        });

        showMessage(`Загружено ${products.length} товаров`, 'success');
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

        // Очищаем поля
        document.getElementById('product-name').value = '';
        document.getElementById('product-sku').value = '';

        // Обновляем таблицу
        await loadProducts();
        showMessage(`Товар "${name}" успешно добавлен`, 'success');
    } catch (error) {
        showMessage(`Ошибка добавления товара: ${error.message}`, 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm(`Удалить товар #${productId}? Это также удалит все связанные остатки.`)) {
        return;
    }

    try {
        // Сначала удаляем остатки для этого товара
        const stock = await apiRequest(`/stock?product_id=${productId}`);
        for (const item of stock) {
            await apiRequest(`/stock?store_id=${item.store_id}&product_id=${productId}`, 'DELETE');
        }

        // Удаляем товар из базы
        const products = await apiRequest('/products');
        const index = products.findIndex(p => p.id === productId);
        if (index !== -1) {
            products.splice(index, 1);
        }

        await loadProducts();
        await loadStock();
        showMessage('Товар удален', 'success');
    } catch (error) {
        showMessage(`Ошибка удаления товара: ${error.message}`, 'error');
    }
}

/* ==================== ОСТАТКИ ==================== */

async function loadStock() {
    try {
        const stock = await apiRequest('/stock');
        const tbody = document.querySelector('#stock-table tbody');

        if (!tbody) {
            console.error('Stock table tbody not found');
            return;
        }

        tbody.innerHTML = '';

        if (stock.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-message">
                        Остатков нет. Добавьте первую запись!
                    </td>
                </tr>
            `;
            return;
        }

        // Получаем данные магазинов и товаров для отображения названий
        const [stores, products] = await Promise.all([
            apiRequest('/stores'),
            apiRequest('/products')
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

        showMessage(`Загружено ${stock.length} записей об остатках`, 'success');
    } catch (error) {
        showMessage(`Ошибка загрузки остатков: ${error.message}`, 'error');
    }
}

async function addStock() {
    const storeId = parseInt(document.getElementById('stock-store').value);
    const productId = parseInt(document.getElementById('stock-product').value);
    const quantity = parseInt(document.getElementById('stock-qty').value);

    if (!storeId || !productId || isNaN(quantity)) {
        showMessage('Пожалуйста, заполните все поля корректными числами', 'error');
        return;
    }

    try {
        await apiRequest('/stock', 'POST', {
            store_id: storeId,
            product_id: productId,
            quantity: quantity
        });

        // Очищаем поля
        document.getElementById('stock-store').value = '';
        document.getElementById('stock-product').value = '';
        document.getElementById('stock-qty').value = '';

        // Обновляем таблицу
        await loadStock();
        showMessage('Остатки успешно обновлены', 'success');
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
        await apiRequest('/stock', 'POST', {
            store_id: storeId,
            product_id: productId,
            quantity: quantity
        });

        await loadStock();
        showMessage('Остатки обновлены', 'success');
    } catch (error) {
        showMessage(`Ошибка обновления: ${error.message}`, 'error');
    }
}

async function deleteStockItem(storeId, productId) {
    if (!confirm('Удалить запись об остатках?')) {
        return;
    }

    try {
        await apiRequest(`/stock?store_id=${storeId}&product_id=${productId}`, 'DELETE');
        await loadStock();
        showMessage('Запись удалена', 'success');
    } catch (error) {
        showMessage(`Ошибка удаления: ${error.message}`, 'error');
    }
}

async function clearAllData() {
    if (!confirm('⚠️ ВНИМАНИЕ! Это удалит ВСЕ данные (магазины, товары, остатки). Продолжить?')) {
        return;
    }

    try {
        await apiRequest('/clear', 'POST');

        // Обновляем все таблицы
        await Promise.all([
            loadStores(),
            loadProducts(),
            loadStock()
        ]);

        showMessage('Все данные успешно очищены', 'success');
    } catch (error) {
        showMessage(`Ошибка очистки данных: ${error.message}`, 'error');
    }
}

/* ==================== ИНИЦИАЛИЗАЦИЯ ==================== */

async function loadAllData() {
    try {
        showMessage('Загрузка данных...', 'info');

        await Promise.all([
            loadStores(),
            loadProducts(),
            loadStock()
        ]);

        showMessage('Система готова к работе', 'success');
    } catch (error) {
        showMessage(`Ошибка инициализации: ${error.message}. Проверьте, запущен ли сервер на ${API_BASE}`, 'error');
    }
}

// Загружаем данные при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем наличие необходимых элементов
    const requiredElements = [
        'stores-table', 'products-table', 'stock-table',
        'store-name', 'store-city', 'product-name', 'product-sku',
        'stock-store', 'stock-product', 'stock-qty'
    ];

    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
        console.error('Missing elements:', missingElements);
        showMessage('Ошибка: не все необходимые элементы найдены на странице', 'error');
        return;
    }

    // Загружаем данные
    loadAllData();
});