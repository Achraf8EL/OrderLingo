from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_restaurant_or_404, require_restaurant_manager, require_restaurant_staff
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
    user: Annotated[CurrentUser, Depends(get_current_user)],
) -> list[Restaurant]:
    """
    List restaurants accessible to the current user:
    - platform_admin: sees all restaurants
    - restaurant_manager/staff: sees only assigned restaurants
    """
    if "platform_admin" in user.roles:
        r = await db.execute(select(Restaurant).order_by(Restaurant.name))
        return list(r.scalars().all())
    
    q = (
        select(Restaurant)
        .join(RestaurantUser, RestaurantUser.restaurant_id == Restaurant.id)
        .where(RestaurantUser.user_id == user.sub)
        .order_by(Restaurant.name)
    )
    r = await db.execute(q)
    return list(r.scalars().all())


@router.get("/{restaurant_id}", response_model=RestaurantRead)
async def get_restaurant(
    restaurant_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)
    ],
) -> Restaurant:
    """Get restaurant details (accessible to admin, manager, and staff)."""
    db, _ = db_user
    return await get_restaurant_or_404(restaurant_id, db)


@router.get("/{restaurant_id}/managers", response_model=list[str])
async def get_restaurant_managers(
    restaurant_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    user: Annotated[CurrentUser, Depends(RequirePlatformAdmin)],
) -> list[str]:
    """Get list of manager user IDs for a restaurant (admin only)."""
    q = select(RestaurantUser.user_id).where(
        RestaurantUser.restaurant_id == restaurant_id,
        RestaurantUser.role == "manager"
    )
    r = await db.execute(q)
    return list(r.scalars().all())


@router.get("/{restaurant_id}/staff", response_model=list[str])
async def get_restaurant_staff(
    restaurant_id: UUID,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> list[str]:
    """Get list of staff user IDs for a restaurant (admin or manager)."""
    db, _ = db_user
    q = select(RestaurantUser.user_id).where(
        RestaurantUser.restaurant_id == restaurant_id,
        RestaurantUser.role == "staff"
    )
    r = await db.execute(q)
    return list(r.scalars().all())


@router.patch("/{restaurant_id}", response_model=RestaurantRead)
async def update_restaurant(
    restaurant_id: UUID,
    payload: RestaurantUpdate,
    db_user: Annotated[
        tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)
    ],
) -> Restaurant:
    db, user = db_user
    obj = await get_restaurant_or_404(restaurant_id, db)
    
    # Check user role for permissions
    is_admin = "platform_admin" in user.roles
    is_manager = "restaurant_manager" in user.roles

    # Basic fields (admin and manager can update)
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
    
    # Update managers (ONLY admin can do this)
    if payload.manager_user_ids is not None:
        if not is_admin:
            raise HTTPException(
                status_code=403,
                detail="Only platform_admin can manage restaurant managers"
            )
        # Delete only managers for this restaurant
        await db.execute(
            delete(RestaurantUser).where(
                RestaurantUser.restaurant_id == restaurant_id,
                RestaurantUser.role == "manager"
            )
        )
        # Add new managers (delete existing assignment first to avoid duplicates)
        for uid in payload.manager_user_ids:
            # Delete any existing assignment for this user
            await db.execute(
                delete(RestaurantUser).where(
                    RestaurantUser.restaurant_id == restaurant_id,
                    RestaurantUser.user_id == uid
                )
            )
            ru = RestaurantUser(restaurant_id=restaurant_id, user_id=uid, role="manager")
            db.add(ru)
    
    # Update staff (admin OR manager can do this)
    if payload.staff_user_ids is not None:
        # Delete only staff for this restaurant
        await db.execute(
            delete(RestaurantUser).where(
                RestaurantUser.restaurant_id == restaurant_id,
                RestaurantUser.role == "staff"
            )
        )
        # Add new staff (delete existing assignment first to avoid duplicates)
        for uid in payload.staff_user_ids:
            # Delete any existing assignment for this user
            await db.execute(
                delete(RestaurantUser).where(
                    RestaurantUser.restaurant_id == restaurant_id,
                    RestaurantUser.user_id == uid
                )
            )
            ru = RestaurantUser(restaurant_id=restaurant_id, user_id=uid, role="staff")
            db.add(ru)
    
    return obj
