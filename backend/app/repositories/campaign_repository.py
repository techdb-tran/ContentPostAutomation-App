from datetime import datetime
from typing import Iterable, List, Optional

from app.extensions import db
from app.models.campaign import Campaign
from app.models.facebook_page import FacebookPage


class CampaignRepository:
    def list_all(self) -> List[Campaign]:
        return Campaign.query.order_by(Campaign.created_at.desc()).all()

    def get_by_id(self, campaign_id: int) -> Optional[Campaign]:
        return Campaign.query.get(campaign_id)

    def list_due(self, current_time: datetime) -> List[Campaign]:
        return (
            Campaign.query.filter(Campaign.is_active == True, Campaign.next_run_at.isnot(None), Campaign.next_run_at <= current_time)  # noqa: E712
            .order_by(Campaign.next_run_at.asc())
            .all()
        )

    def create(self, data: dict) -> Campaign:
        page_ids = data.pop("page_ids", [])
        campaign = Campaign(**data)
        if page_ids:
            campaign.pages = self._get_pages_by_ids(page_ids)

        db.session.add(campaign)
        db.session.commit()
        return campaign

    def update(self, campaign_id: int, data: dict) -> Campaign:
        campaign = self.get_by_id(campaign_id)
        if not campaign:
            return None
        page_ids = data.pop("page_ids", None)
        for key, value in data.items():
            setattr(campaign, key, value)
        if page_ids is not None:
            campaign.pages = self._get_pages_by_ids(page_ids)
        db.session.commit()
        return campaign

    def delete(self, campaign_id: int) -> bool:
        campaign = self.get_by_id(campaign_id)
        if not campaign:
            return False
        db.session.delete(campaign)
        db.session.commit()
        return True

    def save(self, campaign: Campaign) -> Campaign:
        db.session.add(campaign)
        db.session.commit()
        return campaign

    def _get_pages_by_ids(self, page_ids: Iterable[int]) -> List[FacebookPage]:
        return FacebookPage.query.filter(FacebookPage.id.in_(list(page_ids))).all()
