import enum
from datetime import datetime
from sqlalchemy import (
    Integer, String, DateTime, Text, ForeignKey,
    Enum as SAEnum, func, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    withdrawn = "withdrawn"


class Application(Base):
    __tablename__ = "applications"
    __table_args__ = (
        # A user can only apply once per post
        UniqueConstraint("post_id", "applicant_id", name="uq_application_post_applicant"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    applicant_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Denormalized for quick access without joining posts->users
    post_author_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Cover letter / motivation
    cover_letter: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(ApplicationStatus, name="applicationstatus"),
        default=ApplicationStatus.pending,
        nullable=False,
        index=True,
    )

    # Response message from post author
    response_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    post: Mapped["Post"] = relationship("Post", back_populates="applications")
    applicant: Mapped["User"] = relationship(
        "User", foreign_keys=[applicant_id], back_populates="sent_applications"
    )
    post_author: Mapped["User"] = relationship(
        "User", foreign_keys=[post_author_id], back_populates="received_applications"
    )

    def __repr__(self) -> str:
        return f"<Application id={self.id} post_id={self.post_id} status={self.status}>"
