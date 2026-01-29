import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class MenuItem(Base):
    __tablename__ = "menu_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    restaurant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("restaurants.id", ondelete="CASCADE"),
        nullable=False,
    )
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    ingredients: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    options: Mapped[dict | list | None] = mapped_column(JSONB, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    restaurant: Mapped["Restaurant"] = relationship("Restaurant", back_populates="menu_items")
    order_items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem", back_populates="menu_item", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_menu_items_restaurant_id", "restaurant_id"),
        Index("ix_menu_items_restaurant_active", "restaurant_id", "is_active"),
    )
