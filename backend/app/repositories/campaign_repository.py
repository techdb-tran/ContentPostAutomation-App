from datetime import datetime
from typing import List, Optional

from firebase_admin import firestore as fb_firestore

from app.extensions import get_firestore
from app.models.campaign import Campaign
from app.repositories.facebook_page_repository import FacebookPageRepository

COLLECTION = "campaigns"


class CampaignRepository:
    def __init__(self):
        self._page_repo = FacebookPageRepository()

    def _db(self):
        return get_firestore()

    def _from_doc(self, doc) -> Campaign:
        data = doc.to_dict()
        page_ids = data.get("page_ids", [])
        campaign = Campaign(
            id=doc.id,
            name=data["name"],
            description=data.get("description"),
            schedule_mode=data["schedule_mode"],
            schedule_config=data.get("schedule_config", {}),
            sheet_id=data["sheet_id"],
            sheet_tab_name=data.get("sheet_tab_name", "Sheet1"),
            rows_per_run=data.get("rows_per_run", 5),
            is_active=data.get("is_active", True),
            next_run_at=data.get("next_run_at"),
            page_ids=page_ids,
            created_at=data.get("created_at", datetime.utcnow()),
            updated_at=data.get("updated_at", datetime.utcnow()),
        )
        if page_ids:
            campaign.pages = self._page_repo.get_by_page_ids(page_ids)
        return campaign

    def list_all(self) -> List[Campaign]:
        docs = self._db().collection(COLLECTION).get()
        campaigns = [self._from_doc(doc) for doc in docs]
        campaigns.sort(key=lambda c: c.created_at, reverse=True)
        return campaigns

    def get_by_id(self, campaign_id: str) -> Optional[Campaign]:
        doc = self._db().collection(COLLECTION).document(campaign_id).get()
        if not doc.exists:
            return None
        return self._from_doc(doc)

    def list_due(self, current_time: datetime) -> List[Campaign]:
        # Requires Firestore composite index: is_active ASC + next_run_at ASC
        # First run sẽ in link tạo index trong error message
        docs = (
            self._db().collection(COLLECTION)
            .where("is_active", "==", True)
            .where("next_run_at", "<=", current_time)
            .order_by("next_run_at")
            .get()
        )
        return [self._from_doc(doc) for doc in docs]

    def create(self, data: dict) -> Campaign:
        now = datetime.utcnow()
        page_ids = data.pop("page_ids", [])
        data["page_ids"] = page_ids
        data.setdefault("is_active", True)
        data["created_at"] = now
        data["updated_at"] = now
        if data.get("next_run_at") is None:
            data.pop("next_run_at", None)
        ref = self._db().collection(COLLECTION).document()
        ref.set(data)
        return self._from_doc(ref.get())

    def update(self, campaign_id: str, data: dict) -> Optional[Campaign]:
        ref = self._db().collection(COLLECTION).document(campaign_id)
        if not ref.get().exists:
            return None
        data["updated_at"] = datetime.utcnow()
        if "next_run_at" in data and data["next_run_at"] is None:
            data["next_run_at"] = fb_firestore.DELETE_FIELD
        ref.update(data)
        return self._from_doc(ref.get())

    def delete(self, campaign_id: str) -> bool:
        ref = self._db().collection(COLLECTION).document(campaign_id)
        if not ref.get().exists:
            return False
        ref.delete()
        return True

    def save(self, campaign: Campaign) -> Campaign:
        update_data = {
            "updated_at": datetime.utcnow(),
            "next_run_at": campaign.next_run_at if campaign.next_run_at is not None else fb_firestore.DELETE_FIELD,
        }
        self._db().collection(COLLECTION).document(campaign.id).update(update_data)
        return campaign
