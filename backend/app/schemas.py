"""Pydantic schemas. The wire format uses camelCase."""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
        extra="ignore",
    )


# ---------- Auth ----------
class RegisterIn(CamelModel):
    name: str
    email: str
    password: str
    timezone: str = "Asia/Kolkata"


class LoginIn(CamelModel):
    email: str
    password: str


class UserOut(CamelModel):
    id: int
    name: str
    email: str
    avatar_color: str
    timezone: str
    onboarded: bool


class TokenOut(CamelModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProfileIn(CamelModel):
    name: str | None = None
    timezone: str | None = None
    avatar_color: str | None = None
    onboarded: bool | None = None


# ---------- Preferences ----------
class PreferenceIn(CamelModel):
    theme: str | None = None
    week_start: int | None = None
    work_start: str | None = None
    work_end: str | None = None
    default_calendar_view: str | None = None
    default_page: str | None = None
    reminder_minutes: int | None = None
    show_weekends: bool | None = None
    compact_mode: bool | None = None
    focus_message: str | None = None


class PreferenceOut(CamelModel):
    theme: str
    week_start: int
    work_start: str
    work_end: str
    default_calendar_view: str
    default_page: str
    reminder_minutes: int
    show_weekends: bool
    compact_mode: bool
    focus_message: str


# ---------- Simple entities ----------
class CategoryIn(CamelModel):
    name: str
    color: str | None = None
    icon: str | None = None
    sort_order: int | None = None
    is_default: bool | None = None


class CategoryOut(CamelModel):
    id: int
    name: str
    color: str
    icon: str
    sort_order: int
    is_default: bool


class ProjectIn(CamelModel):
    name: str
    description: str | None = None
    color: str | None = None
    icon: str | None = None
    start_date: date | None = None
    target_date: date | None = None
    notes: str | None = None
    status: str | None = None
    sort_order: int | None = None


class ProjectOut(CamelModel):
    id: int
    name: str
    description: str
    color: str
    icon: str
    start_date: date | None
    target_date: date | None
    notes: str
    status: str
    sort_order: int


class TagIn(CamelModel):
    name: str
    color: str | None = None


class TagOut(CamelModel):
    id: int
    name: str
    color: str


class SubtaskIn(CamelModel):
    title: str
    is_completed: bool | None = None
    kind: str | None = None
    sort_order: int | None = None


class SubtaskOut(CamelModel):
    id: int
    task_id: int
    title: str
    is_completed: bool
    kind: str
    sort_order: int


class SubtaskPatch(CamelModel):
    title: str | None = None
    is_completed: bool | None = None
    kind: str | None = None
    sort_order: int | None = None


class AttachmentIn(CamelModel):
    filename: str
    data_url: str


class AttachmentOut(CamelModel):
    id: int
    task_id: int
    filename: str
    url: str
    size: int


# ---------- Tasks ----------
class TaskIn(CamelModel):
    title: str
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    category_id: int | None = None
    project_id: int | None = None
    scheduled_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    due_date: date | None = None
    due_time: str | None = None
    estimated_minutes: int | None = None
    actual_minutes: int | None = None
    is_all_day: bool | None = None
    is_daily_priority: bool | None = None
    priority_rank: int | None = None
    sort_order: int | None = None
    recurrence: str | None = None
    recurrence_end_date: date | None = None
    reminder_minutes: int | None = None
    tag_ids: list[int] | None = None
    dependency_ids: list[int] | None = None
    subtasks: list[SubtaskIn] | None = None


class TaskPatch(CamelModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    category_id: int | None = None
    project_id: int | None = None
    scheduled_date: date | None = None
    start_time: str | None = None
    end_time: str | None = None
    due_date: date | None = None
    due_time: str | None = None
    estimated_minutes: int | None = None
    actual_minutes: int | None = None
    is_all_day: bool | None = None
    is_daily_priority: bool | None = None
    priority_rank: int | None = None
    sort_order: int | None = None
    recurrence: str | None = None
    recurrence_end_date: date | None = None
    reminder_minutes: int | None = None
    tag_ids: list[int] | None = None
    dependency_ids: list[int] | None = None
    completed_at: datetime | None = None


class TaskOut(CamelModel):
    id: int
    title: str
    description: str
    status: str
    priority: str
    category_id: int | None
    project_id: int | None
    scheduled_date: date | None
    start_time: str | None
    end_time: str | None
    due_date: date | None
    due_time: str | None
    estimated_minutes: int
    actual_minutes: int
    is_all_day: bool
    is_daily_priority: bool
    priority_rank: int | None
    sort_order: int
    recurrence: str
    recurrence_end_date: date | None
    reminder_minutes: int | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    subtasks: list[SubtaskOut]
    tag_ids: list[int]
    dependency_ids: list[int]
    attachments: list[AttachmentOut]


class ReorderIn(CamelModel):
    ids: list[int]
    field: str = "sort_order"


class PrioritySelectIn(CamelModel):
    task_id: int
    rank: int  # 1..3, or 0 to deselect


# ---------- Events ----------
class EventIn(CamelModel):
    title: str
    description: str | None = None
    start_at: datetime
    end_at: datetime
    all_day: bool | None = None
    location: str | None = None
    color: str | None = None
    category_id: int | None = None
    project_id: int | None = None
    task_id: int | None = None
    recurrence: str | None = None
    recurrence_end_date: date | None = None
    reminder_minutes: int | None = None


class EventPatch(CamelModel):
    title: str | None = None
    description: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    all_day: bool | None = None
    location: str | None = None
    color: str | None = None
    category_id: int | None = None
    project_id: int | None = None
    task_id: int | None = None
    recurrence: str | None = None
    recurrence_end_date: date | None = None
    reminder_minutes: int | None = None


class EventOut(CamelModel):
    id: int
    title: str
    description: str
    start_at: datetime
    end_at: datetime
    all_day: bool
    location: str
    color: str
    category_id: int | None
    project_id: int | None
    task_id: int | None
    recurrence: str
    recurrence_end_date: date | None
    reminder_minutes: int | None


# ---------- Notes ----------
class NoteIn(CamelModel):
    title: str | None = None
    content: str | None = None
    folder: str | None = None
    tag_names: list[str] | None = None
    is_pinned: bool | None = None
    task_id: int | None = None
    project_id: int | None = None


class NoteOut(CamelModel):
    id: int
    title: str
    content: str
    folder: str
    tag_names: list[str]
    is_pinned: bool
    task_id: int | None
    project_id: int | None
    created_at: datetime
    updated_at: datetime


# ---------- Reviews / time entries / reminders ----------
class ReviewIn(CamelModel):
    date: date
    completed_text: str | None = None
    not_completed_text: str | None = None
    achievements: str | None = None
    move_to_tomorrow: str | None = None
    productivity_rating: int | None = None
    reflection: str | None = None


class ReviewOut(CamelModel):
    id: int
    date: date
    completed_text: str
    not_completed_text: str
    achievements: str
    move_to_tomorrow: str
    productivity_rating: int
    reflection: str
    updated_at: datetime


class TimeEntryIn(CamelModel):
    task_id: int | None = None
    minutes: int
    note: str | None = None
    started_at: datetime | None = None


class TimeEntryOut(CamelModel):
    id: int
    task_id: int | None
    minutes: int
    note: str
    started_at: datetime
    ended_at: datetime | None


class ReminderOut(CamelModel):
    id: int
    task_id: int | None
    event_id: int | None
    remind_at: datetime
    minutes_before: int
    message: str
    channel: str
    is_read: bool


class ReminderPatch(CamelModel):
    is_read: bool | None = None
    minutes_before: int | None = None
    channel: str | None = None


class SearchOut(CamelModel):
    kind: str
    id: int
    title: str
    subtitle: str
    href: str
