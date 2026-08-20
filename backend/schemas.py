from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: EmailStr
    name: str

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class ProjectCreate(BaseModel):
    name: str

class ProjectOut(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class InviteMemberRequest(BaseModel):
    email: EmailStr

class ProjectMemberOut(BaseModel):
    id: int
    user_id: int
    role: str
    user: UserOut  # nested — shows member's name/email, not just their id

    class Config:
        from_attributes = True    