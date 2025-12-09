async function apiGet(path) {
    try {
        const response = await fetch("/api" + path);
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
        const response = await fetch("/api" + path, {
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

async function loadStores() {
    const stores = await apiGet("/stores");

    const block = document.getElementById("stores-list");
    block.innerHTML = "";

    if (stores.length === 0) {
        block.innerHTML = "<p>Нет филиалов</p>";
        return;
    }

    stores.forEach(s => {
        const div = document.createElement("div");
        div.className = "item";
        div.textContent = `${s.id}. ${s.name} — ${s.city}`;
        block.appendChild(div);
    });
}

async function addStore() {
    const name = prompt("Название филиала:");
    const city = prompt("Город:");

    if (!name || !city) return;

    await apiPost("/stores", { name, city });
    await loadStores();
}

/* ==================== ТОВАРЫ ==================== */

async function loadProducts() {
    const products = await apiGet("/products");

    const block = document.getElementById("products-list");
    block.innerHTML = "";

    if (products.length === 0) {
        block.innerHTML = "<p>Нет товаров</p>";
        return;
    }

    products.forEach(p => {
        const div = document.createElement("div");
        div.className = "item";
        div.textContent = `${p.id}. ${p.name} (SKU: ${p.sku})`;
        block.appendChild(div);
    });
}

async function addProduct() {
    const name = prompt("Название товара:");
    const sku = prompt("SKU:");

    if (!name || !sku) return;

    await apiPost("/products", { name, sku });
    await loadProducts();
}

/* ==================== ОСТАТКИ ==================== */

async function showStock() {
    const storeId = document.getElementById("stock-store-id").value;
    if (!storeId) {
        alert("Введите ID филиала!");
        return;
    }

    const stock = await apiGet("/stock?store_id=" + storeId);

    const block = document.getElementById("stock-list");
    block.innerHTML = "";

    if (stock.length === 0) {
        block.innerHTML = "<p>Остатков нет</p>";
        return;
    }

    stock.forEach(item => {
        const div = document.createElement("div");
        div.className = "item";
        div.textContent = `Товар ${item.product_id}: ${item.quantity} шт.`;
        block.appendChild(div);
    });
}
