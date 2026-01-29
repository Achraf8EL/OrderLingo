from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.menu import MenuItem
from app.models.order import Order, OrderItem
from app.schemas.order import OrderCreate


async def validate_order_items(
    db: AsyncSession,
    restaurant_id: UUID,
    payload: OrderCreate,
) -> list[tuple[MenuItem, int, dict | list | None]]:
    """Validate each line: menu item exists, belongs to restaurant, is active. Return (menu_item, qty, options)."""
    result: list[tuple[MenuItem, int, dict | list | None]] = []
    for line in payload.items:
        r = await db.execute(
            select(MenuItem).where(
                MenuItem.id == line.menu_item_id,
                MenuItem.restaurant_id == restaurant_id,
                MenuItem.is_active.is_(True),
            )
        )
        mi = r.scalar_one_or_none()
        if not mi:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=400,
                detail=f"Menu item {line.menu_item_id} not found or inactive",
            )
        result.append((mi, line.quantity, line.options))
    return result


async def create_order(
    db: AsyncSession,
    restaurant_id: UUID,
    payload: OrderCreate,
) -> Order:
    validated = await validate_order_items(db, restaurant_id, payload)
    order = Order(restaurant_id=restaurant_id, status="draft")
    db.add(order)
    await db.flush()
    for mi, qty, opts in validated:
        item = OrderItem(
            order_id=order.id,
            menu_item_id=mi.id,
            quantity=qty,
            unit_price=mi.price,
            options=opts,
        )
        db.add(item)
    await db.flush()
    return order


def _allowed_transitions() -> dict[str, tuple[str, ...]]:
    return {
        "draft": ("confirmed", "cancelled"),
        "confirmed": ("preparing", "cancelled"),
        "preparing": ("ready", "cancelled"),
        "ready": ("delivered",),
        "delivered": (),
        "cancelled": (),
    }


def can_transition(current: str, next_: str) -> bool:
    allowed = _allowed_transitions().get(current, ())
    return next_ in allowed


async def update_order_status(
    db: AsyncSession,
    restaurant_id: UUID,
    order_id: UUID,
    new_status: str,
) -> Order:
    from fastapi import HTTPException

    r = await db.execute(
        select(Order).where(
            Order.id == order_id,
            Order.restaurant_id == restaurant_id,
        )
    )
    order = r.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not can_transition(order.status, new_status):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot transition from {order.status} to {new_status}",
        )
    order.status = new_status
    return order
