from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

# Разрешить CORS для фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Раздаем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")


# Модели данных
class StoreCreate(BaseModel):
    name: str
    city: str


class Store(StoreCreate):
    id: int


class ProductCreate(BaseModel):
    name: str
    sku: str


class Product(ProductCreate):
    id: int


class StockItemCreate(BaseModel):
    store_id: int
    product_id: int
    quantity: int


class StockItem(StockItemCreate):
    pass


# "База данных" в памяти
stores_db = []
products_db = []
stock_db = []

store_id_counter = 1
product_id_counter = 1


@app.get("/")
def read_root():
    return {"message": "Retail API работает!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# Магазины
@app.get("/stores")
def get_stores():
    return stores_db


@app.post("/stores")
def create_store(store: StoreCreate):
    global store_id_counter
    new_store = Store(
        id=store_id_counter,
        name=store.name,
        city=store.city
    )
    store_id_counter += 1
    stores_db.append(new_store)
    return new_store


# Товары
@app.get("/products")
def get_products():
    return products_db


@app.post("/products")
def create_product(product: ProductCreate):
    global product_id_counter
    new_product = Product(
        id=product_id_counter,
        name=product.name,
        sku=product.sku
    )
    product_id_counter += 1
    products_db.append(new_product)
    return new_product


# Остатки
@app.get("/stock")
def get_stock(store_id: Optional[int] = None, product_id: Optional[int] = None):
    result = stock_db

    if store_id is not None:
        result = [item for item in result if item.store_id == store_id]

    if product_id is not None:
        result = [item for item in result if item.product_id == product_id]

    return result


@app.post("/stock")
def update_stock(item: StockItemCreate):
    # Проверяем существование магазина
    if not any(s.id == item.store_id for s in stores_db):
        raise HTTPException(status_code=400, detail="Store not found")

    # Проверяем существование товара
    if not any(p.id == item.product_id for p in products_db):
        raise HTTPException(status_code=400, detail="Product not found")

    # Ищем существующую запись
    for i, stock_item in enumerate(stock_db):
        if stock_item.store_id == item.store_id and stock_item.product_id == item.product_id:
            stock_db[i].quantity = item.quantity
            return stock_db[i]

    # Если не нашли, добавляем новую
    new_item = StockItem(**item.model_dump())
    stock_db.append(new_item)
    return new_item


# Удалить остатки
@app.delete("/stock")
def delete_stock(store_id: int, product_id: int):
    for i, item in enumerate(stock_db):
        if item.store_id == store_id and item.product_id == product_id:
            del stock_db[i]
            return {"message": "Stock item deleted"}

    raise HTTPException(status_code=404, detail="Stock item not found")


# Очистка для тестов
@app.post("/clear")
def clear_all():
    global store_id_counter, product_id_counter
    stores_db.clear()
    products_db.clear()
    stock_db.clear()
    store_id_counter = 1
    product_id_counter = 1
    return {"message": "All data cleared"}