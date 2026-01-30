from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_restaurant_or_404, require_restaurant_manager, require_restaurant_staff
from app.core.security import CurrentUser
from app.models.menu import MenuCategory, OptionGroup, OptionItem, MenuItem
from app.schemas.menu import (
    MenuCategoryCreate, MenuCategoryRead, MenuCategoryUpdate,
    OptionGroupCreate, OptionGroupRead, OptionGroupUpdate, OptionGroupWithItems,
    OptionItemCreate, OptionItemRead, OptionItemUpdate,
    MenuItemCreate, MenuItemRead, MenuItemUpdate, MenuItemFull,
)

router = APIRouter(prefix="/restaurants/{restaurant_id}/menu", tags=["menu"])


# ============ Helper functions ============

async def _get_category_or_404(db: AsyncSession, restaurant_id: UUID, category_id: UUID) -> MenuCategory:
    r = await db.execute(
        select(MenuCategory).where(
            MenuCategory.id == category_id,
            MenuCategory.restaurant_id == restaurant_id,
        )
    )
    cat = r.scalar_one_or_none()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
    return cat


async def _get_option_group_or_404(db: AsyncSession, restaurant_id: UUID, group_id: UUID) -> OptionGroup:
    r = await db.execute(
        select(OptionGroup).where(
            OptionGroup.id == group_id,
            OptionGroup.restaurant_id == restaurant_id,
        )
    )
    grp = r.scalar_one_or_none()
    if not grp:
        raise HTTPException(status_code=404, detail="Option group not found")
    return grp


async def _get_option_item_or_404(db: AsyncSession, group_id: UUID, option_id: UUID) -> OptionItem:
    r = await db.execute(
        select(OptionItem).where(
            OptionItem.id == option_id,
            OptionItem.group_id == group_id,
        )
    )
    opt = r.scalar_one_or_none()
    if not opt:
        raise HTTPException(status_code=404, detail="Option item not found")
    return opt


async def _get_menu_item_or_404(db: AsyncSession, restaurant_id: UUID, item_id: UUID) -> MenuItem:
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


# ============ Categories ============

@router.post("/categories", response_model=MenuCategoryRead, status_code=status.HTTP_201_CREATED)
async def create_category(
    restaurant_id: UUID,
    payload: MenuCategoryCreate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> MenuCategory:
    """Create a new menu category (e.g., Tacos, Tenders, Boissons)"""
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    cat = MenuCategory(
        restaurant_id=restaurant_id,
        name=payload.name,
        description=payload.description,
        display_order=payload.display_order,
        is_active=payload.is_active,
    )
    db.add(cat)
    await db.flush()
    return cat


@router.get("/categories", response_model=list[MenuCategoryRead])
async def list_categories(
    restaurant_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)],
) -> list[MenuCategory]:
    """List all menu categories"""
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    r = await db.execute(
        select(MenuCategory)
        .where(MenuCategory.restaurant_id == restaurant_id)
        .order_by(MenuCategory.display_order, MenuCategory.name)
    )
    return list(r.scalars().all())


@router.patch("/categories/{category_id}", response_model=MenuCategoryRead)
async def update_category(
    restaurant_id: UUID,
    category_id: UUID,
    payload: MenuCategoryUpdate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> MenuCategory:
    """Update a menu category"""
    db, _ = db_user
    cat = await _get_category_or_404(db, restaurant_id, category_id)
    if payload.name is not None:
        cat.name = payload.name
    if payload.description is not None:
        cat.description = payload.description
    if payload.display_order is not None:
        cat.display_order = payload.display_order
    if payload.is_active is not None:
        cat.is_active = payload.is_active
    return cat


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    restaurant_id: UUID,
    category_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> None:
    """Delete a menu category"""
    db, _ = db_user
    cat = await _get_category_or_404(db, restaurant_id, category_id)
    await db.delete(cat)


# ============ Option Groups ============

@router.post("/option-groups", response_model=OptionGroupRead, status_code=status.HTTP_201_CREATED)
async def create_option_group(
    restaurant_id: UUID,
    payload: OptionGroupCreate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> OptionGroup:
    """Create an option group (e.g., "Choix de viande", "Sauces", "Suppléments")"""
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    grp = OptionGroup(
        restaurant_id=restaurant_id,
        name=payload.name,
        description=payload.description,
        min_select=payload.min_select,
        max_select=payload.max_select,
        is_active=payload.is_active,
    )
    db.add(grp)
    await db.flush()
    return grp


@router.get("/option-groups", response_model=list[OptionGroupWithItems])
async def list_option_groups(
    restaurant_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)],
) -> list[OptionGroup]:
    """List all option groups with their options"""
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    r = await db.execute(
        select(OptionGroup)
        .where(OptionGroup.restaurant_id == restaurant_id)
        .options(selectinload(OptionGroup.options))
        .order_by(OptionGroup.name)
    )
    return list(r.scalars().all())


