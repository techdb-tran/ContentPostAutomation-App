from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ExecutionLog:
    id: str
    campaign_id: str
    via_account_id: str
    status: str = "Running"
    request_payload: Optional[dict] = None
    response_payload: Optional[dict] = None
    error_message: Optional[str] = None
    started_at: datetime = field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
