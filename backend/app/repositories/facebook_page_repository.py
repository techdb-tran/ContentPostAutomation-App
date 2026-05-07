from typing import List, Optional

from app.extensions import db
from app.models.facebook_page import FacebookPage


class FacebookPageRepository:
    def list_all(self, via_account_id: int | None = None) -> List[FacebookPage]:
        query = FacebookPage.query
        if via_account_id:
            query = query.filter_by(via_account_id=via_account_id)
        return query.order_by(FacebookPage.created_at.desc()).all()

    def get_by_id(self, page_id: int) -> Optional[FacebookPage]:
        return FacebookPage.query.get(page_id)

    def create(self, data: dict) -> FacebookPage:
        page = FacebookPage(**data)
        db.session.add(page)
        db.session.commit()
        return page

    def upsert_from_facebook(self, via_account_id: int, fb_pages: list) -> List[FacebookPage]:
        for fb_page in fb_pages:
            if "access_token" not in fb_page:
                continue
            existing = FacebookPage.query.filter_by(page_id=fb_page["id"]).first()
            if existing:
                existing.page_name = fb_page["name"]
                existing.page_access_token = fb_page["access_token"]
                existing.via_account_id = via_account_id
            else:
                db.session.add(FacebookPage(
                    via_account_id=via_account_id,
                    page_id=fb_page["id"],
                    page_name=fb_page["name"],
                    page_access_token=fb_page["access_token"],
                    is_selected=False,
                    is_active=True,
                ))
        db.session.commit()
        return self.list_all(via_account_id=via_account_id)

    def update_selection_for_via(self, via_account_id: int, selected_page_ids: list) -> List[FacebookPage]:
        selected_set = set(selected_page_ids)
        pages = self.list_all(via_account_id=via_account_id)
        for page in pages:
            page.is_selected = page.id in selected_set
        db.session.commit()
        return pages
