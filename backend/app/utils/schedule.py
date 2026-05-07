from __future__ import annotations

from datetime import datetime, timedelta, time
from typing import Optional


def calculate_next_run_at(schedule_mode: str, schedule_config: dict) -> Optional[datetime]:
    now = datetime.now()

    if schedule_mode == "daily_fixed_time":
        times = schedule_config.get("times") or []
        parsed = _parse_times(times)
        for t in parsed:
            candidate = datetime.combine(now.date(), t)
            if candidate > now:
                return candidate
        if parsed:
            return datetime.combine(now.date() + timedelta(days=1), parsed[0])

    elif schedule_mode == "window_interval":
        start_time = _parse_time(schedule_config.get("start_time", "08:00"))
        end_time = _parse_time(schedule_config.get("end_time", "18:00"))
        interval_hours = float(schedule_config.get("interval_hours", 1))
        candidate = max(now, datetime.combine(now.date(), start_time))
        while candidate.time() <= end_time:
            if candidate > now:
                return candidate
            candidate += timedelta(hours=interval_hours)
        return datetime.combine(now.date() + timedelta(days=1), start_time)

    elif schedule_mode == "flexible_make_like":
        interval_minutes = int(schedule_config.get("interval_minutes", 60))
        return now + timedelta(minutes=interval_minutes)

    return None


def _parse_times(times: list) -> list:
    return [_parse_time(v) for v in times if v]


def _parse_time(value: str) -> time:
    parts = value.split(":")
    return time(hour=int(parts[0]), minute=int(parts[1]))
