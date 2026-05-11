from app.repositories.campaign_repository import CampaignRepository
from app.services.campaign_execution_service import CampaignExecutionService
from app.utils.exceptions import NotFoundError
from app.utils.schedule import calculate_next_run_at


class CampaignService:
    def __init__(self):
        self.repository = CampaignRepository()
        self.execution_service = CampaignExecutionService()

    def list_campaigns(self, user_id: str):
        return self.repository.list_all(user_id)

    def create_campaign(self, data: dict, user_id: str):
        data["user_id"] = user_id
        data["next_run_at"] = calculate_next_run_at(data["schedule_mode"], data["schedule_config"])
        return self.repository.create(data)

    def update_campaign(self, campaign_id: str, data: dict):
        campaign = self.repository.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign không tồn tại")
        schedule_mode = data.get("schedule_mode", campaign.schedule_mode)
        schedule_config = data.get("schedule_config", campaign.schedule_config)
        data["next_run_at"] = calculate_next_run_at(schedule_mode, schedule_config)
        return self.repository.update(campaign_id, data)

    def delete_campaign(self, campaign_id: str):
        if not self.repository.delete(campaign_id):
            raise NotFoundError("Campaign không tồn tại")

    def execute_next_row(self, campaign_id: str):
        return self.execution_service.execute_next_row(campaign_id)
