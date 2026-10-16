from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.post import Post, PostStatus
from app.models.user import User
from app.models.application import Application, ApplicationStatus
from app.schemas.application import (
    ApplicationCreate, ApplicationUpdate,
    ApplicationResponse, ApplicationShort
)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("/{post_id}", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_post(
    post_id: int,
    body: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply to a startup or vacancy post."""
    # Check post exists and is active
    result = await db.execute(
        select(Post).options(selectinload(Post.author)).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.status != PostStatus.active:
        raise HTTPException(status_code=400, detail="Post is no longer accepting applications")
    if post.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot apply to your own post")

    # Check idempotency: user already applied
    existing = await db.execute(
        select(Application).where(
            Application.post_id == post_id,
            Application.applicant_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You have already applied to this post")

    application = Application(
        post_id=post_id,
        applicant_id=current_user.id,
        post_author_id=post.author_id,
        cover_letter=body.cover_letter,
    )
    db.add(application)

    # Increment counter on post
    post.applications_count += 1

    await db.flush()
    await db.refresh(application, ["post", "applicant"])
    # Refresh post's author for nested serialization
    await db.refresh(application.post, ["author"])
    return application


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def withdraw_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Withdraw (cancel) an application — applicant only."""
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.applicant_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your application")
    if application.status not in (ApplicationStatus.pending,):
        raise HTTPException(
            status_code=400,
            detail="Can only withdraw pending applications",
        )

    # Decrement counter
    post_result = await db.execute(select(Post).where(Post.id == application.post_id))
    post = post_result.scalar_one_or_none()
    if post and post.applications_count > 0:
        post.applications_count -= 1

    await db.delete(application)


@router.get("/sent", response_model=list[ApplicationResponse])
async def get_sent_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all applications sent by the current user."""
    result = await db.execute(
        select(Application)
        .options(
            selectinload(Application.post).selectinload(Post.author),
            selectinload(Application.applicant),
        )
        .where(Application.applicant_id == current_user.id)
        .order_by(Application.created_at.desc())
    )
    return result.scalars().all()


@router.get("/received", response_model=list[ApplicationShort])
async def get_received_applications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all applications received on the current user's posts."""
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.applicant))
        .where(Application.post_author_id == current_user.id)
        .order_by(Application.created_at.desc())
    )
    return result.scalars().all()


@router.get("/post/{post_id}", response_model=list[ApplicationShort])
async def get_applications_for_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all applications for a specific post (post owner only)."""
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(Application)
        .options(selectinload(Application.applicant))
        .where(Application.post_id == post_id)
        .order_by(Application.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/{application_id}/respond", response_model=ApplicationShort)
async def respond_to_application(
    application_id: int,
    body: ApplicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Accept or reject an application — post owner only."""
    result = await db.execute(
        select(Application)
        .options(selectinload(Application.applicant))
        .where(Application.id == application_id)
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.post_author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to respond to this application")
    if application.status != ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail="Application is no longer pending")
    if body.status == ApplicationStatus.pending:
        raise HTTPException(status_code=400, detail="Cannot set status back to pending")
    if body.status == ApplicationStatus.withdrawn:
        raise HTTPException(status_code=400, detail="Use DELETE to withdraw your own application")

    application.status = body.status
    application.response_message = body.response_message
    await db.flush()
    await db.refresh(application, ["applicant"])
    return application
