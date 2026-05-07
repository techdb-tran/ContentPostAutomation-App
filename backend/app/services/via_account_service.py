import requests

from app.repositories.via_account_repository import ViaAccountRepository
from app.repositories.facebook_page_repository import FacebookPageRepository
from app.utils.exceptions import AppError, NotFoundError

GRAPH_BASE = "https://graph.facebook.com/v19.0"


class ViaAccountService:
    def __init__(self):
        self.repository = ViaAccountRepository()
        self.page_repository = FacebookPageRepository()

    def list_accounts(self):
        return self.repository.list_all()

    def create_account(self, data: dict):
        return self.repository.create(data)

    def fetch_pages_from_facebook(self, via_account_id: int):
        via = self.repository.get_by_id(via_account_id)
        if not via:
            raise NotFoundError("Via account không tồn tại")

        try:
            resp = requests.get(
                f"{GRAPH_BASE}/me/accounts",
                params={"fields": "id,name,access_token", "access_token": via.access_token},
                timeout=10,
            )
        except requests.RequestException as exc:
            raise AppError(f"Không kết nối được Facebook: {exc}", status_code=502)

        body = resp.json()
        if not resp.ok:
            msg = body.get("error", {}).get("message", "Facebook API error")
            raise AppError(f"Facebook API: {msg}", status_code=502)

        fb_pages = body.get("data", [])
        return self.page_repository.upsert_from_facebook(via_account_id, fb_pages)

    def delete_account(self, via_account_id: int):
        deleted = self.repository.delete(via_account_id)
        if not deleted:
            raise NotFoundError("Via account không tồn tại")

    def save_page_selection(self, via_account_id: int, selected_page_ids: list):
        via = self.repository.get_by_id(via_account_id)
        if not via:
            raise NotFoundError("Via account không tồn tại")
        return self.page_repository.update_selection_for_via(via_account_id, selected_page_ids)
