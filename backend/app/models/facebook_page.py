from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class FacebookPage:
    id: str
    via_account_id: str
    page_id: str
    page_name: str
    page_access_token: str
    is_selected: bool = False
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
