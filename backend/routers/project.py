from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import User, Project, ProjectMember, RoleEnum
from schemas import ProjectCreate, ProjectOut, InviteMemberRequest, ProjectMemberOut
from deps import get_current_user, get_project_member

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = Project(name=payload.name, owner_id=current_user.id)
    db.add(project)
    db.commit()
    db.refresh(project)

    # The creator is automatically an admin member of their own project
    membership = ProjectMember(project_id=project.id, user_id=current_user.id, role=RoleEnum.admin)
    db.add(membership)
    db.commit()

    return project

@router.get("", response_model=list[ProjectOut])
def list_my_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Only projects where the current user has a membership row —
    # this is what makes "I only see projects shared with me" true
    return (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )

@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: int,
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    # If we got here, get_project_member already confirmed membership.
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    if member.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only admins can delete this project")
    project = db.query(Project).filter(Project.id == project_id).first()
    db.delete(project)
    db.commit()

@router.post("/{project_id}/invite", response_model=ProjectMemberOut, status_code=status.HTTP_201_CREATED)
def invite_member(
    project_id: int,
    payload: InviteMemberRequest,
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    if member.role != RoleEnum.admin:
        raise HTTPException(status_code=403, detail="Only admins can invite members")

    user_to_invite = db.query(User).filter(User.email == payload.email).first()
    if not user_to_invite:
        raise HTTPException(status_code=404, detail="No user found with that email")

    existing = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user_to_invite.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this project")

    new_member = ProjectMember(project_id=project_id, user_id=user_to_invite.id, role=RoleEnum.member)
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    return new_member

@router.get("/{project_id}/members", response_model=list[ProjectMemberOut])
def list_members(
    project_id: int,
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    return (
        db.query(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .filter(ProjectMember.project_id == project_id)
        .all()
    )