from app.repositories.facebook_page_repository import FacebookPageRepository


class FacebookPageService:
    def __init__(self):
        self.repository = FacebookPageRepository()

    def list_pages(self, via_account_id: int | None = None):
        return self.repository.list_all(via_account_id=via_account_id)

    def create_page(self, data: dict):
        return self.repository.create(data)
