from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import Attachment, Category, Project, Reminder, Subtask, Tag, Task, TaskDependency, utcnow
from ..schemas import (
    AttachmentIn,
    PrioritySelectIn,
    ReorderIn,
    SubtaskIn,
    SubtaskOut,
    SubtaskPatch,
    TaskIn,
    TaskOut,
    TaskPatch,
)
from ..utils import step_recurrence

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


def _load(db: Session, task_id: int, user_id: int) -> Task:
    task = (
        db.query(Task)
        .options(selectinload(Task.subtasks), selectinload(Task.tags), selectinload(Task.attachments))
        .filter(Task.id == task_id, Task.user_id == user_id)
        .first()
    )
    if not task:
        raise HTTPException(404, "Task not found")
    return task


def _apply_fields(task: Task, data: dict, user_id: int, db: Session) -> None:
    allowed = {
        "title", "description", "status", "priority", "category_id", "project_id",
        "scheduled_date", "start_time", "end_time", "due_date", "due_time",
        "estimated_minutes", "actual_minutes", "is_all_day", "is_daily_priority",
        "priority_rank", "sort_order", "recurrence", "recurrence_end_date",
        "reminder_minutes", "completed_at",
    }
    nullable = {
        "category_id", "project_id", "scheduled_date", "start_time", "end_time",
        "due_date", "due_time", "priority_rank", "recurrence_end_date",
        "reminder_minutes", "completed_at",
    }
    for key, value in data.items():
        if key in allowed and (value is not None or key in nullable):
            setattr(task, key, value)
    if "category_id" in data and data["category_id"] is not None:
        if not db.query(Category).filter(Category.id == data["category_id"], Category.user_id == user_id).first():
            raise HTTPException(400, "Invalid category")
    if "project_id" in data and data["project_id"] is not None:
        if not db.query(Project).filter(Project.id == data["project_id"], Project.user_id == user_id).first():
            raise HTTPException(400, "Invalid project")
    if "tag_ids" in data:
        ids = data["tag_ids"] or []
        tags = db.query(Tag).filter(Tag.id.in_(ids), Tag.user_id == user_id).all() if ids else []
        task.tags = tags
    if "dependency_ids" in data:
        ids = [x for x in (data["dependency_ids"] or []) if x != task.id]
        deps = db.query(Task).filter(Task.id.in_(ids), Task.user_id == user_id).all() if ids else []
        db.query(TaskDependency).filter(TaskDependency.task_id == task.id).delete(synchronize_session=False)
        for dep in deps:
            db.add(TaskDependency(task_id=task.id, depends_on_task_id=dep.id))
    if data.get("status") == "completed" and task.completed_at is None:
        task.completed_at = utcnow()
    if data.get("status") and data["status"] != "completed":
        task.completed_at = None


def _sync_reminder(task: Task, user_id: int, db: Session, changed: bool = True) -> None:
    if not changed:
        return
    existing = db.query(Reminder).filter(Reminder.task_id == task.id).first()
    when_date = task.due_date or task.scheduled_date
    if not task.reminder_minutes or not when_date:
        if existing:
            db.delete(existing)
        return
    try:
        clock = datetime.strptime(task.due_time or task.start_time or "09:00", "%H:%M").time()
    except ValueError:
        clock = datetime.strptime("09:00", "%H:%M").time()
    remind_at = datetime.combine(when_date, clock) - timedelta(minutes=task.reminder_minutes)
    if existing:
        existing.remind_at = remind_at
        existing.minutes_before = task.reminder_minutes
        existing.message = f"Reminder: {task.title}"
        existing.is_read = False
    else:
        db.add(Reminder(user_id=user_id, task_id=task.id, remind_at=remind_at,
                        minutes_before=task.reminder_minutes, message=f"Reminder: {task.title}"))


