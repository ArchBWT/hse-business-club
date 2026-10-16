from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_.-]+$")
    full_name: str = Field(..., min_length=2, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    bio: Optional[str] = Field(None, max_length=1000)
    telegram_handle: Optional[str] = Field(None, max_length=100)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[str] = Field(None, max_length=500)
    skills_tags: Optional[str] = Field(None, max_length=500)


class UserPublic(BaseModel):
    id: int
    username: str
    full_name: str
    bio: Optional[str] = None
    telegram_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    avatar_url: Optional[str] = None
    skills_tags: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserMe(UserPublic):
    email: str
    is_admin: bool
    role: UserRole
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserAdminView(UserMe):
    is_active: bool

    model_config = {"from_attributes": True}
