from app.repositories.facebook_page_repository import FacebookPageRepository


class FacebookPageService:
    def __init__(self):
        self.repository = FacebookPageRepository()

    def list_pages(self, user_id: str, via_account_id: str | None = None):
        return self.repository.list_all(user_id=user_id, via_account_id=via_account_id)

    def create_page(self, data: dict, user_id: str):
        data["user_id"] = user_id
        return self.repository.create(data)
