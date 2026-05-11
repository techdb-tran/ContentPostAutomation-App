from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class InstagramAccount:
    id: str
    user_id: str
    via_account_id: str
    instagram_id: str        # IG Business Account ID
    username: str            # @handle (display name)
    page_access_token: str   # FB Page token reused for IG Graph API
    is_selected: bool = False
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
