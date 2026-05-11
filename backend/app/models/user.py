from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class User:
    id: str
    username: str
    display_name: str
    role: str = "user"
    password_hash: str = ""
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
