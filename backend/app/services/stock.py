from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.menu import MenuItem
from app.schemas.inventory import AvailabilityItem, AvailabilityResponse


async def get_availability(
    db: AsyncSession,
    restaurant_id: UUID,
) -> AvailabilityResponse:
    """Compute availability per menu item. MVP: no inventory link; all active items available."""
    q = (
        select(MenuItem)
        .where(MenuItem.restaurant_id == restaurant_id, MenuItem.is_active.is_(True))
        .order_by(MenuItem.label)
    )
    r = await db.execute(q)
    items = list(r.scalars().all())
    out: list[AvailabilityItem] = []
    for mi in items:
        # MVP: simple logic — active => available. Extensible: check ingredients vs inventory_levels.
        available = True
        reason: str | None = None
        subs: list[dict] = []
        # Placeholder for future: if ingredients reference inventory and out-of-stock, set available=False, reason, substitutions.
        out.append(
            AvailabilityItem(
                menu_item_id=mi.id,
                label=mi.label,
                available=available,
                reason=reason,
                substitutions=subs,
            )
        )
    return AvailabilityResponse(restaurant_id=restaurant_id, items=out)
