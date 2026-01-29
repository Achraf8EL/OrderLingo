from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_restaurant_or_404, require_restaurant_staff
from app.core.security import CurrentUser
from app.models.order import Order
from app.schemas.order import OrderCreate, OrderRead, OrderStatusUpdate
from app.services.ordering import create_order, update_order_status

router = APIRouter(prefix="/restaurants/{restaurant_id}/orders", tags=["orders"])


async def _get_order_or_404(
    db: AsyncSession, restaurant_id: UUID, order_id: UUID
) -> Order:
    from fastapi import HTTPException

    r = await db.execute(
        select(Order)
        .where(Order.id == order_id, Order.restaurant_id == restaurant_id)
        .options(selectinload(Order.items))
    )
    o = r.scalar_one_or_none()
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o


@router.post("", response_model=OrderRead, status_code=status.HTTP_201_CREATED)
async def create_order_endpoint(
    restaurant_id: UUID,
    payload: OrderCreate,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)
    ],
) -> Order:
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    order = await create_order(db, restaurant_id, payload)
    await db.refresh(order)
    r = await db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items))
    )
    return r.scalars().one()

@router.get("/{order_id}", response_model=OrderRead)
async def get_order(
    restaurant_id: UUID,
    order_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)
    ],
) -> Order:
    db, _ = db_user
    return await _get_order_or_404(db, restaurant_id, order_id)


@router.patch("/{order_id}/status", response_model=OrderRead)
async def update_order_status_endpoint(
    restaurant_id: UUID,
    order_id: UUID,
    payload: OrderStatusUpdate,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)
    ],
) -> Order:
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    order = await update_order_status(db, restaurant_id, order_id, payload.status)
    await db.refresh(order)
    r = await db.execute(
        select(Order)
        .where(Order.id == order.id)
        .options(selectinload(Order.items))
    )
    return r.scalars().one()
