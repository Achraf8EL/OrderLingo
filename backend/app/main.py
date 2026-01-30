from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import inventory, menu, orders, restaurants, users
from app.core.config import settings
from app.core.security import CurrentUser, get_current_user


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
app.include_router(users.router)


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


@app.get("/debug/token")
async def debug_token(user: Annotated[CurrentUser, Depends(get_current_user)]):
    """Debug endpoint to inspect token payload."""
    return {
        "sub": user.sub,
        "username": user.preferred_username,
        "email": user.email,
        "roles": user.roles,
    }
