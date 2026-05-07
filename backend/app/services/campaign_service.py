from app.repositories.campaign_repository import CampaignRepository
from app.services.campaign_execution_service import CampaignExecutionService
from app.utils.schedule import calculate_next_run_at


class CampaignService:
    def __init__(self):
        self.repository = CampaignRepository()
        self.execution_service = CampaignExecutionService()

    def list_campaigns(self):
        return self.repository.list_all()

    def create_campaign(self, data: dict):
        data["next_run_at"] = calculate_next_run_at(data["schedule_mode"], data["schedule_config"])
        return self.repository.create(data)

    def update_campaign(self, campaign_id: int, data: dict):
        from app.utils.exceptions import NotFoundError
        campaign = self.repository.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign không tồn tại")
        schedule_mode = data.get("schedule_mode", campaign.schedule_mode)
        schedule_config = data.get("schedule_config", campaign.schedule_config)
        data["next_run_at"] = calculate_next_run_at(schedule_mode, schedule_config)
        updated = self.repository.update(campaign_id, data)
        return updated

    def delete_campaign(self, campaign_id: int):
        from app.utils.exceptions import NotFoundError
        deleted = self.repository.delete(campaign_id)
        if not deleted:
            raise NotFoundError("Campaign không tồn tại")

    def execute_next_row(self, campaign_id: int):
        return self.execution_service.execute_next_row(campaign_id)
