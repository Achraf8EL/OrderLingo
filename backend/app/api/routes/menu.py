from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_restaurant_or_404, require_restaurant_manager, require_restaurant_staff
from app.core.security import CurrentUser
from app.models.menu import MenuItem
from app.schemas.menu import MenuItemCreate, MenuItemRead, MenuItemUpdate

router = APIRouter(prefix="/restaurants/{restaurant_id}/menu", tags=["menu"])


async def _get_menu_item_or_404(
    db: AsyncSession, restaurant_id: UUID, item_id: UUID
) -> MenuItem:
    from fastapi import HTTPException

    r = await db.execute(
        select(MenuItem).where(
            MenuItem.id == item_id,
            MenuItem.restaurant_id == restaurant_id,
        )
    )
    m = r.scalar_one_or_none()
    if not m:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return m


@router.post("/items", response_model=MenuItemRead, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    restaurant_id: UUID,
    payload: MenuItemCreate,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> MenuItem:
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    item = MenuItem(
        restaurant_id=restaurant_id,
        label=payload.label,
        price=payload.price,
        is_active=payload.is_active,
        tags=payload.tags,
        ingredients=payload.ingredients,
        options=payload.options,
        description=payload.description,
    )
    db.add(item)
    await db.flush()
    return item


@router.get("/items", response_model=list[MenuItemRead])
async def list_menu_items(
    restaurant_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)
    ],
) -> list[MenuItem]:
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    r = await db.execute(
        select(MenuItem).where(MenuItem.restaurant_id == restaurant_id).order_by(MenuItem.label)
    )
    return list(r.scalars().all())


@router.patch("/items/{item_id}", response_model=MenuItemRead)
async def update_menu_item(
    restaurant_id: UUID,
    item_id: UUID,
    payload: MenuItemUpdate,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> MenuItem:
    db, _ = db_user
    item = await _get_menu_item_or_404(db, restaurant_id, item_id)
    if payload.label is not None:
        item.label = payload.label
    if payload.price is not None:
        item.price = payload.price
    if payload.is_active is not None:
        item.is_active = payload.is_active
    if payload.tags is not None:
        item.tags = payload.tags
    if payload.ingredients is not None:
        item.ingredients = payload.ingredients
    if payload.options is not None:
        item.options = payload.options
    if payload.description is not None:
        item.description = payload.description
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    restaurant_id: UUID,
    item_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> None:
    db, _ = db_user
    item = await _get_menu_item_or_404(db, restaurant_id, item_id)
    db.delete(item)
