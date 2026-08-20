from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import List, Optional
from datetime import date

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


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[date] = None
    assignee_id: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    assignee_id: Optional[int] = None  

class TaskOut(BaseModel):
    id: int
    project_id: int
    title: str
    description: Optional[str]
    status: str
    priority: str
    due_date: Optional[date]
    assignee_id: Optional[int]
    assignee: Optional[UserOut] = None
    created_by: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
       

          