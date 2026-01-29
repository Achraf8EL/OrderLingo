from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_restaurant_or_404, require_restaurant_manager
from app.core.database import get_db
from app.core.security import CurrentUser, RequirePlatformAdmin, get_current_user
from app.models.restaurant import Restaurant, RestaurantUser
from app.schemas.restaurant import RestaurantCreate, RestaurantRead, RestaurantUpdate

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.post("", response_model=RestaurantRead, status_code=status.HTTP_201_CREATED)
async def create_restaurant(
    payload: RestaurantCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(RequirePlatformAdmin)],
) -> Restaurant:
    r = await db.execute(select(Restaurant).where(Restaurant.slug == payload.slug))
    if r.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Restaurant with this slug already exists",
        )
    obj = Restaurant(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        is_active=payload.is_active,
    )
    db.add(obj)
    await db.flush()
    if getattr(payload, "manager_user_ids", None):
        for uid in payload.manager_user_ids:
            ru = RestaurantUser(restaurant_id=obj.id, user_id=uid, role="manager")
            db.add(ru)
    return obj


@router.get("", response_model=list[RestaurantRead])
async def list_restaurants(
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(RequirePlatformAdmin)],
) -> list[Restaurant]:
    r = await db.execute(select(Restaurant).order_by(Restaurant.name))
    return list(r.scalars().all())


@router.get("/{restaurant_id}", response_model=RestaurantRead)
async def get_restaurant(
    restaurant_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> Restaurant:
    db, _ = db_user
    return await get_restaurant_or_404(restaurant_id, db)


@router.patch("/{restaurant_id}", response_model=RestaurantRead)
async def update_restaurant(
    restaurant_id: UUID,
    payload: RestaurantUpdate,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> Restaurant:
    db, _ = db_user
    obj = await get_restaurant_or_404(restaurant_id, db)

    if payload.name is not None:
        obj.name = payload.name
    if payload.slug is not None:
        r = await db.execute(select(Restaurant).where(Restaurant.slug == payload.slug, Restaurant.id != restaurant_id))
        if r.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="Slug already used")
        obj.slug = payload.slug
    if payload.description is not None:
        obj.description = payload.description
    if payload.is_active is not None:
        obj.is_active = payload.is_active
    if payload.manager_user_ids is not None:
        await db.execute(delete(RestaurantUser).where(RestaurantUser.restaurant_id == restaurant_id))
        for uid in payload.manager_user_ids:
            ru = RestaurantUser(restaurant_id=restaurant_id, user_id=uid, role="manager")
            db.add(ru)
    return obj
