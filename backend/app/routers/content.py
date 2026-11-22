"""Notes, reviews, time tracking, reminders, search, analytics, backup and seed data."""

from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, selectinload

from ..auth import get_current_user
from ..database import get_db
from ..models import (
    CalendarEvent, Category, DailyReview, Note, Project, Reminder, Subtask, Tag,
    Task, TimeEntry, utcnow,
)
from ..schemas import (
    NoteIn, NoteOut, ReminderOut, ReminderPatch, ReviewIn, ReviewOut,
    SearchOut, TimeEntryIn, TimeEntryOut,
)

router = APIRouter(tags=["content"])


# ---------------- Bootstrap ----------------
@router.get("/api/bootstrap")
def bootstrap(user=Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).options(
        selectinload(Task.subtasks), selectinload(Task.tags), selectinload(Task.attachments)
    ).filter(Task.user_id == user.id).order_by(Task.sort_order, Task.id).all()
    events = db.query(CalendarEvent).filter(CalendarEvent.user_id == user.id).order_by(CalendarEvent.start_at).all()
    notes = db.query(Note).filter(Note.user_id == user.id).order_by(Note.updated_at.desc()).all()
    reviews = db.query(DailyReview).filter(DailyReview.user_id == user.id).order_by(DailyReview.date.desc()).all()
    entries = db.query(TimeEntry).filter(TimeEntry.user_id == user.id).order_by(TimeEntry.started_at.desc()).all()
    reminders = db.query(Reminder).filter(Reminder.user_id == user.id).order_by(Reminder.remind_at).all()
    return {
        "user": {"id": user.id, "name": user.name, "email": user.email, "avatarColor": user.avatar_color, "timezone": user.timezone, "onboarded": user.onboarded},
        "preferences": _pref(user.id, db),
        "categories": [{"id": c.id, "name": c.name, "color": c.color, "icon": c.icon, "sortOrder": c.sort_order, "isDefault": c.is_default} for c in db.query(Category).filter(Category.user_id == user.id).order_by(Category.sort_order)],
        "projects": [{"id": p.id, "name": p.name, "description": p.description, "color": p.color, "icon": p.icon, "startDate": p.start_date.isoformat() if p.start_date else None, "targetDate": p.target_date.isoformat() if p.target_date else None, "notes": p.notes, "status": p.status, "sortOrder": p.sort_order} for p in db.query(Project).filter(Project.user_id == user.id).order_by(Project.sort_order)],
        "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in db.query(Tag).filter(Tag.user_id == user.id)],
        "tasks": [_task_json(t) for t in tasks],
        "events": [_event_json(e) for e in events],
        "notes": [_note_json(n) for n in notes],
        "reviews": [_review_json(r) for r in reviews],
        "timeEntries": [{"id": e.id, "taskId": e.task_id, "minutes": e.minutes, "note": e.note, "startedAt": e.started_at.isoformat() if e.started_at else None, "endedAt": e.ended_at.isoformat() if e.ended_at else None} for e in entries],
        "reminders": [{"id": r.id, "taskId": r.task_id, "eventId": r.event_id, "remindAt": r.remind_at.isoformat() if r.remind_at else None, "minutesBefore": r.minutes_before, "message": r.message, "channel": r.channel, "isRead": r.is_read} for r in reminders],
    }


def _pref(user_id, db):
    from ..models import UserPreference
    p = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
    if not p:
        return {"theme": "light", "weekStart": 1, "workStart": "08:00", "workEnd": "20:00", "defaultCalendarView": "week", "defaultPage": "day", "reminderMinutes": 15, "showWeekends": True, "compactMode": False, "focusMessage": "Make today count."}
    return {"theme": p.theme, "weekStart": p.week_start, "workStart": p.work_start, "workEnd": p.work_end, "defaultCalendarView": p.default_calendar_view, "defaultPage": p.default_page, "reminderMinutes": p.reminder_minutes, "showWeekends": p.show_weekends, "compactMode": p.compact_mode, "focusMessage": p.focus_message}


