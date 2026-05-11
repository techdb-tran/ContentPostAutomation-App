from datetime import datetime
from typing import List, Optional

from app.extensions import get_firestore
from app.models.facebook_page import FacebookPage

COLLECTION = "facebook_pages"


class FacebookPageRepository:
    def _db(self):
        return get_firestore()

    def _from_doc(self, doc) -> FacebookPage:
        data = doc.to_dict()
        return FacebookPage(
            id=doc.id,
            user_id=data.get("user_id", ""),
            via_account_id=data["via_account_id"],
            page_id=data["page_id"],
            page_name=data["page_name"],
            page_access_token=data["page_access_token"],
            is_selected=data.get("is_selected", False),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at", datetime.utcnow()),
            updated_at=data.get("updated_at", datetime.utcnow()),
        )

    def list_all(self, user_id: str, via_account_id: Optional[str] = None) -> List[FacebookPage]:
        query = self._db().collection(COLLECTION).where("user_id", "==", user_id)
        if via_account_id:
            query = query.where("via_account_id", "==", via_account_id)
        docs = query.get()
        pages = [self._from_doc(doc) for doc in docs]
        pages.sort(key=lambda p: p.page_name.lower())
        return pages

    def get_by_id(self, doc_id: str) -> Optional[FacebookPage]:
        doc = self._db().collection(COLLECTION).document(doc_id).get()
        if not doc.exists:
            return None
        return self._from_doc(doc)

    def get_by_page_ids(self, doc_ids: List[str]) -> List[FacebookPage]:
        if not doc_ids:
            return []
        db = self._db()
        refs = [db.collection(COLLECTION).document(did) for did in doc_ids]
        docs = db.get_all(refs)
        return [self._from_doc(doc) for doc in docs if doc.exists]

    def _find_existing(self, via_account_id: str, page_id: str) -> Optional[FacebookPage]:
        docs = (
            self._db().collection(COLLECTION)
            .where("via_account_id", "==", via_account_id)
            .where("page_id", "==", page_id)
            .limit(1)
            .get()
        )
        for doc in docs:
            return self._from_doc(doc)
        return None

    def create(self, data: dict) -> FacebookPage:
        now = datetime.utcnow()
        data.setdefault("created_at", now)
        data.setdefault("updated_at", now)
        # Auto-generated ID — cùng page_id có thể thuộc nhiều via account
        ref = self._db().collection(COLLECTION).document()
        ref.set(data)
        return self._from_doc(ref.get())

    def upsert_from_facebook(self, via_account_id: str, fb_pages: list, user_id: str) -> List[FacebookPage]:
        db = self._db()
        now = datetime.utcnow()
        for fb_page in fb_pages:
            if "access_token" not in fb_page:
                continue
            page_id = fb_page["id"]
            existing = self._find_existing(via_account_id, page_id)
            if existing:
                db.collection(COLLECTION).document(existing.id).update({
                    "page_name": fb_page["name"],
                    "page_access_token": fb_page["access_token"],
                    "updated_at": now,
                })
            else:
                ref = db.collection(COLLECTION).document()
                ref.set({
                    "user_id": user_id,
                    "via_account_id": via_account_id,
                    "page_id": page_id,
                    "page_name": fb_page["name"],
                    "page_access_token": fb_page["access_token"],
                    "is_selected": False,
                    "is_active": True,
                    "created_at": now,
                    "updated_at": now,
                })
        return self.list_all(user_id=user_id, via_account_id=via_account_id)

    def update_selection_for_via(self, via_account_id: str, selected_page_ids: list, user_id: str) -> List[FacebookPage]:
        selected_set = set(selected_page_ids)
        pages = self.list_all(user_id=user_id, via_account_id=via_account_id)
        now = datetime.utcnow()
        db = self._db()
        for page in pages:
            new_selected = page.id in selected_set
            if page.is_selected != new_selected:
                db.collection(COLLECTION).document(page.id).update({
                    "is_selected": new_selected,
                    "updated_at": now,
                })
                page.is_selected = new_selected
        return pages
