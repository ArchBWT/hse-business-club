from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin
from app.models.user import User
from app.models.post import Post
from app.models.application import Application
from app.schemas.user import UserMe, UserUpdate, UserPublic, UserAdminView

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserMe)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserMe)
async def update_my_profile(
    updates: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile."""
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    await db.flush()
    await db.refresh(current_user)
    return current_user


@router.get("/me/stats")
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get statistics for current user's dashboard."""
    posts_count = await db.scalar(
        select(func.count()).where(Post.author_id == current_user.id)
    )
    sent_applications = await db.scalar(
        select(func.count()).where(Application.applicant_id == current_user.id)
    )
    received_applications = await db.scalar(
        select(func.count()).where(Application.post_author_id == current_user.id)
    )
    pending_received = await db.scalar(
        select(func.count()).where(
            Application.post_author_id == current_user.id,
            Application.status == "pending",
        )
    )
    return {
        "posts_count": posts_count,
        "sent_applications": sent_applications,
        "received_applications": received_applications,
        "pending_received": pending_received,
    }


@router.get("/{username}", response_model=UserPublic)
async def get_user_profile(username: str, db: AsyncSession = Depends(get_db)):
    """Get a public user profile by username."""
    result = await db.execute(select(User).where(User.username == username, User.is_active == True))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# --- Admin endpoints ---

@router.get("/", response_model=list[UserAdminView])
async def list_users(
    skip: int = 0,
    limit: int = 50,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: list all users."""
    result = await db.execute(select(User).offset(skip).limit(limit))
    return result.scalars().all()


@router.patch("/{user_id}/deactivate", response_model=UserAdminView)
async def deactivate_user(
    user_id: int,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: deactivate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="Cannot deactivate admin users")
    user.is_active = False
    await db.flush()
    await db.refresh(user)
    return user


@router.patch("/{user_id}/activate", response_model=UserAdminView)
async def activate_user(
    user_id: int,
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin: activate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    await db.flush()
    await db.refresh(user)
    return user
