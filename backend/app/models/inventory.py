import uuid

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class InventoryItem(Base):
    """Reference entity for stock (e.g. tomate, mozzarella)."""

    __tablename__ = "inventory_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str] = mapped_column(String(32), default="unit", nullable=False)

    restaurant: Mapped["Restaurant"] = relationship(
        "Restaurant", back_populates="inventory_items"
    )
    levels: Mapped[list["InventoryLevel"]] = relationship(
        "InventoryLevel", back_populates="inventory_item", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_inventory_items_restaurant_id", "restaurant_id"),
    )


class InventoryLevel(Base):
    """Current stock level for an inventory item."""

    __tablename__ = "inventory_levels"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    inventory_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inventory_items.id", ondelete="CASCADE"),
        nullable=False,
    )
    quantity: Mapped[float] = mapped_column(nullable=False, default=0.0)
    in_stock: Mapped[bool] = mapped_column(default=True, nullable=False)

    inventory_item: Mapped["InventoryItem"] = relationship(
        "InventoryItem", back_populates="levels"
    )

    __table_args__ = (
        Index("ix_inventory_levels_inventory_item_id", "inventory_item_id"),
        Index("uq_inventory_levels_item", "inventory_item_id", unique=True),
    )
