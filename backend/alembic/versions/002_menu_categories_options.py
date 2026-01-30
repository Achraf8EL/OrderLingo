"""add menu categories and options

Revision ID: 002
Revises: 001
Create Date: 2026-01-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002'
down_revision = '001'


def upgrade() -> None:
    # Create menu_categories table
    op.create_table(
        'menu_categories',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('restaurant_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_menu_categories_restaurant_id', 'menu_categories', ['restaurant_id'])

    # Create option_groups table
    op.create_table(
        'option_groups',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('restaurant_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('min_select', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_select', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['restaurant_id'], ['restaurants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_option_groups_restaurant_id', 'option_groups', ['restaurant_id'])

    # Create option_items table
    op.create_table(
        'option_items',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('group_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('price_extra', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['group_id'], ['option_groups.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_option_items_group_id', 'option_items', ['group_id'])

    # Update menu_items table - add new columns
    op.add_column('menu_items', sa.Column('category_id', sa.UUID(), nullable=True))
    op.add_column('menu_items', sa.Column('image_url', sa.String(500), nullable=True))
    op.add_column('menu_items', sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('menu_items', sa.Column('option_group_ids', postgresql.JSONB(), nullable=True))
    
    # Create foreign key for category_id
    op.create_foreign_key(
        'fk_menu_items_category_id',
        'menu_items', 'menu_categories',
        ['category_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_menu_items_category_id', 'menu_items', ['category_id'])
    
    # Drop old options column (replaced by option_group_ids)
    op.drop_column('menu_items', 'options')


def downgrade() -> None:
    # Restore old options column
    op.add_column('menu_items', sa.Column('options', postgresql.JSONB(), nullable=True))
    
    # Drop new columns from menu_items
    op.drop_index('ix_menu_items_category_id', table_name='menu_items')
    op.drop_constraint('fk_menu_items_category_id', 'menu_items', type_='foreignkey')
    op.drop_column('menu_items', 'option_group_ids')
    op.drop_column('menu_items', 'display_order')
    op.drop_column('menu_items', 'image_url')
    op.drop_column('menu_items', 'category_id')

    # Drop tables
    op.drop_index('ix_option_items_group_id', table_name='option_items')
    op.drop_table('option_items')
    op.drop_index('ix_option_groups_restaurant_id', table_name='option_groups')
    op.drop_table('option_groups')
    op.drop_index('ix_menu_categories_restaurant_id', table_name='menu_categories')
    op.drop_table('menu_categories')
