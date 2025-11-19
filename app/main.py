from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Retail Inventory Service",
)




class StoreCreate(BaseModel):
    name: str
    city: str


class Store(StoreCreate):
    id: int


class ProductCreate(BaseModel):
    name: str
    sku: str  # уникальный код товара (артикул)


class Product(ProductCreate):
    id: int


class StockItemCreate(BaseModel):
    store_id: int
    product_id: int
    quantity: int


class StockItem(StockItemCreate):
    pass


# ==== "База данных" в памяти ====

stores: List[Store] = []
products: List[Product] = []
stock: List[StockItem] = []

_store_id_seq = 1
_product_id_seq = 1


def get_next_store_id() -> int:
    global _store_id_seq
    value = _store_id_seq
    _store_id_seq += 1
    return value


def get_next_product_id() -> int:
    global _product_id_seq
    value = _product_id_seq
    _product_id_seq += 1
    return value


def reset_state_for_tests():
    """
    Хелпер, чтобы удобно сбрасывать состояние в тестах.
    В боевом коде не используется, только для pytest.
    """
    global _store_id_seq, _product_id_seq
    stores.clear()
    products.clear()
    stock.clear()
    _store_id_seq = 1
    _product_id_seq = 1


# ==== Служебный эндпоинт ====


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ==== CRUD по филиалам ====


@app.get("/stores", response_model=List[Store])
def list_stores():
    return stores


@app.post("/stores", response_model=Store, status_code=201)
def create_store(store_in: StoreCreate):
    new_store = Store(id=get_next_store_id(), **store_in.dict())
    stores.append(new_store)
    return new_store


# ==== CRUD по товарам ====


@app.get("/products", response_model=List[Product])
def list_products():
    return products


@app.post("/products", response_model=Product, status_code=201)
def create_product(product_in: ProductCreate):
    new_product = Product(id=get_next_product_id(), **product_in.dict())
    products.append(new_product)
    return new_product


# ==== Остатки (stock) ====


@app.get("/stock", response_model=List[StockItem])
def list_stock(
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
):
    result = stock
    if store_id is not None:
        result = [s for s in result if s.store_id == store_id]
    if product_id is not None:
        result = [s for s in result if s.product_id == product_id]
    return result


@app.post("/stock", response_model=StockItem, status_code=201)
def upsert_stock(item_in: StockItemCreate):
    # Проверяем, что филиал и товар существуют
    if not any(s.id == item_in.store_id for s in stores):
        raise HTTPException(status_code=400, detail="Store not found")
    if not any(p.id == item_in.product_id for p in products):
        raise HTTPException(status_code=400, detail="Product not found")

    # Ищем существующую запись по паре (store_id, product_id)
    for item in stock:
        if item.store_id == item_in.store_id and item.product_id == item_in.product_id:
            item.quantity = item_in.quantity
            return item

    # Если не нашли — создаём новую
    new_item = StockItem(**item_in.dict())
    stock.append(new_item)
    return new_item

@app.post("/dev/reset", tags=["dev"])
def reset_all():
    """
    Полная очистка всей оперативной памяти API.
    Без защиты. Только для разработки.
    """
    global stores, products, stock_items, store_id_counter, product_id_counter

    stores.clear()
    products.clear()
    stock_items.clear()

    store_id_counter = 1
    product_id_counter = 1

    return {"status": "ok", "message": "All in-memory data cleared"}
