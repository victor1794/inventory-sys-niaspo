/* ==================== ОБЩИЕ ФУНКЦИИ API ==================== */

async function apiGet(path) {
    try {
        const response = await fetch("http://localhost:8000" + path); // Явно указать адрес бэкенда
        if (!response.ok) throw new Error("HTTP " + response.status);
        return await response.json();
    } catch (err) {
        console.error("GET error:", err);
        alert("Ошибка запроса GET " + path);
        return [];
    }
}

async function apiPost(path, body) {
    try {
        const response = await fetch("http://localhost:8000" + path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error("HTTP " + response.status);
        return await response.json();
    } catch (err) {
        console.error("POST error:", err);
        alert("Ошибка POST " + path + ": " + err);
        return null;
    }
}

/* ==================== ФИЛИАЛЫ ==================== */

async function loadStoresTable() {
    const stores = await apiGet("/stores");
    const tbody = document.querySelector("#stores-table tbody");
    tbody.innerHTML = "";

    if (stores.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3'>Нет филиалов</td></tr>";
        return;
    }

    stores.forEach(store => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${store.id}</td>
            <td>${store.name}</td>
            <td>${store.city}</td>
        `;
        tbody.appendChild(row);
    });
}

async function addStore() {
    const name = document.getElementById("store-name").value;
    const city = document.getElementById("store-city").value;

    if (!name || !city) {
        alert("Заполните все поля!");
        return;
    }

    const result = await apiPost("/stores", { name, city });
    if (result) {
        document.getElementById("store-name").value = "";
        document.getElementById("store-city").value = "";
        await loadStoresTable();
        alert("Магазин добавлен!");
    }
}

/* ==================== ТОВАРЫ ==================== */

async function loadProductsTable() {
    const products = await apiGet("/products");
    const tbody = document.querySelector("#products-table tbody");
    tbody.innerHTML = "";

    if (products.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3'>Нет товаров</td></tr>";
        return;
    }

    products.forEach(product => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>${product.sku}</td>
        `;
        tbody.appendChild(row);
    });
}

async function addProduct() {
    const name = document.getElementById("product-name").value;
    const sku = document.getElementById("product-sku").value;

    if (!name || !sku) {
        alert("Заполните все поля!");
        return;
    }

    const result = await apiPost("/products", { name, sku });
    if (result) {
        document.getElementById("product-name").value = "";
        document.getElementById("product-sku").value = "";
        await loadProductsTable();
        alert("Товар добавлен!");
    }
}

/* ==================== ОСТАТКИ ==================== */

async function loadStockTable() {
    const stock = await apiGet("/stock");
    const tbody = document.querySelector("#stock-table tbody");
    tbody.innerHTML = "";

    if (stock.length === 0) {
        tbody.innerHTML = "<tr><td colspan='4'>Остатков нет</td></tr>";
        return;
    }

    // Для отображения названий вместо ID
    const stores = await apiGet("/stores");
    const products = await apiGet("/products");

    stock.forEach(item => {
        const store = stores.find(s => s.id === item.store_id);
        const product = products.find(p => p.id === item.product_id);
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${store ? store.name : `ID ${item.store_id}`}</td>
            <td>${product ? product.name : `ID ${item.product_id}`}</td>
            <td>${item.quantity} шт.</td>
            <td>
                <button onclick="updateStock(${item.store_id}, ${item.product_id})">Изменить</button>
                <button onclick="deleteStock(${item.store_id}, ${item.product_id})">Удалить</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addStock() {
    const storeId = document.getElementById("stock-store").value;
    const productId = document.getElementById("stock-product").value;
    const quantity = document.getElementById("stock-qty").value;

    if (!storeId || !productId || !quantity) {
        alert("Заполните все поля!");
        return;
    }

    const result = await apiPost("/stock", {
        store_id: parseInt(storeId),
        product_id: parseInt(productId),
        quantity: parseInt(quantity)
    });
    
    if (result) {
        document.getElementById("stock-store").value = "";
        document.getElementById("stock-product").value = "";
        document.getElementById("stock-qty").value = "";
        await loadStockTable();
        alert("Остатки обновлены!");
    }
}

async function updateStock(storeId, productId) {
    const newQty = prompt("Введите новое количество:", "0");
    if (newQty === null) return;
    
    await apiPost("/stock", {
        store_id: storeId,
        product_id: productId,
        quantity: parseInt(newQty)
    });
    
    await loadStockTable();
}

async function deleteStock(storeId, productId) {
    if (!confirm("Удалить запись об остатках?")) return;
    
    try {
        // Добавьте в бэкенд эндпоинт DELETE /stock
        const response = await fetch(`http://localhost:8000/stock?store_id=${storeId}&product_id=${productId}`, {
            method: "DELETE"
        });
        
        if (response.ok) {
            await loadStockTable();
            alert("Запись удалена!");
        } else {
            alert("Ошибка удаления");
        }
    } catch (err) {
        console.error("Delete error:", err);
        alert("Ошибка удаления");
    }
}

/* ==================== ИНИЦИАЛИЗАЦИЯ ==================== */

async function loadAllData() {
    await loadStoresTable();
    await loadProductsTable();
    await loadStockTable();
}

// Загрузить данные при загрузке страницы
document.addEventListener('DOMContentLoaded', loadAllData);