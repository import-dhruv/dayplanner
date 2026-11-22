"""Small shared helpers."""

from datetime import date, timedelta


def step_recurrence(current: date | None, rule: str) -> date | None:
    if not current or not rule or rule == "none":
        return None
    if rule == "daily":
        return current + timedelta(days=1)
    if rule == "weekdays":
        nxt = current + timedelta(days=1)
        while nxt.weekday() >= 5:
            nxt += timedelta(days=1)
        return nxt
    if rule == "weekly":
        return current + timedelta(days=7)
    if rule == "biweekly":
        return current + timedelta(days=14)
    if rule == "monthly":
        month = current.month % 12 + 1
        year = current.year + (1 if current.month == 12 else 0)
        day = min(current.day, 28)
        return date(year, month, day)
    if rule == "yearly":
        return current.replace(year=current.year + 1)
    return None


def clamp_time(value: str | None, default: str = "09:00") -> str:
    if not value:
        return default
    try:
        h, m = value.split(":")
        h_i, m_i = int(h), int(m)
        if 0 <= h_i < 24 and 0 <= m_i < 60:
            return f"{h_i:02d}:{m_i:02d}"
    except (ValueError, AttributeError):
        pass
    return default
