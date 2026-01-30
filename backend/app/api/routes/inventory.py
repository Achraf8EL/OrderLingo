from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.inventory import InventoryItem, InventoryLevel

from app.api.deps import get_restaurant_or_404, require_restaurant_manager, require_restaurant_staff
from app.core.security import CurrentUser
from app.schemas.inventory import (
    AvailabilityResponse,
    InventoryItemCreate,
    InventoryItemRead,
    InventoryLevelRead,
    InventoryLevelUpsert,
)
from app.services.stock import get_availability

router = APIRouter(prefix="/restaurants/{restaurant_id}", tags=["inventory"])


async def _get_inventory_item_or_404(
    db: AsyncSession, restaurant_id: UUID, item_id: UUID
) -> InventoryItem:
    r = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id,
            InventoryItem.restaurant_id == restaurant_id,
        )
    )
    m = r.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return m


@router.get("/inventory/items")
async def list_inventory_items(
    restaurant_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)
    ],
) -> list:
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    r = await db.execute(
        select(InventoryItem)
        .where(InventoryItem.restaurant_id == restaurant_id)
        .options(selectinload(InventoryItem.levels))
    )
    items = list(r.scalars().all())
    return [InventoryItemRead.model_validate(i) for i in items]


@router.post(
    "/inventory/items",
    response_model=InventoryItemRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_inventory_item(
    restaurant_id: UUID,
    payload: InventoryItemCreate,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> InventoryItem:
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    item = InventoryItem(
        restaurant_id=restaurant_id,
        name=payload.name,
        unit=payload.unit,
    )
    db.add(item)
    await db.flush()
    level = InventoryLevel(inventory_item_id=item.id, quantity=0.0, in_stock=True)
    db.add(level)
    await db.flush()
    r = await db.execute(
        select(InventoryItem)
        .where(InventoryItem.id == item.id)
        .options(selectinload(InventoryItem.levels))
    )
    return r.scalars().one()


@router.put(
    "/inventory/items/{item_id}/levels",
    response_model=InventoryLevelRead,
)
async def upsert_inventory_level(
    restaurant_id: UUID,
    item_id: UUID,
    payload: InventoryLevelUpsert,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> InventoryLevel:
    db, _ = db_user
    inv = await _get_inventory_item_or_404(db, restaurant_id, item_id)
    r = await db.execute(
        select(InventoryLevel).where(InventoryLevel.inventory_item_id == inv.id)
    )
    level = r.scalar_one_or_none()
    if not level:
        level = InventoryLevel(
            inventory_item_id=inv.id,
            quantity=payload.quantity,
            in_stock=payload.in_stock,
        )
        db.add(level)
        await db.flush()
    else:
        level.quantity = payload.quantity
        level.in_stock = payload.in_stock
    return level


@router.get("/availability", response_model=AvailabilityResponse)
async def get_availability_endpoint(
    restaurant_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)
    ],
) -> AvailabilityResponse:
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    return await get_availability(db, restaurant_id)
