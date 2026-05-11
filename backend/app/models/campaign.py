from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional


@dataclass
class Campaign:
    id: str
    user_id: str
    name: str
    schedule_mode: str
    schedule_config: dict
    sheet_id: str
    description: Optional[str] = None
    sheet_tab_name: str = "Sheet1"
    rows_per_run: int = 5
    is_active: bool = True
    next_run_at: Optional[datetime] = None
    via_account_id: Optional[str] = None
    page_ids: List[str] = field(default_factory=list)
    pages: List = field(default_factory=list)
    instagram_account_ids: List[str] = field(default_factory=list)
    instagram_accounts: List = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
