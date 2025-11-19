const API_BASE = "/api";

async function loadStores() {
  const res = await fetch(`${API_BASE}/stores`);
  const data = await res.json();
  document.getElementById("stores").innerHTML = data
    .map(s => `<li>${s.id}: ${s.name} (${s.city})</li>`)
    .join("");
}

async function loadProducts() {
  const res = await fetch(`${API_BASE}/products`);
  const data = await res.json();
  document.getElementById("products").innerHTML = data
    .map(p => `<li>${p.id}: ${p.name} (${p.sku})</li>`)
    .join("");
}

async function loadStock() {
  const storeId = document.getElementById("storeIdInput").value;
  const res = await fetch(`${API_BASE}/stock?store_id=${storeId}`);
  const data = await res.json();
  document.getElementById("stock").innerHTML = data
    .map(s => `<li>Product ${s.product_id}: ${s.quantity}</li>`)
    .join("");
}
