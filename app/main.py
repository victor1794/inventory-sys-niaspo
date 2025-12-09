from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware
app = FastAPI(
    title="Retail Inventory Service",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для разработки можно разрешить все
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================
#   СХЕМЫ (Pydantic-модели)
# ==========================

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


# ==========================
#   "БАЗА ДАННЫХ" В ПАМЯТИ
# ==========================

stores: List[Store] = []
products: List[Product] = []
stock: List[StockItem] = []

_store_id_seq = 1
_product_id_seq = 1


def get_next_store_id() -> int:
    """
    Генерация следующего ID для магазина.
    """
    global _store_id_seq
    value = _store_id_seq
    _store_id_seq += 1
    return value


def get_next_product_id() -> int:
    """
    Генерация следующего ID для товара.
    """
    global _product_id_seq
    value = _product_id_seq
    _product_id_seq += 1
    return value


def reset_state_for_tests():
    """
    Хелпер, чтобы удобно сбрасывать состояние в тестах/разработке.
    Используется в тестах и в dev-эндпоинте.
    """
    global _store_id_seq, _product_id_seq

    stores.clear()
    products.clear()
    stock.clear()

    _store_id_seq = 1
    _product_id_seq = 1


# ==========================
#   СЛУЖЕБНЫЙ ЭНДПОЙНТ
# ==========================

@app.get("/health")
def health_check():
    return {"status": "ok"}


# ==========================
#   CRUD ПО ФИЛИАЛАМ
# ==========================

@app.get("/stores", response_model=List[Store])
def list_stores():
    """
    Получить список всех магазинов.
    """
    return stores


@app.post("/stores", response_model=Store, status_code=201)
def create_store(store_in: StoreCreate):
    """
    Создать новый магазин.
    """
    # В pydantic v2 .model_dump() вместо .dict()
    data = store_in.model_dump()
    new_store = Store(id=get_next_store_id(), **data)
    stores.append(new_store)
    return new_store


# ==========================
#   CRUD ПО ТОВАРАМ
# ==========================

@app.get("/products", response_model=List[Product])
def list_products():
    """
    Получить список всех товаров.
    """
    return products


@app.post("/products", response_model=Product, status_code=201)
def create_product(product_in: ProductCreate):
    """
    Создать новый товар.
    """
    data = product_in.model_dump()
    new_product = Product(id=get_next_product_id(), **data)
    products.append(new_product)
    return new_product


# ==========================
#   ОСТАТКИ (STOCK)
# ==========================

@app.get("/stock", response_model=List[StockItem])
def list_stock(
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
):
    """
    Получить остатки по всем магазинам / товарам.
    Можно фильтровать по store_id и/или product_id.
    """
    result = stock

    if store_id is not None:
        result = [s for s in result if s.store_id == store_id]

    if product_id is not None:
        result = [s for s in result if s.product_id == product_id]

    return result


@app.post("/stock", response_model=StockItem, status_code=201)
def upsert_stock(item_in: StockItemCreate):
    """
    Обновить или создать запись по остаткам для пары (store_id, product_id).
    Если такой записи нет — создаётся новая.
    Если есть — обновляется quantity.
    """

    # Проверяем, что магазин существует
    if not any(s.id == item_in.store_id for s in stores):
        raise HTTPException(status_code=400, detail="Store not found")

    # Проверяем, что товар существует
    if not any(p.id == item_in.product_id for p in products):
        raise HTTPException(status_code=400, detail="Product not found")

    # Ищем существующую запись
    for item in stock:
        if item.store_id == item_in.store_id and item.product_id == item_in.product_id:
            item.quantity = item_in.quantity
            return item

    # Если не нашли — создаём новую
    data = item_in.model_dump()
    new_item = StockItem(**data)
    stock.append(new_item)
    return new_item


# ==========================
#   DEV-ЭНДПОЙНТ ДЛЯ ОЧИСТКИ
# ==========================

@app.post("/dev/reset", tags=["dev"])
def dev_reset():
    """
    Полная очистка всей оперативной "базы данных".
    Без аутентификации, чисто для разработки/тестов.
    """
    reset_state_for_tests()
    return {"status": "ok", "message": "All in-memory data cleared"}


@app.delete("/stock", status_code=200)
def delete_stock_item(store_id: int, product_id: int):
    """
    Удалить запись об остатках.
    """
    for i, item in enumerate(stock):
        if item.store_id == store_id and item.product_id == product_id:
            del stock[i]
            return {"status": "deleted"}

    raise HTTPException(status_code=404, detail="Stock item not found")