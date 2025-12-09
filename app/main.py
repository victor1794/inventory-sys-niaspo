from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="Retail Inventory API")

# --- CORS, чтобы фронт мог ходить на http://localhost:8000 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # можно сузить до ["http://localhost"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- МОДЕЛИ ----------

class StoreBase(BaseModel):
    name: str
    city: str


class Store(StoreBase):
    id: int


class ProductBase(BaseModel):
    name: str
    sku: str


class Product(ProductBase):
    id: int


class StockBase(BaseModel):
    store_id: int
    product_id: int
    quantity: int


class StockItem(StockBase):
    pass


# ---------- "БАЗА ДАННЫХ" В ПАМЯТИ ----------

stores_db: List[Store] = []
products_db: List[Product] = []
stock_db: List[StockItem] = []

store_id_counter = 1
product_id_counter = 1


# ---------- СЛУЖЕБНОЕ ----------

@app.get("/")
def read_root():
    return {"message": "Retail API работает!"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


# ---------- МАГАЗИНЫ ----------

@app.get("/stores", response_model=List[Store])
def get_stores():
    return stores_db


@app.post("/stores", response_model=Store, status_code=201)
def create_store(store: StoreBase):
    global store_id_counter
    new_store = Store(id=store_id_counter, **store.dict())
    store_id_counter += 1
    stores_db.append(new_store)
    return new_store


@app.delete("/stores/{store_id}", status_code=204)
def delete_store(store_id: int):
    """
    Удаляем магазин и все связанные с ним остатки.
    """
    global stores_db, stock_db

    # магазин
    before = len(stores_db)
    stores_db = [s for s in stores_db if s.id != store_id]
    if len(stores_db) == before:
        raise HTTPException(status_code=404, detail="Store not found")

    # связанные остатки
    stock_db = [item for item in stock_db if item.store_id != store_id]
    return


# ---------- ТОВАРЫ ----------

@app.get("/products", response_model=List[Product])
def get_products():
    return products_db


@app.post("/products", response_model=Product, status_code=201)
def create_product(product: ProductBase):
    global product_id_counter
    new_product = Product(id=product_id_counter, **product.dict())
    product_id_counter += 1
    products_db.append(new_product)
    return new_product


@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int):
    """
    Удаляем товар и все связанные с ним остатки.
    """
    global products_db, stock_db

    before = len(products_db)
    products_db = [p for p in products_db if p.id != product_id]
    if len(products_db) == before:
        raise HTTPException(status_code=404, detail="Product not found")

    stock_db = [item for item in stock_db if item.product_id != product_id]
    return


# ---------- ОСТАТКИ ----------

@app.get("/stock", response_model=List[StockItem])
def get_stock(store_id: Optional[int] = None, product_id: Optional[int] = None):
    result = stock_db

    if store_id is not None:
        result = [item for item in result if item.store_id == store_id]
    if product_id is not None:
        result = [item for item in result if item.product_id == product_id]

    return result


@app.post("/stock", response_model=StockItem, status_code=201)
def upsert_stock(item: StockBase):
    # Проверяем существование магазина
    if not any(s.id == item.store_id for s in stores_db):
        raise HTTPException(status_code=400, detail="Store not found")

    # Проверяем существование товара
    if not any(p.id == item.product_id for p in products_db):
        raise HTTPException(status_code=400, detail="Product not found")

    # Ищем существующую запись
    for stock_item in stock_db:
        if stock_item.store_id == item.store_id and stock_item.product_id == item.product_id:
            stock_item.quantity = item.quantity
            return stock_item

    # Если не нашли, добавляем новую
    new_item = StockItem(**item.dict())
    stock_db.append(new_item)
    return new_item


@app.delete("/stock", status_code=204)
def delete_stock(store_id: int, product_id: int):
    """
    Удалить запись об остатках по паре (store_id, product_id)
    """
    for i, item in enumerate(stock_db):
        if item.store_id == store_id and item.product_id == product_id:
            del stock_db[i]
            return
    raise HTTPException(status_code=404, detail="Stock item not found")


# ---------- ПОЛНАЯ ОЧИСТКА ДЛЯ ДЕВА ----------

@app.post("/clear")
def clear_all():
    global stores_db, products_db, stock_db
    global store_id_counter, product_id_counter

    stores_db.clear()
    products_db.clear()
    stock_db.clear()

    store_id_counter = 1
    product_id_counter = 1

    return {"message": "All data cleared"}
