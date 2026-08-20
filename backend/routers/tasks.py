from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from database import get_db
from models import Task, ProjectMember, User
from schemas import TaskCreate, TaskUpdate, TaskOut
from deps import get_current_user, get_project_member

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])

@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    # If an assignee was given, confirm they're actually a member of this project
    if payload.assignee_id is not None:
        assignee_membership = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == payload.assignee_id)
            .first()
        )
        if not assignee_membership:
            raise HTTPException(status_code=400, detail="Assignee is not a member of this project")

    task = Task(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        assignee_id=payload.assignee_id,
        created_by=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("", response_model=list[TaskOut])
def list_tasks(
    project_id: int,
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
    assignee_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
):
    query = (
        db.query(Task)
        .options(joinedload(Task.assignee))
        .filter(Task.project_id == project_id)
    )
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)
    if priority is not None:
        query = query.filter(Task.priority == priority)
    return query.all()

@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    payload: TaskUpdate,
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    project_id: int,
    task_id: int,
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()