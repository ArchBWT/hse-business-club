from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.application import ApplicationStatus
from app.schemas.user import UserPublic
from app.schemas.post import PostListResponse


class ApplicationCreate(BaseModel):
    cover_letter: Optional[str] = Field(None, max_length=2000)


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus
    response_message: Optional[str] = Field(None, max_length=1000)


class ApplicationResponse(BaseModel):
    id: int
    post_id: int
    applicant_id: int
    post_author_id: int
    cover_letter: Optional[str] = None
    status: ApplicationStatus
    response_message: Optional[str] = None
    applicant: UserPublic
    post: PostListResponse
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApplicationShort(BaseModel):
    """Compact view for listing applications on a post (author perspective)."""
    id: int
    post_id: int
    applicant_id: int
    cover_letter: Optional[str] = None
    status: ApplicationStatus
    response_message: Optional[str] = None
    applicant: UserPublic
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
