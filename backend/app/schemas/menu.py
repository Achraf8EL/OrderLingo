from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class MenuItemBase(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    price: Decimal = Field(..., ge=0)
    is_active: bool = True
    tags: list[str] | None = None
    ingredients: dict | list | None = None
    options: dict | list | None = None
    description: str | None = None


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=255)
    price: Decimal | None = Field(None, ge=0)
    is_active: bool | None = None
    tags: list[str] | None = None
    ingredients: dict | list | None = None
    options: dict | list | None = None
    description: str | None = None


class MenuItemRead(MenuItemBase):
    id: UUID
    restaurant_id: UUID

    model_config = {"from_attributes": True}
