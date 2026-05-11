from datetime import datetime
from typing import List, Optional

from app.extensions import get_firestore
from app.models.instagram_account import InstagramAccount

COLLECTION = "instagram_accounts"


class InstagramAccountRepository:
    def _db(self):
        return get_firestore()

    def _from_doc(self, doc) -> InstagramAccount:
        data = doc.to_dict()
        return InstagramAccount(
            id=doc.id,
            user_id=data.get("user_id", ""),
            via_account_id=data["via_account_id"],
            instagram_id=data["instagram_id"],
            username=data.get("username", ""),
            page_access_token=data.get("page_access_token", ""),
            is_selected=data.get("is_selected", False),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at", datetime.utcnow()),
            updated_at=data.get("updated_at", datetime.utcnow()),
        )

    def list_all(self, user_id: str, via_account_id: Optional[str] = None) -> List[InstagramAccount]:
        query = self._db().collection(COLLECTION).where("user_id", "==", user_id)
        if via_account_id:
            query = query.where("via_account_id", "==", via_account_id)
        docs = query.get()
        accounts = [self._from_doc(doc) for doc in docs]
        accounts.sort(key=lambda a: a.username.lower())
        return accounts

    def get_by_id(self, doc_id: str) -> Optional[InstagramAccount]:
        doc = self._db().collection(COLLECTION).document(doc_id).get()
        if not doc.exists:
            return None
        return self._from_doc(doc)

    def get_by_ids(self, doc_ids: List[str]) -> List[InstagramAccount]:
        if not doc_ids:
            return []
        db = self._db()
        refs = [db.collection(COLLECTION).document(did) for did in doc_ids]
        docs = db.get_all(refs)
        return [self._from_doc(doc) for doc in docs if doc.exists]

    def _find_existing(self, via_account_id: str, instagram_id: str) -> Optional[InstagramAccount]:
        docs = (
            self._db().collection(COLLECTION)
            .where("via_account_id", "==", via_account_id)
            .where("instagram_id", "==", instagram_id)
            .limit(1)
            .get()
        )
        for doc in docs:
            return self._from_doc(doc)
        return None

    def upsert_from_pages(self, via_account_id: str, fb_pages: list, user_id: str) -> List[InstagramAccount]:
        """Extract and upsert IG accounts linked to the given FB pages."""
        db = self._db()
        now = datetime.utcnow()
        for page in fb_pages:
            ig = page.get("instagram_business_account")
            if not ig or not ig.get("id"):
                continue
            access_token = page.get("access_token", "")
            if not access_token:
                continue
            ig_id = ig["id"]
            username = ig.get("username", ig_id)
            existing = self._find_existing(via_account_id, ig_id)
            if existing:
                db.collection(COLLECTION).document(existing.id).update({
                    "username": username,
                    "page_access_token": access_token,
                    "updated_at": now,
                })
            else:
                ref = db.collection(COLLECTION).document()
                ref.set({
                    "user_id": user_id,
                    "via_account_id": via_account_id,
                    "instagram_id": ig_id,
                    "username": username,
                    "page_access_token": access_token,
                    "is_selected": False,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                })
        return self.list_all(user_id=user_id, via_account_id=via_account_id)

    def update_selection(self, via_account_id: str, selected_ids: list, user_id: str) -> List[InstagramAccount]:
        selected_set = set(selected_ids)
        accounts = self.list_all(user_id=user_id, via_account_id=via_account_id)
        now = datetime.utcnow()
        db = self._db()
        for account in accounts:
            new_selected = account.id in selected_set
            if account.is_selected != new_selected:
                db.collection(COLLECTION).document(account.id).update({
                    "is_selected": new_selected,
                    "updated_at": now,
                })
                account.is_selected = new_selected
        return accounts
