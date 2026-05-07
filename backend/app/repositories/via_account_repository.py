from typing import List, Optional

from app.extensions import db
from app.models.via_account import ViaAccount


class ViaAccountRepository:
    def list_all(self) -> List[ViaAccount]:
        return ViaAccount.query.order_by(ViaAccount.created_at.desc()).all()

    def get_by_id(self, via_account_id: int) -> Optional[ViaAccount]:
        return ViaAccount.query.get(via_account_id)

    def create(self, data: dict) -> ViaAccount:
        via_account = ViaAccount(**data)
        db.session.add(via_account)
        db.session.commit()
        return via_account

    def delete(self, via_account_id: int) -> bool:
        via_account = self.get_by_id(via_account_id)
        if not via_account:
            return False
        from app.models.facebook_page import FacebookPage
        FacebookPage.query.filter_by(via_account_id=via_account_id).delete()
        db.session.delete(via_account)
        db.session.commit()
        return True
