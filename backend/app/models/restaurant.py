import uuid

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    users: Mapped[list["RestaurantUser"]] = relationship(
        "RestaurantUser", back_populates="restaurant", cascade="all, delete-orphan"
    )
    menu_categories: Mapped[list["MenuCategory"]] = relationship(
        "MenuCategory", back_populates="restaurant", cascade="all, delete-orphan"
    )
    menu_items: Mapped[list["MenuItem"]] = relationship(
        "MenuItem", back_populates="restaurant", cascade="all, delete-orphan"
    )
    option_groups: Mapped[list["OptionGroup"]] = relationship(
        "OptionGroup", back_populates="restaurant", cascade="all, delete-orphan"
    )
    inventory_items: Mapped[list["InventoryItem"]] = relationship(
        "InventoryItem", back_populates="restaurant", cascade="all, delete-orphan"
    )
    orders: Mapped[list["Order"]] = relationship(
        "Order", back_populates="restaurant", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("ix_restaurants_slug", "slug"),)


class RestaurantUser(Base):
    """Link user (Keycloak sub) to restaurant with role manager|staff."""

    __tablename__ = "restaurant_users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)  # Keycloak sub
    role: Mapped[str] = mapped_column(String(32), nullable=False)  # manager | staff

    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="users")

    __table_args__ = (
        Index("ix_restaurant_users_restaurant_id", "restaurant_id"),
        Index("ix_restaurant_users_user_id", "user_id"),
        Index("ix_restaurant_users_restaurant_user", "restaurant_id", "user_id", unique=True),
    )
