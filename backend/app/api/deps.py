from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, get_current_user
from app.models.restaurant import Restaurant, RestaurantUser


async def _check_restaurant_access(
    restaurant_id: UUID,
    db: AsyncSession,
    user: CurrentUser,
    *allowed_roles: str,
) -> None:
    if "platform_admin" in user.roles:
        if not allowed_roles or any(r in user.roles for r in allowed_roles):
            return
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    if allowed_roles and not any(r in user.roles for r in allowed_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    q = select(RestaurantUser).where(
        RestaurantUser.restaurant_id == restaurant_id,
        RestaurantUser.user_id == user.sub,
        RestaurantUser.role.in_(["manager", "staff"]),
    )
    r = await db.execute(q)
    if not r.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this restaurant",
        )


async def require_restaurant_manager(
    restaurant_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> tuple[AsyncSession, CurrentUser]:
    await _check_restaurant_access(
        restaurant_id, db, user, "platform_admin", "restaurant_manager"
    )
    return db, user


async def require_restaurant_staff(
    restaurant_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> tuple[AsyncSession, CurrentUser]:
    await _check_restaurant_access(
        restaurant_id,
        db,
        user,
        "platform_admin",
        "restaurant_manager",
        "staff",
    )
    return db, user


async def get_restaurant_or_404(
    restaurant_id: UUID,
    db: AsyncSession,
) -> Restaurant:
    r = await db.execute(select(Restaurant).where(Restaurant.id == restaurant_id))
    obj = r.scalar_one_or_none()
    if not obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Restaurant not found",
        )
    return obj
