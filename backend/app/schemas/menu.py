from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


# ============ Menu Category ============

class MenuCategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    display_order: int = 0
    is_active: bool = True


class MenuCategoryCreate(MenuCategoryBase):
    pass


class MenuCategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    display_order: int | None = None
    is_active: bool | None = None


class MenuCategoryRead(MenuCategoryBase):
    id: UUID
    restaurant_id: UUID

    model_config = {"from_attributes": True}


# ============ Option Group ============

class OptionGroupBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    min_select: int = Field(default=0, ge=0)  # 0 = optional
    max_select: int = Field(default=1, ge=1)  # 1 = single, n = multi
    is_active: bool = True


class OptionGroupCreate(OptionGroupBase):
    pass


class OptionGroupUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    min_select: int | None = Field(None, ge=0)
    max_select: int | None = Field(None, ge=1)
    is_active: bool | None = None


class OptionGroupRead(OptionGroupBase):
    id: UUID
    restaurant_id: UUID

    model_config = {"from_attributes": True}


# ============ Option Item ============

class OptionItemBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    price_extra: Decimal = Field(default=0, ge=0)
    is_active: bool = True


class OptionItemCreate(OptionItemBase):
    pass


class OptionItemUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    price_extra: Decimal | None = Field(None, ge=0)
    is_active: bool | None = None


class OptionItemRead(OptionItemBase):
    id: UUID
    group_id: UUID

    model_config = {"from_attributes": True}


# Full option group with items
class OptionGroupWithItems(OptionGroupRead):
    options: list[OptionItemRead] = []


# ============ Menu Item ============

class MenuItemBase(BaseModel):
    label: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    price: Decimal = Field(..., ge=0)
    image_url: str | None = None
    is_active: bool = True
    display_order: int = 0
    tags: list[str] | None = None
    ingredients: dict | list | None = None
    category_id: UUID | None = None
    option_group_ids: list[UUID] | None = None


class MenuItemCreate(MenuItemBase):
    pass


class MenuItemUpdate(BaseModel):
    label: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    price: Decimal | None = Field(None, ge=0)
    image_url: str | None = None
    is_active: bool | None = None
    display_order: int | None = None
    tags: list[str] | None = None
    ingredients: dict | list | None = None
    category_id: UUID | None = None
    option_group_ids: list[UUID] | None = None


class MenuItemRead(MenuItemBase):
    id: UUID
    restaurant_id: UUID

    model_config = {"from_attributes": True}


# Full menu item with category and option groups
class MenuItemFull(MenuItemRead):
    category: MenuCategoryRead | None = None
    option_groups: list[OptionGroupWithItems] = []