def _task_json(t: Task):
    return {
        "id": t.id, "title": t.title, "description": t.description, "status": t.status,
        "priority": t.priority, "categoryId": t.category_id, "projectId": t.project_id,
        "scheduledDate": t.scheduled_date.isoformat() if t.scheduled_date else None,
        "startTime": t.start_time, "endTime": t.end_time,
        "dueDate": t.due_date.isoformat() if t.due_date else None, "dueTime": t.due_time,
        "estimatedMinutes": t.estimated_minutes, "actualMinutes": t.actual_minutes,
        "isAllDay": t.is_all_day, "isDailyPriority": t.is_daily_priority,
        "priorityRank": t.priority_rank, "sortOrder": t.sort_order,
        "recurrence": t.recurrence,
        "recurrenceEndDate": t.recurrence_end_date.isoformat() if t.recurrence_end_date else None,
        "reminderMinutes": t.reminder_minutes,
        "completedAt": t.completed_at.isoformat() if t.completed_at else None,
        "createdAt": t.created_at.isoformat() if t.created_at else None,
        "updatedAt": t.updated_at.isoformat() if t.updated_at else None,
        "subtasks": [{"id": s.id, "taskId": s.task_id, "title": s.title, "isCompleted": s.is_completed, "kind": s.kind, "sortOrder": s.sort_order} for s in t.subtasks],
        "tagIds": [tag.id for tag in t.tags],
        "dependencyIds": [dep.id for dep in t.dependencies],
        "attachments": [{"id": a.id, "taskId": a.task_id, "filename": a.filename, "url": a.url, "size": a.size} for a in t.attachments],
    }


def _event_json(e: CalendarEvent):
    return {
        "id": e.id, "title": e.title, "description": e.description,
        "startAt": e.start_at.isoformat() if e.start_at else None,
        "endAt": e.end_at.isoformat() if e.end_at else None,
        "allDay": e.all_day, "location": e.location, "color": e.color,
        "categoryId": e.category_id, "projectId": e.project_id, "taskId": e.task_id,
        "recurrence": e.recurrence,
        "recurrenceEndDate": e.recurrence_end_date.isoformat() if e.recurrence_end_date else None,
        "reminderMinutes": e.reminder_minutes,
    }


def _note_json(n: Note):
    return {"id": n.id, "title": n.title, "content": n.content, "folder": n.folder,
            "tagNames": n.tag_names or [], "isPinned": n.is_pinned, "taskId": n.task_id,
            "projectId": n.project_id, "createdAt": n.created_at.isoformat() if n.created_at else None,
            "updatedAt": n.updated_at.isoformat() if n.updated_at else None}


def _review_json(r: DailyReview):
    return {"id": r.id, "date": r.date.isoformat(), "completedText": r.completed_text,
            "notCompletedText": r.not_completed_text, "achievements": r.achievements,
            "moveToTomorrow": r.move_to_tomorrow, "productivityRating": r.productivity_rating,
            "reflection": r.reflection, "updatedAt": r.updated_at.isoformat() if r.updated_at else None}


# ---------------- Notes ----------------
@router.get("/api/notes", response_model=list[NoteOut])
def list_notes(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Note).filter(Note.user_id == user.id).order_by(Note.is_pinned.desc(), Note.updated_at.desc()).all()


