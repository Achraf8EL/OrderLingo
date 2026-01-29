from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import inventory, menu, orders, restaurants
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="OrderLingo API",
    description="Multi-tenant restaurant platform: menus, stock, orders.",
    version="0.1.0",
    openapi_url="/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(restaurants.router)
app.include_router(menu.router)
app.include_router(inventory.router)
app.include_router(orders.router)


@app.get("/")
async def root():
    return {
        "name": "OrderLingo API",
        "docs": "/docs",
        "health": "/health",
        "openapi": "/openapi.json",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
