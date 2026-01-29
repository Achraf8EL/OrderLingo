from uuid import UUID

from pydantic import BaseModel, Field


class InventoryItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    unit: str = Field(default="unit", max_length=32)


class InventoryItemCreate(InventoryItemBase):
    pass


class InventoryLevelUpsert(BaseModel):
    quantity: float = Field(..., ge=0)
    in_stock: bool = True


class InventoryLevelRead(BaseModel):
    id: UUID
    inventory_item_id: UUID
    quantity: float
    in_stock: bool

    model_config = {"from_attributes": True}


class InventoryItemRead(InventoryItemBase):
    id: UUID
    restaurant_id: UUID
    levels: list[InventoryLevelRead] = []

    model_config = {"from_attributes": True}


class AvailabilityItem(BaseModel):
    menu_item_id: UUID
    label: str
    available: bool
    reason: str | None = None
    substitutions: list[dict] = Field(default_factory=list)


class AvailabilityResponse(BaseModel):
    restaurant_id: UUID
    items: list[AvailabilityItem]