@router.post("/api/notes", response_model=NoteOut, status_code=201)
def create_note(payload: NoteIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    note = Note(user_id=user.id, title=payload.title or "Untitled note")
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        if value is not None:
            setattr(note, key, value)
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


@router.patch("/api/notes/{note_id}", response_model=NoteOut)
def patch_note(note_id: int, payload: NoteIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(note, key, value)
    db.commit()
    db.refresh(note)
    return note


@router.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == user.id).first()
    if not note:
        raise HTTPException(404, "Note not found")
    db.delete(note)
    db.commit()


# ---------------- Daily reviews ----------------
@router.get("/api/reviews/{day}", response_model=ReviewOut)
def get_review(day: date, user=Depends(get_current_user), db: Session = Depends(get_db)):
    review = db.query(DailyReview).filter(DailyReview.user_id == user.id, DailyReview.date == day).first()
    if not review:
        review = DailyReview(user_id=user.id, date=day)
        db.add(review)
        db.commit()
        db.refresh(review)
    return review


@router.put("/api/reviews/{day}", response_model=ReviewOut)
def put_review(day: date, payload: ReviewIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    review = db.query(DailyReview).filter(DailyReview.user_id == user.id, DailyReview.date == day).first()
    if not review:
        review = DailyReview(user_id=user.id, date=day)
        db.add(review)
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        if key != "date" and value is not None:
            setattr(review, key, value)
    db.commit()
    db.refresh(review)
    return review


# ---------------- Time entries ----------------
@router.get("/api/time-entries", response_model=list[TimeEntryOut])
def list_time_entries(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(TimeEntry).filter(TimeEntry.user_id == user.id).order_by(TimeEntry.started_at.desc()).all()


@router.post("/api/time-entries", response_model=TimeEntryOut, status_code=201)
def create_time_entry(payload: TimeEntryIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if payload.minutes <= 0:
        raise HTTPException(400, "Duration must be positive")
    entry = TimeEntry(user_id=user.id, task_id=payload.task_id, minutes=payload.minutes,
                      note=payload.note or "", started_at=payload.started_at or utcnow(),
                      ended_at=utcnow())
    if entry.task_id:
        task = db.query(Task).filter(Task.id == entry.task_id, Task.user_id == user.id).first()
        if task:
            task.actual_minutes += payload.minutes
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/api/time-entries/{entry_id}", status_code=204)
def delete_time_entry(entry_id: int, user=Depends(get_current_user), db: Session = Depends(get_db)):
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id, TimeEntry.user_id == user.id).first()
    if not entry:
        raise HTTPException(404, "Time entry not found")
    if entry.task_id:
        task = db.query(Task).filter(Task.id == entry.task_id, Task.user_id == user.id).first()
        if task:
            task.actual_minutes = max(0, task.actual_minutes - entry.minutes)
    db.delete(entry)
    db.commit()


# ---------------- Reminders ----------------
@router.get("/api/reminders", response_model=list[ReminderOut])
def list_reminders(user=Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Reminder).filter(Reminder.user_id == user.id).order_by(Reminder.remind_at).all()


@router.patch("/api/reminders/{reminder_id}", response_model=ReminderOut)
def patch_reminder(reminder_id: int, payload: ReminderPatch, user=Depends(get_current_user), db: Session = Depends(get_db)):
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == user.id).first()
    if not reminder:
        raise HTTPException(404, "Reminder not found")
    for key, value in payload.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(reminder, key, value)
    db.commit()
    db.refresh(reminder)
    return reminder


# ---------------- Search ----------------
@router.get("/api/search", response_model=list[SearchOut])
def search(q: str = "", user=Depends(get_current_user), db: Session = Depends(get_db)):
    q = q.strip()
    if len(q) < 1:
        return []
    pattern = f"%{q}%"
    results: list[SearchOut] = []
    for t in db.query(Task).filter(Task.user_id == user.id, Task.title.ilike(pattern)).limit(20):
        results.append({"kind": "task", "id": t.id, "title": t.title, "subtitle": t.status.replace("_", " "), "href": f"/tasks?task={t.id}"})
    for p in db.query(Project).filter(Project.user_id == user.id, Project.name.ilike(pattern)).limit(10):
        results.append({"kind": "project", "id": p.id, "title": p.name, "subtitle": "Project", "href": f"/projects/{p.id}"})
    for e in db.query(CalendarEvent).filter(CalendarEvent.user_id == user.id, CalendarEvent.title.ilike(pattern)).limit(10):
        results.append({"kind": "event", "id": e.id, "title": e.title, "subtitle": e.start_at.strftime("%b %d, %H:%M"), "href": f"/calendar?event={e.id}"})
    for n in db.query(Note).filter(Note.user_id == user.id, (Note.title.ilike(pattern) | Note.content.ilike(pattern))).limit(10):
        results.append({"kind": "note", "id": n.id, "title": n.title, "subtitle": "Note", "href": f"/notes?note={n.id}"})
    return results


# ---------------- Analytics ----------------
@router.get("/api/analytics")
def analytics(user=Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.user_id == user.id).all()
    entries = db.query(TimeEntry).filter(TimeEntry.user_id == user.id).all()
    today = date.today()
    categories = {c.id: c.name for c in db.query(Category).filter(Category.user_id == user.id)}

    def completed_on(t):
        return t.completed_at.date() if t.completed_at else None

    daily = []
    for i in range(13, -1, -1):
        day = today - timedelta(days=i)
        done = sum(1 for t in tasks if completed_on(t) == day)
        created = sum(1 for t in tasks if t.created_at and t.created_at.date() == day)
        daily.append({"date": day.isoformat(), "completed": done, "created": created})

    weekly = []
    for i in range(7, -1, -1):
        start = today - timedelta(days=today.weekday() + 7 * i)
        end = start + timedelta(days=6)
        done = sum(1 for t in tasks if completed_on(t) and start <= completed_on(t) <= end)
        weekly.append({"start": start.isoformat(), "completed": done})

    monthly = []
    for i in range(5, -1, -1):
        month = today.month - i
        year = today.year
        while month <= 0:
            month += 12
            year -= 1
        done = sum(1 for t in tasks if completed_on(t) and completed_on(t).month == month and completed_on(t).year == year)
        monthly.append({"month": f"{year}-{month:02d}", "completed": done})

    by_category = defaultdict(int)
    for e in entries:
        task = next((t for t in tasks if t.id == e.task_id), None)
        name = categories.get(task.category_id, "Uncategorized") if task else "Uncategorized"
        by_category[name] += e.minutes

    by_weekday = Counter()
    for t in tasks:
        if completed_on(t):
            by_weekday[completed_on(t).strftime("%a")] += 1

    return {
        "daily": daily,
        "weekly": weekly,
        "monthly": monthly,
        "byCategory": [{"name": k, "minutes": v} for k, v in sorted(by_category.items(), key=lambda x: -x[1])],
        "byWeekday": [{"day": d, "count": by_weekday.get(d, 0)} for d in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]],
        "summary": {
            "total": len(tasks),
            "completed": sum(1 for t in tasks if t.status == "completed"),
            "pending": sum(1 for t in tasks if t.status not in ("completed", "cancelled")),
            "overdue": sum(1 for t in tasks if t.due_date and t.due_date < today and t.status != "completed"),
            "trackedMinutes": sum(e.minutes for e in entries),
        },
    }


# ---------------- Backup / restore ----------------
@router.get("/api/export")
def export_data(user=Depends(get_current_user), db: Session = Depends(get_db)):
    data = bootstrap(user, db)
    return {"version": 1, "exportedAt": utcnow().isoformat(), "data": data}


@router.post("/api/import")
def import_data(payload: dict, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Restore a backup exported by /api/export. Replaces the user's data."""
    data = payload.get("data") or payload
    if not isinstance(data, dict) or "tasks" not in data:
        raise HTTPException(400, "Invalid backup file")
    for model in (Reminder, TimeEntry, DailyReview, Note, CalendarEvent, Tag, Task, Project, Category):
        db.query(model).filter(model.user_id == user.id).delete(synchronize_session=False)
    db.commit()

    cats = {}
    for c in data.get("categories", []):
        obj = Category(user_id=user.id, name=c["name"], color=c.get("color", "#7C6CF0"),
                       icon=c.get("icon", "Circle"), sort_order=c.get("sortOrder", 0), is_default=bool(c.get("isDefault")))
        db.add(obj); db.flush(); cats[c["id"]] = obj.id
    projects = {}
    for p in data.get("projects", []):
        obj = Project(user_id=user.id, name=p["name"], description=p.get("description", ""),
                      color=p.get("color", "#5B8DEF"), icon=p.get("icon", "FolderKanban"),
                      start_date=date.fromisoformat(p["startDate"]) if p.get("startDate") else None,
                      target_date=date.fromisoformat(p["targetDate"]) if p.get("targetDate") else None,
                      notes=p.get("notes", ""), status=p.get("status", "active"), sort_order=p.get("sortOrder", 0))
        db.add(obj); db.flush(); projects[p["id"]] = obj.id
    tags = {}
    for t in data.get("tags", []):
        obj = Tag(user_id=user.id, name=t["name"], color=t.get("color", "#94A3B8"))
        db.add(obj); db.flush(); tags[t["id"]] = obj.id
    task_map = {}
    for t in data.get("tasks", []):
        obj = Task(user_id=user.id, title=t["title"], description=t.get("description", ""),
                   status=t.get("status", "not_started"), priority=t.get("priority", "none"),
                   category_id=cats.get(t.get("categoryId")), project_id=projects.get(t.get("projectId")),
                   scheduled_date=date.fromisoformat(t["scheduledDate"]) if t.get("scheduledDate") else None,
                   start_time=t.get("startTime"), end_time=t.get("endTime"),
                   due_date=date.fromisoformat(t["dueDate"]) if t.get("dueDate") else None,
                   due_time=t.get("dueTime"), estimated_minutes=t.get("estimatedMinutes", 0),
                   actual_minutes=t.get("actualMinutes", 0), is_all_day=bool(t.get("isAllDay")),
                   is_daily_priority=bool(t.get("isDailyPriority")), priority_rank=t.get("priorityRank"),
                   sort_order=t.get("sortOrder", 0), recurrence=t.get("recurrence", "none"),
                   reminder_minutes=t.get("reminderMinutes"),
                   completed_at=datetime.fromisoformat(t["completedAt"]) if t.get("completedAt") else None)
        from ..models import Subtask
        for s in t.get("subtasks", []):
            obj.subtasks.append(Subtask(title=s["title"], is_completed=bool(s.get("isCompleted")),
                                        kind=s.get("kind", "subtask"), sort_order=s.get("sortOrder", 0)))
        obj.tags = [db.get(Tag, tags[x]) for x in t.get("tagIds", []) if x in tags]
        db.add(obj); db.flush(); task_map[t["id"]] = obj.id
    for e in data.get("events", []):
        db.add(CalendarEvent(user_id=user.id, title=e["title"], description=e.get("description", ""),
                             start_at=datetime.fromisoformat(e["startAt"]), end_at=datetime.fromisoformat(e["endAt"]),
                             all_day=bool(e.get("allDay")), location=e.get("location", ""), color=e.get("color", "#7C6CF0"),
                             category_id=cats.get(e.get("categoryId")), project_id=projects.get(e.get("projectId")),
                             task_id=task_map.get(e.get("taskId")), recurrence=e.get("recurrence", "none"),
                             reminder_minutes=e.get("reminderMinutes")))
    for n in data.get("notes", []):
        db.add(Note(user_id=user.id, title=n.get("title", "Untitled"), content=n.get("content", ""),
                    folder=n.get("folder", "General"), tag_names=n.get("tagNames", []),
                    is_pinned=bool(n.get("isPinned")), task_id=task_map.get(n.get("taskId")),
                    project_id=projects.get(n.get("projectId"))))
    for r in data.get("reviews", []):
        db.add(DailyReview(user_id=user.id, date=date.fromisoformat(r["date"]),
                           completed_text=r.get("completedText", ""), not_completed_text=r.get("notCompletedText", ""),
                           achievements=r.get("achievements", ""), move_to_tomorrow=r.get("moveToTomorrow", ""),
                           productivity_rating=r.get("productivityRating", 0), reflection=r.get("reflection", "")))
    for te in data.get("timeEntries", []):
        db.add(TimeEntry(user_id=user.id, task_id=task_map.get(te.get("taskId")), minutes=te.get("minutes", 0),
                         note=te.get("note", ""), started_at=datetime.fromisoformat(te["startedAt"]) if te.get("startedAt") else utcnow()))
    for r in data.get("reminders", []):
        db.add(Reminder(user_id=user.id, task_id=task_map.get(r.get("taskId")), remind_at=datetime.fromisoformat(r["remindAt"]),
                        minutes_before=r.get("minutesBefore", 15), message=r.get("message", ""), channel=r.get("channel", "in_app")))
    db.commit()
    return {"ok": True, "tasks": len(task_map)}


# ---------------- Seed demo data ----------------
@router.post("/api/seed", status_code=201)
def seed_demo(user=Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(Task).filter(Task.user_id == user.id).count() > 0:
        return {"ok": False, "message": "Workspace already has data"}
    today = date.today()
    cats = {}
    for name, color, icon in [("Development", "#5B8DEF", "Code2"), ("Learning", "#8B7CF6", "BookOpen"),
                              ("Research", "#EC4899", "FlaskConical"), ("Personal", "#34D399", "Heart"),
                              ("Health", "#F59E0B", "Activity")]:
        c = Category(user_id=user.id, name=name, color=color, icon=icon)
        db.add(c); db.flush(); cats[name] = c.id
    projects = {}
    for name, desc, color in [("AI Research", "Study and reproduce foundational AI papers", "#8B7CF6"),
                              ("Competitive Programming", "Problem solving practice", "#5B8DEF"),
                              ("Development", "Build products and systems", "#34D399")]:
        p = Project(user_id=user.id, name=name, description=desc, color=color,
                    start_date=today - timedelta(days=7), target_date=today + timedelta(days=60))
        db.add(p); db.flush(); projects[name] = p.id
    demo = [
        ("Study Transformer Architecture", "Understand the original Transformer architecture end to end.", "Learning", "AI Research", "high", 1, "09:00", "10:30", ["Read the paper", "Implement attention"]),
        ("Read Attention Is All You Need", "Go through the paper and take notes.", "Research", "AI Research", "medium", 0, "11:00", "12:00", ["Sections 1-3", "Sections 4-6"]),
        ("Implement Multi-Head Attention", "Build a small-scale implementation from scratch.", "Development", "AI Research", "urgent", 0, "14:00", "15:30", ["Scaled dot-product", "Multi-head wrapper"]),
        ("Solve 3 graph problems", "Practice BFS, DFS and shortest paths.", "Learning", "Competitive Programming", "medium", None, None, None, ["Problem 1", "Problem 2", "Problem 3"]),
        ("Study Dynamic Programming", "Review classic DP patterns.", "Learning", "Competitive Programming", "low", None, None, None, []),
        ("Build authentication system", "Implement JWT-based auth for the app.", "Development", "Development", "high", 1, "16:00", "17:00", ["Login endpoint", "Refresh token"]),
        ("Implement API endpoints", "CRUD endpoints for core resources.", "Development", "Development", "high", None, None, None, []),
        ("Write unit tests", "Cover critical paths with tests.", "Development", "Development", "medium", None, None, None, []),
        ("Morning routine", "Stretch, meditate, and plan the day.", "Personal", None, "none", None, "07:30", "08:00", []),
        ("Evening review", "Reflect on the day and plan tomorrow.", "Personal", None, "low", None, "21:00", "21:30", []),
    ]
    for i, (title, desc, cat, proj, prio, day_offset, st, et, subs) in enumerate(demo):
        task = Task(user_id=user.id, title=title, description=desc, status="not_started", priority=prio,
                    category_id=cats[cat], project_id=projects.get(proj),
                    scheduled_date=today + timedelta(days=day_offset or 0), start_time=st, end_time=et,
                    due_date=today + timedelta(days=7), estimated_minutes=90 if st else 60, sort_order=i)
        if i < 3:
            task.is_daily_priority = True
            task.priority_rank = i + 1
        for j, s in enumerate(subs):
            task.subtasks.append(Subtask(title=s, sort_order=j))
        db.add(task)
    db.add(Note(user_id=user.id, title="Daily planning ritual", content="<p>Review priorities, block time for deep work, and leave space for the unexpected.</p>", folder="Personal", tag_names=["planning"], is_pinned=True))
    db.add(CalendarEvent(user_id=user.id, title="Deep work block", description="Focus on AI Research", start_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=10), end_at=datetime.combine(today, datetime.min.time()) + timedelta(hours=12), color="#8B7CF6", category_id=cats["Research"]))
    db.commit()
    return {"ok": True, "message": "Demo workspace created"}