@router.patch("/option-groups/{group_id}", response_model=OptionGroupRead)
async def update_option_group(
    restaurant_id: UUID,
    group_id: UUID,
    payload: OptionGroupUpdate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> OptionGroup:
    """Update an option group"""
    db, _ = db_user
    grp = await _get_option_group_or_404(db, restaurant_id, group_id)
    if payload.name is not None:
        grp.name = payload.name
    if payload.description is not None:
        grp.description = payload.description
    if payload.min_select is not None:
        grp.min_select = payload.min_select
    if payload.max_select is not None:
        grp.max_select = payload.max_select
    if payload.is_active is not None:
        grp.is_active = payload.is_active
    return grp


@router.delete("/option-groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_option_group(
    restaurant_id: UUID,
    group_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> None:
    """Delete an option group"""
    db, _ = db_user
    grp = await _get_option_group_or_404(db, restaurant_id, group_id)
    await db.delete(grp)


# ============ Option Items ============

@router.post("/option-groups/{group_id}/options", response_model=OptionItemRead, status_code=status.HTTP_201_CREATED)
async def create_option_item(
    restaurant_id: UUID,
    group_id: UUID,
    payload: OptionItemCreate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> OptionItem:
    """Create an option within a group (e.g., "Poulet +0€", "Boeuf +1.50€")"""
    db, _ = db_user
    await _get_option_group_or_404(db, restaurant_id, group_id)
    opt = OptionItem(
        group_id=group_id,
        name=payload.name,
        price_extra=payload.price_extra,
        is_active=payload.is_active,
    )
    db.add(opt)
    await db.flush()
    return opt


@router.patch("/option-groups/{group_id}/options/{option_id}", response_model=OptionItemRead)
async def update_option_item(
    restaurant_id: UUID,
    group_id: UUID,
    option_id: UUID,
    payload: OptionItemUpdate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> OptionItem:
    """Update an option item"""
    db, _ = db_user
    await _get_option_group_or_404(db, restaurant_id, group_id)
    opt = await _get_option_item_or_404(db, group_id, option_id)
    if payload.name is not None:
        opt.name = payload.name
    if payload.price_extra is not None:
        opt.price_extra = payload.price_extra
    if payload.is_active is not None:
        opt.is_active = payload.is_active
    return opt


@router.delete("/option-groups/{group_id}/options/{option_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_option_item(
    restaurant_id: UUID,
    group_id: UUID,
    option_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> None:
    """Delete an option item"""
    db, _ = db_user
    await _get_option_group_or_404(db, restaurant_id, group_id)
    opt = await _get_option_item_or_404(db, group_id, option_id)
    await db.delete(opt)


# ============ Menu Items ============

@router.post("/items", response_model=MenuItemRead, status_code=status.HTTP_201_CREATED)
async def create_menu_item(
    restaurant_id: UUID,
    payload: MenuItemCreate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> MenuItem:
    """Create a menu item (e.g., "Tacos XL", "Tenders 5 pièces")"""
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    
    # Convert option_group_ids to strings for JSONB storage
    option_group_ids = None
    if payload.option_group_ids:
        option_group_ids = [str(gid) for gid in payload.option_group_ids]
    
    item = MenuItem(
        restaurant_id=restaurant_id,
        category_id=payload.category_id,
        label=payload.label,
        description=payload.description,
        price=payload.price,
        image_url=payload.image_url,
        is_active=payload.is_active,
        display_order=payload.display_order,
        tags=payload.tags,
        ingredients=payload.ingredients,
        option_group_ids=option_group_ids,
    )
    db.add(item)
    await db.flush()
    return item


@router.get("/items", response_model=list[MenuItemRead])
async def list_menu_items(
    restaurant_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)],
    category_id: UUID | None = None,
    active_only: bool = False,
) -> list[MenuItem]:
    """List menu items, optionally filtered by category"""
    db, _ = db_user
    await get_restaurant_or_404(restaurant_id, db)
    
    query = select(MenuItem).where(MenuItem.restaurant_id == restaurant_id)
    
    if category_id:
        query = query.where(MenuItem.category_id == category_id)
    if active_only:
        query = query.where(MenuItem.is_active == True)
    
    query = query.order_by(MenuItem.display_order, MenuItem.label)
    r = await db.execute(query)
    return list(r.scalars().all())


@router.get("/items/{item_id}", response_model=MenuItemRead)
async def get_menu_item(
    restaurant_id: UUID,
    item_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_staff)],
) -> MenuItem:
    """Get a single menu item"""
    db, _ = db_user
    return await _get_menu_item_or_404(db, restaurant_id, item_id)


@router.patch("/items/{item_id}", response_model=MenuItemRead)
async def update_menu_item(
    restaurant_id: UUID,
    item_id: UUID,
    payload: MenuItemUpdate,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> MenuItem:
    """Update a menu item"""
    db, _ = db_user
    item = await _get_menu_item_or_404(db, restaurant_id, item_id)
    
    if payload.label is not None:
        item.label = payload.label
    if payload.description is not None:
        item.description = payload.description
    if payload.price is not None:
        item.price = payload.price
    if payload.image_url is not None:
        item.image_url = payload.image_url
    if payload.is_active is not None:
        item.is_active = payload.is_active
    if payload.display_order is not None:
        item.display_order = payload.display_order
    if payload.tags is not None:
        item.tags = payload.tags
    if payload.ingredients is not None:
        item.ingredients = payload.ingredients
    if payload.category_id is not None:
        item.category_id = payload.category_id
    if payload.option_group_ids is not None:
        item.option_group_ids = [str(gid) for gid in payload.option_group_ids]
    
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_menu_item(
    restaurant_id: UUID,
    item_id: UUID,
    db_user: Annotated[tuple[AsyncSession, CurrentUser], Depends(require_restaurant_manager)],
) -> None:
    """Delete a menu item"""
    db, _ = db_user
    item = await _get_menu_item_or_404(db, restaurant_id, item_id)
    await db.delete(item)
