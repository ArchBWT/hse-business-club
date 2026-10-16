"""Initial migration — create all tables

Revision ID: 001_initial
Revises: 
Create Date: 2026-10-16
"""
from alembic import op
import sqlalchemy as sa


revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('username', sa.String(100), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('telegram_handle', sa.String(100), nullable=True),
        sa.Column('linkedin_url', sa.String(500), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('skills_tags', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('role', sa.Enum('user', 'admin', name='userrole'), nullable=False, server_default='user'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

    op.create_table(
        'posts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('author_id', sa.Integer(), nullable=False),
        sa.Column('type', sa.Enum('startup', 'vacancy', name='posttype'), nullable=False),
        sa.Column('title', sa.String(300), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('looking_for', sa.Text(), nullable=False),
        sa.Column('stage', sa.String(100), nullable=True),
        sa.Column('industry', sa.String(150), nullable=True),
        sa.Column('skills_required', sa.String(500), nullable=True),
        sa.Column('location', sa.String(200), nullable=True),
        sa.Column('is_remote', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('compensation', sa.String(200), nullable=True),
        sa.Column('status', sa.Enum('active', 'closed', 'draft', name='poststatus'), nullable=False, server_default='active'),
        sa.Column('views_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('applications_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['author_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_posts_id', 'posts', ['id'])
    op.create_index('ix_posts_author_id', 'posts', ['author_id'])
    op.create_index('ix_posts_type', 'posts', ['type'])
    op.create_index('ix_posts_status', 'posts', ['status'])
    op.create_index('ix_posts_created_at', 'posts', ['created_at'])

    op.create_table(
        'applications',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('applicant_id', sa.Integer(), nullable=False),
        sa.Column('post_author_id', sa.Integer(), nullable=False),
        sa.Column('cover_letter', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('pending', 'accepted', 'rejected', 'withdrawn', name='applicationstatus'), nullable=False, server_default='pending'),
        sa.Column('response_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['applicant_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['post_author_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('post_id', 'applicant_id', name='uq_application_post_applicant'),
    )
    op.create_index('ix_applications_id', 'applications', ['id'])
    op.create_index('ix_applications_post_id', 'applications', ['post_id'])
    op.create_index('ix_applications_applicant_id', 'applications', ['applicant_id'])
    op.create_index('ix_applications_post_author_id', 'applications', ['post_author_id'])
    op.create_index('ix_applications_status', 'applications', ['status'])
    op.create_index('ix_applications_created_at', 'applications', ['created_at'])


def downgrade() -> None:
    op.drop_table('applications')
    op.drop_table('posts')
    op.drop_table('users')
    op.execute("DROP TYPE IF EXISTS applicationstatus")
    op.execute("DROP TYPE IF EXISTS poststatus")
    op.execute("DROP TYPE IF EXISTS posttype")
    op.execute("DROP TYPE IF EXISTS userrole")
