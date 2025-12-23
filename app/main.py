from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

from sqlalchemy.orm import Session

from app.db import engine, SessionLocal
from app.models import Base, Store, Product, Stock


# ---------- ИНИЦИАЛИЗАЦИЯ ----------

app = FastAPI(title="Retail Inventory API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# создаём таблицы при старте приложения
Base.metadata.create_all(bind=engine)


# ---------- ЗАВИСИМОСТИ ----------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------- Pydantic модели ----------

class StoreBase(BaseModel):
    name: str
    city: str


class StoreOut(StoreBase):
    id: int

    class Config:
        orm_mode = True


class ProductBase(BaseModel):
    name: str
    sku: str


class ProductOut(ProductBase):
    id: int

    class Config:
        orm_mode = True


class StockBase(BaseModel):
    store_id: int
    product_id: int
    quantity: int


class StockOut(StockBase):
    class Config:
        orm_mode = True


# ---------- СЛУЖЕБНОЕ ----------

@app.get("/")
def root():
    return {"message": "Retail Inventory API работает"}


@app.get("/health")
def health():
    return {"status": "ok"}


# ---------- МАГАЗИНЫ ----------

@app.get("/stores", response_model=List[StoreOut])
def get_stores(db: Session = Depends(get_db)):
    return db.query(Store).all()


@app.post("/stores", response_model=StoreOut, status_code=201)
def create_store(store: StoreBase, db: Session = Depends(get_db)):
    db_store = Store(name=store.name, city=store.city)
    db.add(db_store)
    db.commit()
    db.refresh(db_store)
    return db_store


@app.delete("/stores/{store_id}", status_code=204)
def delete_store(store_id: int, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == store_id).first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    db.query(Stock).filter(Stock.store_id == store_id).delete()
    db.delete(store)
    db.commit()
    return


# ---------- ТОВАРЫ ----------

@app.get("/products", response_model=List[ProductOut])
def get_products(db: Session = Depends(get_db)):
    return db.query(Product).all()


@app.post("/products", response_model=ProductOut, status_code=201)
def create_product(product: ProductBase, db: Session = Depends(get_db)):
    exists = db.query(Product).filter(Product.sku == product.sku).first()
    if exists:
        raise HTTPException(status_code=400, detail="SKU already exists")

    db_product = Product(name=product.name, sku=product.sku)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@app.delete("/products/{product_id}", status_code=204)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    db.query(Stock).filter(Stock.product_id == product_id).delete()
    db.delete(product)
    db.commit()
    return


# ---------- ОСТАТКИ ----------

@app.get("/stock", response_model=List[StockOut])
def get_stock(
    store_id: Optional[int] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Stock)
    if store_id is not None:
        query = query.filter(Stock.store_id == store_id)
    if product_id is not None:
        query = query.filter(Stock.product_id == product_id)
    return query.all()


@app.post("/stock", response_model=StockOut, status_code=201)
def upsert_stock(item: StockBase, db: Session = Depends(get_db)):
    store = db.query(Store).filter(Store.id == item.store_id).first()
    product = db.query(Product).filter(Product.id == item.product_id).first()

    if not store or not product:
        raise HTTPException(status_code=400, detail="Store or Product not found")

    stock = (
        db.query(Stock)
        .filter(
            Stock.store_id == item.store_id,
            Stock.product_id == item.product_id
        )
        .first()
    )

    if stock:
        stock.quantity = item.quantity
    else:
        stock = Stock(
            store_id=item.store_id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(stock)

    db.commit()
    return stock


@app.delete("/stock", status_code=204)
def delete_stock(store_id: int, product_id: int, db: Session = Depends(get_db)):
    stock = (
        db.query(Stock)
        .filter(
            Stock.store_id == store_id,
            Stock.product_id == product_id
        )
        .first()
    )
    if not stock:
        raise HTTPException(status_code=404, detail="Stock item not found")

    db.delete(stock)
    db.commit()
    return


# ---------- DEV-ОЧИСТКА ----------

@app.post("/clear")
def clear_all(db: Session = Depends(get_db)):
    db.query(Stock).delete()
    db.query(Store).delete()
    db.query(Product).delete()
    db.commit()
    return {"message": "All data cleared"}
