from sqlalchemy.orm import Session
from models import ActivityLog, ActionEnum, Notification

def log_activity(
    db: Session,
    project_id: int,
    actor_id: int,
    actor_name: str,
    action: ActionEnum,
    task_id: int | None = None,
    task_title: str | None = None,
    detail: str | None = None,
) -> None:
    entry = ActivityLog(
        project_id=project_id,
        actor_id=actor_id,
        actor_name=actor_name,
        task_id=task_id,
        task_title=task_title,
        action=action,
        detail=detail,
    )
    db.add(entry)

def create_notification(
    db: Session,
    user_id: int,
    project_id: int,
    message: str,
    task_id: int | None = None,
) -> None:
    notification = Notification(
        user_id=user_id,
        project_id=project_id,
        task_id=task_id,
        message=message,
    )
    db.add(notification)    
   