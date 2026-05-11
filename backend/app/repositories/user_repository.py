from datetime import datetime
from typing import Optional

from app.extensions import get_firestore
from app.models.user import User

COLLECTION = "users"


class UserRepository:
    def _db(self):
        return get_firestore()

    def _from_doc(self, doc) -> User:
        data = doc.to_dict()
        return User(
            id=doc.id,
            username=data["username"],
            display_name=data["display_name"],
            role=data.get("role", "user"),
            password_hash=data.get("password_hash", ""),
            is_active=data.get("is_active", True),
            created_at=data.get("created_at", datetime.utcnow()),
        )

    def get_by_username(self, username: str) -> Optional[User]:
        docs = (
            self._db().collection(COLLECTION)
            .where("username", "==", username)
            .limit(1)
            .get()
        )
        for doc in docs:
            return self._from_doc(doc)
        return None

    def get_by_id(self, user_id: str) -> Optional[User]:
        doc = self._db().collection(COLLECTION).document(user_id).get()
        if not doc.exists:
            return None
        return self._from_doc(doc)

    def create(self, data: dict) -> User:
        data.setdefault("created_at", datetime.utcnow())
        ref = self._db().collection(COLLECTION).document()
        ref.set(data)
        return self._from_doc(ref.get())
