from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from database import get_db
from models import Task, ProjectMember, User, ActionEnum
from schemas import TaskCreate, TaskUpdate, TaskOut
from deps import get_current_user, get_project_member
from activity import log_activity, create_notification

router = APIRouter(prefix="/projects/{project_id}/tasks", tags=["tasks"])




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

@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    payload: TaskCreate,
    current_user: User = Depends(get_current_user),
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
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
    db.flush()  # assigns task.id without fully committing yet

    log_activity(
        db,
        project_id=project_id,
        actor_id=current_user.id,
        actor_name=current_user.name,
        action=ActionEnum.task_created,
        task_id=task.id,
        task_title=task.title,
    )

    if payload.assignee_id is not None:
        assignee = db.query(User).filter(User.id == payload.assignee_id).first()
        log_activity(
            db,
            project_id=project_id,
            actor_id=current_user.id,
            actor_name=current_user.name,
            action=ActionEnum.task_assigned,
            task_id=task.id,
            task_title=task.title,
            detail=f"Assigned to {assignee.name}",
        )

     # Don't notify someone about assigning a task to themselves
    if payload.assignee_id != current_user.id:
        create_notification(
            db,
            user_id=payload.assignee_id,
            project_id=project_id,
            task_id=task.id,
            message=f"You were assigned to \"{task.title}\"",
        )   

    db.commit()
    db.refresh(task)
    return task 


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    payload: TaskUpdate,
    current_user: User = Depends(get_current_user),
    member: ProjectMember = Depends(get_project_member),
    db: Session = Depends(get_db),
):
    task = db.query(Task).filter(Task.id == task_id, Task.project_id == project_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = payload.model_dump(exclude_unset=True)

    if "status" in update_data and update_data["status"] != task.status:
        log_activity(
            db,
            project_id=project_id,
            actor_id=current_user.id,
            actor_name=current_user.name,
            action=ActionEnum.status_changed,
            task_id=task.id,
            task_title=task.title,
            detail=f"{task.status.value} -> {update_data['status']}",
        )

    if "assignee_id" in update_data and update_data["assignee_id"] != task.assignee_id:
        new_assignee = (
            db.query(User).filter(User.id == update_data["assignee_id"]).first()
            if update_data["assignee_id"] else None
        )
        log_activity(
            db,
            project_id=project_id,
            actor_id=current_user.id,
            actor_name=current_user.name,
            action=ActionEnum.task_assigned,
            task_id=task.id,
            task_title=task.title,
            detail=f"Assigned to {new_assignee.name}" if new_assignee else "Unassigned",
        )

        if new_assignee is not None and new_assignee.id != current_user.id:
            create_notification(
                db,
                user_id=new_assignee.id,
                project_id=project_id,
                task_id=task.id,
                message=f"You were assigned to \"{task.title}\"",
            )

    other_fields_changed = any(
        k in update_data for k in ("title", "description", "priority", "due_date")
    )
    if other_fields_changed:
        log_activity(
            db,
            project_id=project_id,
            actor_id=current_user.id,
            actor_name=current_user.name,
            action=ActionEnum.task_edited,
            task_id=task.id,
            task_title=task.title,
        )

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task