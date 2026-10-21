from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional, get_current_admin
from app.models.post import Post, PostType, PostStatus
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.schemas.post import PostCreate, PostUpdate, PostResponse, PostListResponse, PaginatedPosts

router = APIRouter(prefix="/posts", tags=["posts"])


async def _enrich_post(post: Post, current_user: Optional[User], db: AsyncSession) -> dict:
    """Add user_has_applied and user_application_status to a post dict."""
    data = {
        "id": post.id,
        "type": post.type,
        "status": post.status,
        "title": post.title,
        "description": post.description,
        "looking_for": post.looking_for,
        "stage": post.stage,
        "industry": post.industry,
        "skills_required": post.skills_required,
        "location": post.location,
        "is_remote": post.is_remote,
        "compensation": post.compensation,
        "author_id": post.author_id,
        "author": post.author,
        "views_count": post.views_count,
        "applications_count": post.applications_count,
        "created_at": post.created_at,
        "updated_at": post.updated_at,
        "user_has_applied": False,
        "user_application_status": None,
    }
    if current_user:
        result = await db.execute(
            select(Application).where(
                Application.post_id == post.id,
                Application.applicant_id == current_user.id,
            )
        )
        app = result.scalar_one_or_none()
        if app:
            data["user_has_applied"] = True
            data["user_application_status"] = app.status.value
    return data


@router.get("/", response_model=PaginatedPosts)
async def list_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=50),
    type: Optional[PostType] = None,
    status: Optional[PostStatus] = Query(None),
    industry: Optional[str] = None,
    search: Optional[str] = None,
    is_remote: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Public feed of posts with filtering and pagination."""
    filters = []

    # By default show only active posts
    if status is None:
        filters.append(Post.status == PostStatus.active)
    else:
        filters.append(Post.status == status)

    if type:
        filters.append(Post.type == type)
    if industry:
        filters.append(Post.industry.ilike(f"%{industry}%"))
    if is_remote is not None:
        filters.append(Post.is_remote == is_remote)
    if search:
        search_term = f"%{search}%"
        filters.append(
            or_(
                Post.title.ilike(search_term),
                Post.description.ilike(search_term),
                Post.looking_for.ilike(search_term),
                Post.skills_required.ilike(search_term),
            )
        )

    total_query = select(func.count()).select_from(Post).where(and_(*filters))
    total = await db.scalar(total_query)

    offset = (page - 1) * per_page
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.author))
        .where(and_(*filters))
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    posts = result.scalars().all()

    items = []
    for post in posts:
        enriched = await _enrich_post(post, current_user, db)
        items.append(PostListResponse.model_validate(enriched))

    return PaginatedPosts(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        pages=max(1, -(-total // per_page)),  # ceiling division
    )


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new startup or vacancy post."""
    post = Post(**post_data.model_dump(), author_id=current_user.id)
    db.add(post)
    await db.flush()
    await db.refresh(post, ["author"])
    return post


@router.get("/my", response_model=list[PostListResponse])
async def get_my_posts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all posts by the current user (including drafts and closed)."""
    result = await db.execute(
        select(Post)
        .options(selectinload(Post.author))
        .where(Post.author_id == current_user.id)
        .order_by(Post.created_at.desc())
    )
    posts = result.scalars().all()
    items = []
    for post in posts:
        enriched = await _enrich_post(post, current_user, db)
        items.append(PostListResponse.model_validate(enriched))
    return items


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: int,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """Get a single post by ID and increment view count."""
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    # Increment views
    post.views_count += 1
    await db.flush()
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).where(Post.id == post_id)
    )
    post = result.scalar_one()

    enriched = await _enrich_post(post, current_user, db)
    return PostResponse.model_validate(enriched)


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: int,
    updates: PostUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a post (owner only or admin)."""
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to update this post")

    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    await db.flush()
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).where(Post.id == post.id)
    )
    post = result.scalar_one()
    enriched = await _enrich_post(post, current_user, db)
    return PostResponse.model_validate(enriched)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a post (owner only or admin)."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    await db.delete(post)
