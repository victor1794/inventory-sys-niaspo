const API = "http://localhost:8000";

async function loadTables() {
    loadStores();
    loadProducts();
    loadStock();
}

async function loadStores() {
    let res = await fetch(`${API}/stores`);
    let data = await res.json();

    let tbody = document.querySelector("#stores-table tbody");
    tbody.innerHTML = "";
    data.forEach(s => {
        tbody.innerHTML += `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.city}</td></tr>`;
    });
}

async function loadProducts() {
    let res = await fetch(`${API}/products`);
    let data = await res.json();

    let tbody = document.querySelector("#products-table tbody");
    tbody.innerHTML = "";
    data.forEach(p => {
        tbody.innerHTML += `<tr><td>${p.id}</td><td>${p.name}</td><td>${p.sku}</td></tr>`;
    });
}

async function loadStock() {
    let res = await fetch(`${API}/stock`);
    let data = await res.json();

    let tbody = document.querySelector("#stock-table tbody");
    tbody.innerHTML = "";
    data.forEach(s => {
        tbody.innerHTML += `<tr><td>${s.store_id}</td><td>${s.product_id}</td><td>${s.quantity}</td></tr>`;
    });
}

// === ACTIONS ===

async function addStore() {
    let name = document.getElementById("store-name").value;
    let city = document.getElementById("store-city").value;

    await fetch(`${API}/stores`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, city})
    });

    loadTables();
}

async function addProduct() {
    let name = document.getElementById("product-name").value;
    let sku = document.getElementById("product-sku").value;

    await fetch(`${API}/products`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({name, sku})
    });

    loadTables();
}

async function addStock() {
    let store_id = Number(document.getElementById("stock-store").value);
    let product_id = Number(document.getElementById("stock-product").value);
    let quantity = Number(document.getElementById("stock-qty").value);

    await fetch(`${API}/stock`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({store_id, product_id, quantity})
    });

    loadTables();
}

loadTables();
