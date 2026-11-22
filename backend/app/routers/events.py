from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import CalendarEvent, Reminder, utcnow
from ..schemas import EventIn, EventOut, EventPatch
from ..utils import step_recurrence

router = APIRouter(prefix="/api/events", tags=["events"])


def _get(db: Session, event_id: int, user_id: int) -> CalendarEvent:
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id, CalendarEvent.user_id == user_id).first()
    if not event:
        raise HTTPException(404, "Event not found")
    return event


def _sync_reminder(event: CalendarEvent, user_id: int, db: Session) -> None:
    existing = db.query(Reminder).filter(Reminder.event_id == event.id).first()
    if not event.reminder_minutes:
        if existing:
            db.delete(existing)
        return
    remind_at = event.start_at - timedelta(minutes=event.reminder_minutes)
    if existing:
        existing.remind_at = remind_at
        existing.minutes_before = event.reminder_minutes
        existing.message = f"Reminder: {event.title}"
        existing.is_read = False
    else:
        db.add(Reminder(user_id=user_id, event_id=event.id, remind_at=remind_at,
                        minutes_before=event.reminder_minutes, message=f"Reminder: {event.title}"))


@router.get("", response_model=list[EventOut])
def list_events(from_at=None, to_at=None, user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(CalendarEvent).filter(CalendarEvent.user_id == user.id)
    if from_at:
        q = q.filter(CalendarEvent.end_at >= from_at)
    if to_at:
        q = q.filter(CalendarEvent.start_at <= to_at)
    return q.order_by(CalendarEvent.start_at).all()


@router.post("", response_model=EventOut, status_code=201)
def create_event(payload: EventIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if not payload.title.strip():
        raise HTTPException(400, "An event title is required")
    if payload.end_at <= payload.start_at:
        raise HTTPException(400, "End time must be after start time")
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    event = CalendarEvent(user_id=user.id, title=payload.title.strip())
    for key, value in data.items():
        if key in ("title", "description", "start_at", "end_at", "all_day", "location", "color", "category_id", "project_id", "task_id", "recurrence", "recurrence_end_date", "reminder_minutes"):
            if value is not None or key in ("description", "all_day", "location", "color", "category_id", "project_id", "task_id", "recurrence", "recurrence_end_date", "reminder_minutes"):
                setattr(event, key, value)
    db.add(event)
    db.flush()
    _sync_reminder(event, user.id, db)
    db.commit()
    db.refresh(event)
    return event


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    return _get(db, event_id, user.id)


@router.patch("/{event_id}", response_model=EventOut)
def patch_event(event_id: int, payload: EventPatch, user=Depends(get_current_user), db: Session = Depends(get_db)):
    event = _get(db, event_id, user.id)
    data = payload.model_dump(exclude_unset=True, by_alias=False)
    if data.get("start_at") or data.get("end_at"):
        start = data.get("start_at") or event.start_at
        end = data.get("end_at") or event.end_at
        if end <= start:
            raise HTTPException(400, "End time must be after start time")
    for key, value in data.items():
        if value is not None or key in ("description", "all_day", "location", "color", "category_id", "project_id", "task_id", "recurrence", "recurrence_end_date", "reminder_minutes"):
            setattr(event, key, value)
    _sync_reminder(event, user.id, db)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    event = _get(db, event_id, user.id)
    db.delete(event)
    db.commit()


@router.post("/{event_id}/duplicate", response_model=EventOut, status_code=201)
def duplicate_event(event_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    event = _get(db, event_id, user.id)
    copy = CalendarEvent(
        user_id=user.id,
        title=event.title + " (copy)",
        description=event.description,
        start_at=event.start_at + timedelta(days=1),
        end_at=event.end_at + timedelta(days=1),
        all_day=event.all_day,
        location=event.location,
        color=event.color,
        category_id=event.category_id,
        project_id=event.project_id,
        task_id=event.task_id,
        recurrence="none",
        reminder_minutes=event.reminder_minutes,
    )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy
