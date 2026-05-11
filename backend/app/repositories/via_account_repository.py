from datetime import datetime
from typing import List, Optional

from app.extensions import get_firestore
from app.models.via_account import ViaAccount

COLLECTION = "via_accounts"


class ViaAccountRepository:
    def _db(self):
        return get_firestore()

    def _from_doc(self, doc) -> ViaAccount:
        data = doc.to_dict()
        return ViaAccount(
            id=doc.id,
            user_id=data.get("user_id", ""),
            display_name=data["display_name"],
            access_token=data["access_token"],
            token_expires_at=data.get("token_expires_at"),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at", datetime.utcnow()),
            updated_at=data.get("updated_at", datetime.utcnow()),
        )

    def list_by_user(self, user_id: str) -> List[ViaAccount]:
        docs = (
            self._db().collection(COLLECTION).where("user_id", "==", user_id).get()
        )
        accounts = [self._from_doc(doc) for doc in docs]
        accounts.sort(key=lambda a: a.created_at, reverse=True)
        return accounts

    def get_by_id(self, via_account_id: str) -> Optional[ViaAccount]:
        doc = self._db().collection(COLLECTION).document(via_account_id).get()
        if not doc.exists:
            return None
        return self._from_doc(doc)

    def create(self, data: dict) -> ViaAccount:
        now = datetime.utcnow()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        data.setdefault("is_active", True)
        ref = self._db().collection(COLLECTION).document()
        ref.set(data)
        return self._from_doc(ref.get())

    def delete(self, via_account_id: str) -> bool:
        db = self._db()
        ref = db.collection(COLLECTION).document(via_account_id)
        if not ref.get().exists:
            return False
        pages = (
            db.collection("facebook_pages")
            .where("via_account_id", "==", via_account_id)
            .get()
        )
        for page in pages:
            page.reference.delete()
        ref.delete()
        return True
