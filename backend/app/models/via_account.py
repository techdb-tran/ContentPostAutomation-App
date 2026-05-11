from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class ViaAccount:
    id: str
    display_name: str
    access_token: str
    token_expires_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
