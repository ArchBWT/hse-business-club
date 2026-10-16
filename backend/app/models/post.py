import enum
from datetime import datetime
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Text, ForeignKey,
    Enum as SAEnum, func, ARRAY
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class PostType(str, enum.Enum):
    startup = "startup"
    vacancy = "vacancy"


class PostStatus(str, enum.Enum):
    active = "active"
    closed = "closed"
    draft = "draft"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Core fields
    type: Mapped[PostType] = mapped_column(
        SAEnum(PostType, name="posttype"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    # Who are they looking for
    looking_for: Mapped[str] = mapped_column(Text, nullable=False)

    # Additional context
    stage: Mapped[str | None] = mapped_column(String(100), nullable=True)   # Для стартапа: idea/mvp/growth
    industry: Mapped[str | None] = mapped_column(String(150), nullable=True)
    skills_required: Mapped[str | None] = mapped_column(String(500), nullable=True)  # comma-separated tags
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Compensation (для вакансий)
    compensation: Mapped[str | None] = mapped_column(String(200), nullable=True)

    # Status
    status: Mapped[PostStatus] = mapped_column(
        SAEnum(PostStatus, name="poststatus"), default=PostStatus.active, nullable=False, index=True
    )

    # Counts (denormalized for performance)
    views_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    applications_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    author: Mapped["User"] = relationship("User", back_populates="posts")
    applications: Mapped[list["Application"]] = relationship(
        "Application", back_populates="post", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Post id={self.id} type={self.type} title={self.title[:30]}>"
