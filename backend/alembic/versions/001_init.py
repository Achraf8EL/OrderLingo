"""init

Revision ID: 001
Revises:

Create Date: 2025-01-29

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "restaurants",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(128), nullable=False),
        sa.Column("description", sa.String(1024), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_restaurants_slug", "restaurants", ["slug"], unique=True)

    op.create_table(
        "restaurant_users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.String(255), nullable=False),
        sa.Column("role", sa.String(32), nullable=False),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_restaurant_users_restaurant_id", "restaurant_users", ["restaurant_id"])
    op.create_index("ix_restaurant_users_user_id", "restaurant_users", ["user_id"])
    op.create_index(
        "ix_restaurant_users_restaurant_user",
        "restaurant_users",
        ["restaurant_id", "user_id"],
        unique=True,
    )

    op.create_table(
        "menu_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("label", sa.String(255), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("tags", postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column("ingredients", postgresql.JSONB(), nullable=True),
        sa.Column("options", postgresql.JSONB(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_menu_items_restaurant_id", "menu_items", ["restaurant_id"])
    op.create_index("ix_menu_items_restaurant_active", "menu_items", ["restaurant_id", "is_active"])

    op.create_table(
        "inventory_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("unit", sa.String(32), nullable=False, server_default="unit"),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_inventory_items_restaurant_id", "inventory_items", ["restaurant_id"])

    op.create_table(
        "inventory_levels",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("inventory_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False, server_default="0"),
        sa.Column("in_stock", sa.Boolean(), nullable=False, server_default="true"),
        sa.ForeignKeyConstraint(
            ["inventory_item_id"], ["inventory_items.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_inventory_levels_inventory_item_id",
        "inventory_levels",
        ["inventory_item_id"],
    )
    op.create_index(
        "uq_inventory_levels_item",
        "inventory_levels",
        ["inventory_item_id"],
        unique=True,
    )

    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["restaurant_id"], ["restaurants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_orders_restaurant_id", "orders", ["restaurant_id"])
    op.create_index("ix_orders_restaurant_status", "orders", ["restaurant_id", "status"])

    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("menu_item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("options", postgresql.JSONB(), nullable=True),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["menu_item_id"], ["menu_items.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])
    op.create_index("ix_order_items_menu_item_id", "order_items", ["menu_item_id"])


def downgrade() -> None:
    op.drop_index("ix_order_items_menu_item_id", "order_items")
    op.drop_index("ix_order_items_order_id", "order_items")
    op.drop_table("order_items")
    op.drop_index("ix_orders_restaurant_status", "orders")
    op.drop_index("ix_orders_restaurant_id", "orders")
    op.drop_table("orders")
    op.drop_index("uq_inventory_levels_item", "inventory_levels")
    op.drop_index("ix_inventory_levels_inventory_item_id", "inventory_levels")
    op.drop_table("inventory_levels")
    op.drop_index("ix_inventory_items_restaurant_id", "inventory_items")
    op.drop_table("inventory_items")
    op.drop_index("ix_menu_items_restaurant_active", "menu_items")
    op.drop_index("ix_menu_items_restaurant_id", "menu_items")
    op.drop_table("menu_items")
    op.drop_index("ix_restaurant_users_restaurant_user", "restaurant_users")
    op.drop_index("ix_restaurant_users_user_id", "restaurant_users")
    op.drop_index("ix_restaurant_users_restaurant_id", "restaurant_users")
    op.drop_table("restaurant_users")
    op.drop_index("ix_restaurants_slug", "restaurants")
    op.drop_table("restaurants")
