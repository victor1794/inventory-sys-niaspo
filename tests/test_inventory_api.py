import os
import sys

# ==== магия, чтобы работал import app.main ====
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(CURRENT_DIR)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)
# ==============================================

from fastapi.testclient import TestClient
from app.main import app, reset_state_for_tests
import pytest


from app.main import app, reset_state_for_tests

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear_state():
    """
    Этот фикстур выполняется перед КАЖДЫМ тестом.
    Он сбрасывает внутреннее состояние сервиса.
    """
    reset_state_for_tests()


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_create_and_list_stores():
    # Изначально пусто
    response = client.get("/stores")
    assert response.status_code == 200
    assert response.json() == []

    # Создаём филиал
    payload = {"name": "Магазин №1", "city": "Москва"}
    response = client.post("/stores", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == payload["name"]
    assert data["city"] == payload["city"]

    # Проверяем, что он появился в списке
    response = client.get("/stores")
    assert response.status_code == 200
    stores = response.json()
    assert len(stores) == 1
    assert stores[0]["id"] == 1


def test_create_and_list_products():
    response = client.get("/products")
    assert response.status_code == 200
    assert response.json() == []

    payload = {"name": "Товар А", "sku": "SKU-001"}
    response = client.post("/products", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["id"] == 1
    assert data["name"] == payload["name"]
    assert data["sku"] == payload["sku"]

    response = client.get("/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) == 1
    assert products[0]["id"] == 1


def test_stock_upsert_and_filter():
    # Сначала создаём филиал и товар
    store_payload = {"name": "Магазин №1", "city": "Москва"}
    product_payload = {"name": "Товар А", "sku": "SKU-001"}

    store = client.post("/stores", json=store_payload).json()
    product = client.post("/products", json=product_payload).json()

    # Добавляем остатки
    stock_payload = {
        "store_id": store["id"],
        "product_id": product["id"],
        "quantity": 10,
    }
    response = client.post("/stock", json=stock_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["quantity"] == 10

    # Обновляем остатки
    stock_payload["quantity"] = 25
    response = client.post("/stock", json=stock_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["quantity"] == 25

    # Проверяем фильтрацию по store_id
    response = client.get(f"/stock?store_id={store['id']}")
    assert response.status_code == 200
    items = response.json()
    assert len(items) == 1
    assert items[0]["store_id"] == store["id"]
    assert items[0]["product_id"] == product["id"]
    assert items[0]["quantity"] == 25


def test_stock_fails_if_store_not_exists():
    # Есть товар, но нет магазина
    product_payload = {"name": "Товар А", "sku": "SKU-001"}
    product = client.post("/products", json=product_payload).json()

    stock_payload = {
        "store_id": 999,  # несуществующий
        "product_id": product["id"],
        "quantity": 5,
    }
    response = client.post("/stock", json=stock_payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Store not found"


def test_stock_fails_if_product_not_exists():
    # Есть магазин, но нет товара
    store_payload = {"name": "Магазин №1", "city": "Москва"}
    store = client.post("/stores", json=store_payload).json()

    stock_payload = {
        "store_id": store["id"],
        "product_id": 999,  # несуществующий
        "quantity": 5,
    }
    response = client.post("/stock", json=stock_payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Product not found"
