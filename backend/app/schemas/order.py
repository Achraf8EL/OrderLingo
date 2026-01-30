from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


ORDER_STATUSES = ("draft", "confirmed", "preparing", "ready", "delivered", "cancelled")


class OrderItemCreate(BaseModel):
    menu_item_id: UUID
    quantity: int = Field(..., ge=1)
    options: dict | list | None = None


class OrderCreate(BaseModel):
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderItemRead(BaseModel):
    id: UUID
    menu_item_id: UUID
    quantity: int
    unit_price: Decimal
    options: dict | list | None = None

    model_config = {"from_attributes": True}


class OrderRead(BaseModel):
    id: UUID
    restaurant_id: UUID
    status: str
    items: list[OrderItemRead] = []

    model_config = {"from_attributes": True}


class OrderList(BaseModel):
    orders: list[OrderRead]


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(confirmed|preparing|ready|delivered|cancelled)$")
