from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field
from app.models.post import PostType, PostStatus
from app.schemas.user import UserPublic


class PostBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=300)
    description: str = Field(..., min_length=20, max_length=5000)
    looking_for: str = Field(..., min_length=10, max_length=1000)
    stage: Optional[str] = Field(None, max_length=100)
    industry: Optional[str] = Field(None, max_length=150)
    skills_required: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=200)
    is_remote: bool = True
    compensation: Optional[str] = Field(None, max_length=200)


class PostCreate(PostBase):
    type: PostType


class PostUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=300)
    description: Optional[str] = Field(None, min_length=20, max_length=5000)
    looking_for: Optional[str] = Field(None, min_length=10, max_length=1000)
    stage: Optional[str] = Field(None, max_length=100)
    industry: Optional[str] = Field(None, max_length=150)
    skills_required: Optional[str] = Field(None, max_length=500)
    location: Optional[str] = Field(None, max_length=200)
    is_remote: Optional[bool] = None
    compensation: Optional[str] = Field(None, max_length=200)
    status: Optional[PostStatus] = None


class PostResponse(PostBase):
    id: int
    type: PostType
    status: PostStatus
    author_id: int
    author: UserPublic
    views_count: int
    applications_count: int
    created_at: datetime
    updated_at: datetime
    # Indicates if current user has applied (populated at API level)
    user_has_applied: Optional[bool] = None
    user_application_status: Optional[str] = None

    model_config = {"from_attributes": True}


class PostListResponse(BaseModel):
    id: int
    type: PostType
    status: PostStatus
    title: str
    description: str
    looking_for: str
    stage: Optional[str] = None
    industry: Optional[str] = None
    skills_required: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool
    compensation: Optional[str] = None
    author_id: int
    author: UserPublic
    views_count: int
    applications_count: int
    created_at: datetime
    user_has_applied: Optional[bool] = None
    user_application_status: Optional[str] = None

    model_config = {"from_attributes": True}


class PaginatedPosts(BaseModel):
    items: list[PostListResponse]
    total: int
    page: int
    per_page: int
    pages: int
