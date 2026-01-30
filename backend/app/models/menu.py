import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MenuCategory(Base):
    """Menu category (e.g., Tacos, Tenders, Burgers, Boissons, Desserts)"""
    __tablename__ = "menu_categories"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="menu_categories")
    items: Mapped[list["MenuItem"]] = relationship(
        "MenuItem", back_populates="category", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_menu_categories_restaurant_id", "restaurant_id"),
    )


class OptionGroup(Base):
    """Option group for menu items (e.g., "Choix de viande", "Sauces", "Suppléments")"""
    __tablename__ = "option_groups"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # min_select: 0 = optional, 1+ = required
    min_select: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # max_select: 1 = single choice, n = multi choice
    max_select: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="option_groups")
    options: Mapped[list["OptionItem"]] = relationship(
        "OptionItem", back_populates="group", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_option_groups_restaurant_id", "restaurant_id"),
    )


class OptionItem(Base):
    """Individual option within a group (e.g., "Poulet", "Boeuf", "Sauce Algérienne")"""
    __tablename__ = "option_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    group_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("option_groups.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_extra: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    group: Mapped["OptionGroup"] = relationship("OptionGroup", back_populates="options")

    __table_args__ = (
        Index("ix_option_items_group_id", "group_id"),
    )


class MenuItem(Base):
    """Menu item (e.g., "Tacos XL", "Tenders 5 pièces", "Coca-Cola")"""
    __tablename__ = "menu_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    category_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("menu_categories.id", ondelete="SET NULL"),
        nullable=True,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    ingredients: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    # Link to option groups (many-to-many via JSONB array of group IDs)
    option_group_ids: Mapped[list | None] = mapped_column(JSONB, nullable=True)

    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="menu_items")
    category: Mapped["MenuCategory"] = relationship("MenuCategory", back_populates="items")
    order_items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="menu_item", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_menu_items_restaurant_id", "restaurant_id"),
        Index("ix_menu_items_restaurant_active", "restaurant_id", "is_active"),
        Index("ix_menu_items_category_id", "category_id"),
    )
