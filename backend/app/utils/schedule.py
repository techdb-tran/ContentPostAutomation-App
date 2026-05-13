from __future__ import annotations

from datetime import datetime, timedelta, time, timezone
from typing import Optional


VN_TZ = timezone(timedelta(hours=7))


def calculate_next_run_at(schedule_mode: str, schedule_config: dict) -> Optional[datetime]:
    # User inputs times in VN local time (UTC+7). All candidates are computed in VN_TZ
    # then converted to naive UTC before storing, so list_due(utcnow()) compares correctly.
    now_vn = datetime.now(tz=VN_TZ)

    if schedule_mode == "daily_fixed_time":
        times = schedule_config.get("times") or []
        parsed = _parse_times(times)
        for t in parsed:
            candidate_vn = datetime.combine(now_vn.date(), t, tzinfo=VN_TZ)
            if candidate_vn > now_vn:
                return candidate_vn.astimezone(timezone.utc).replace(tzinfo=None)
        if parsed:
            next_day = now_vn.date() + timedelta(days=1)
            candidate_vn = datetime.combine(next_day, parsed[0], tzinfo=VN_TZ)
            return candidate_vn.astimezone(timezone.utc).replace(tzinfo=None)

    elif schedule_mode == "window_interval":
        start_time = _parse_time(schedule_config.get("start_time", "08:00"))
        end_time = _parse_time(schedule_config.get("end_time", "18:00"))
        interval_hours = float(schedule_config.get("interval_hours", 1))
        start_vn = datetime.combine(now_vn.date(), start_time, tzinfo=VN_TZ)
        candidate_vn = max(start_vn, now_vn)
        while candidate_vn.time() <= end_time:
            if candidate_vn > now_vn:
                return candidate_vn.astimezone(timezone.utc).replace(tzinfo=None)
            candidate_vn += timedelta(hours=interval_hours)
        next_start_vn = datetime.combine(now_vn.date() + timedelta(days=1), start_time, tzinfo=VN_TZ)
        return next_start_vn.astimezone(timezone.utc).replace(tzinfo=None)

    elif schedule_mode == "flexible_make_like":
        interval_minutes = int(schedule_config.get("interval_minutes", 60))
        return datetime.utcnow() + timedelta(minutes=interval_minutes)

    return None


def _parse_times(times: list) -> list:
    return [_parse_time(v) for v in times if v]


def _parse_time(value: str) -> time:
    parts = value.split(":")
    return time(hour=int(parts[0]), minute=int(parts[1]))
