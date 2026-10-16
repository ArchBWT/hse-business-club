import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Integer, String, Boolean, DateTime, Text, Enum as SAEnum, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # Profile fields
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    telegram_handle: Mapped[str | None] = mapped_column(String(100), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    skills_tags: Mapped[str | None] = mapped_column(String(500), nullable=True)  # comma-separated

    # Status flags
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="userrole"), default=UserRole.user, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    posts: Mapped[list["Post"]] = relationship(
        "Post", back_populates="author", cascade="all, delete-orphan"
    )
    sent_applications: Mapped[list["Application"]] = relationship(
        "Application",
        foreign_keys="Application.applicant_id",
        back_populates="applicant",
        cascade="all, delete-orphan",
    )
    received_applications: Mapped[list["Application"]] = relationship(
        "Application",
        foreign_keys="Application.post_author_id",
        back_populates="post_author",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} username={self.username}>"