@router.get("", response_model=list[TaskOut])
def list_tasks(
    status: str | None = None,
    priority: str | None = None,
    category_id: int | None = None,
    project_id: int | None = None,
    from_date: date | None = None,
    to_date: date | None = None,
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Task).options(
        selectinload(Task.subtasks), selectinload(Task.tags), selectinload(Task.attachments)
    ).filter(Task.user_id == user.id)
    if status:
        q = q.filter(Task.status == status)
    if priority:
        q = q.filter(Task.priority == priority)
    if category_id:
        q = q.filter(Task.category_id == category_id)
    if project_id:
        q = q.filter(Task.project_id == project_id)
    if from_date:
        q = q.filter(Task.scheduled_date >= from_date)
    if to_date:
        q = q.filter(Task.scheduled_date <= to_date)
    return q.order_by(Task.sort_order, Task.id).all()


@router.post("", response_model=TaskOut, status_code=201)
def create_task(payload: TaskIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.title.strip():
        raise HTTPException(400, "A task title is required")
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    subtasks = data.pop("subtasks", None) or []
    tag_ids = data.pop("tag_ids", None)
    dependency_ids = data.pop("dependency_ids", None)
    task = Task(user_id=user.id, title=payload.title.strip())
    _apply_fields(task, data, user.id, db)
    if tag_ids is not None:
        task.tags = db.query(Tag).filter(Tag.id.in_(tag_ids), Tag.user_id == user.id).all() if tag_ids else []
    for i, s in enumerate(subtasks):
        task.subtasks.append(Subtask(title=s.title, is_completed=bool(s.is_completed), kind=s.kind or "subtask", sort_order=s.sort_order if s.sort_order is not None else i))
    db.add(task)
    db.flush()
    if dependency_ids is not None:
        _apply_fields(task, {"dependency_ids": dependency_ids}, user.id, db)
    _sync_reminder(task, user.id, db)
    db.commit()
    return _load(db, task.id, user.id)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    return _load(db, task_id, user.id)


@router.patch("/{task_id}", response_model=TaskOut)
def patch_task(task_id: int, payload: TaskPatch, user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = _load(db, task_id, user.id)
    was_status = task.status
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    _apply_fields(task, data, user.id, db)
    _sync_reminder(task, user.id, db, changed=any(k in data for k in ("reminder_minutes", "due_date", "due_time", "scheduled_date", "start_time", "title")))
    db.commit()
    if was_status != "completed" and task.status == "completed" and task.recurrence != "none":
        _generate_next(task, user.id, db)
    return _load(db, task_id, user.id)


@router.delete("/{task_id}", status_code=204)
def delete_task(task_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = _load(db, task_id, user.id)
    db.delete(task)
    db.commit()


@router.patch("/{task_id}/complete", response_model=TaskOut)
def complete_task(task_id: int, payload: dict | None = None, user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = _load(db, task_id, user.id)
    done = True
    if payload and "completed" in payload:
        done = bool(payload["completed"])
    if done:
        task.status = "completed"
        task.completed_at = utcnow()
    else:
        task.status = "not_started"
        task.completed_at = None
    db.commit()
    if done and task.recurrence != "none":
        _generate_next(task, user.id, db)
    return _load(db, task_id, user.id)


def _generate_next(task: Task, user_id: int, db: Session) -> None:
    """Create the next occurrence of a recurring task, if applicable."""
    next_date = step_recurrence(task.scheduled_date or task.due_date or date.today(), task.recurrence)
    if not next_date:
        return
    if task.recurrence_end_date and next_date > task.recurrence_end_date:
        return
    existing = db.query(Task).filter(
        Task.user_id == user_id,
        Task.title == task.title,
        Task.scheduled_date == next_date,
        Task.status != "completed",
    ).first()
    if existing:
        return
    new_task = Task(
        user_id=user_id,
        title=task.title,
        description=task.description,
        status="not_started",
        priority=task.priority,
        category_id=task.category_id,
        project_id=task.project_id,
        scheduled_date=next_date,
        start_time=task.start_time,
        end_time=task.end_time,
        due_date=step_recurrence(task.due_date, task.recurrence) if task.due_date else None,
        due_time=task.due_time,
        estimated_minutes=task.estimated_minutes,
        is_all_day=task.is_all_day,
        recurrence=task.recurrence,
        recurrence_end_date=task.recurrence_end_date,
        reminder_minutes=task.reminder_minutes,
        sort_order=task.sort_order,
    )
    new_task.tags = list(task.tags)
    for s in task.subtasks:
        new_task.subtasks.append(Subtask(title=s.title, kind=s.kind, sort_order=s.sort_order))
    db.add(new_task)
    db.flush()
    _sync_reminder(new_task, user_id, db)
    db.commit()


@router.post("/{task_id}/subtasks", response_model=SubtaskOut, status_code=201)
def add_subtask(task_id: int, payload: SubtaskIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = _load(db, task_id, user.id)
    if not payload.title.strip():
        raise HTTPException(400, "Subtask title required")
    count = len(task.subtasks)
    sub = Subtask(
        task_id=task.id,
        title=payload.title.strip(),
        is_completed=bool(payload.is_completed),
        kind=payload.kind or "subtask",
        sort_order=payload.sort_order if payload.sort_order is not None else count,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)
    return sub


@router.patch("/subtasks/{subtask_id}", response_model=SubtaskOut)
def patch_subtask(subtask_id: int, payload: SubtaskPatch, user=Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subtask).join(Task).filter(Subtask.id == subtask_id, Task.user_id == user.id).first()
    if not sub:
        raise HTTPException(404, "Subtask not found")
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(sub, key, value)
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/subtasks/{subtask_id}", status_code=204)
def delete_subtask(subtask_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    sub = db.query(Subtask).join(Task).filter(Subtask.id == subtask_id, Task.user_id == user.id).first()
    if not sub:
        raise HTTPException(404, "Subtask not found")
    db.delete(sub)
    db.commit()


@router.post("/reorder", status_code=204)
def reorder(payload: ReorderIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    for index, task_id in enumerate(payload.ids):
        task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
        if task:
            task.sort_order = index
    if payload.field == "priority_rank":
        for index, task_id in enumerate(payload.ids):
            task = db.query(Task).filter(Task.id == task_id, Task.user_id == user.id).first()
            if task:
                task.priority_rank = index + 1
                task.is_daily_priority = True
    db.commit()


@router.post("/{task_id}/attachments", status_code=201)
def add_attachment(task_id: int, payload: AttachmentIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = _load(db, task_id, user.id)
    if not payload.filename.strip() or not payload.data_url.startswith("data:"):
        raise HTTPException(400, "Invalid attachment")
    if len(payload.data_url) > 8 * 1024 * 1024:
        raise HTTPException(413, "Attachment too large (8 MB max)")
    att = Attachment(task_id=task.id, filename=payload.filename.strip()[:255],
                     url=payload.data_url, size=len(payload.data_url))
    db.add(att)
    db.commit()
    db.refresh(att)
    return att


@router.delete("/attachments/{attachment_id}", status_code=204)
def delete_attachment(attachment_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    att = db.query(Attachment).join(Task).filter(Attachment.id == attachment_id, Task.user_id == user.id).first()
    if not att:
        raise HTTPException(404, "Attachment not found")
    db.delete(att)
    db.commit()


@router.post("/select-priority", status_code=204)
def select_priority(payload: PrioritySelectIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == payload.task_id, Task.user_id == user.id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    if payload.rank == 0:
        task.is_daily_priority = False
        task.priority_rank = None
    else:
        if payload.rank < 1 or payload.rank > 3:
            raise HTTPException(400, "Rank must be between 1 and 3")
        current = db.query(Task).filter(
            Task.user_id == user.id, Task.priority_rank == payload.rank, Task.id != task.id
        ).first()
        if current:
            current.is_daily_priority = False
            current.priority_rank = None
        task.is_daily_priority = True
        task.priority_rank = payload.rank
    db.commit()
