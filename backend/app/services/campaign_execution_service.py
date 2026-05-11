from __future__ import annotations

from datetime import datetime

from app.repositories.campaign_repository import CampaignRepository
from app.repositories.execution_log_repository import ExecutionLogRepository
from app.services.facebook_posting_service import FacebookPostingService
from app.services.google_sheets_service import GoogleSheetsService
from app.services.instagram_posting_service import InstagramPostingService
from app.utils.exceptions import AppError, NotFoundError
from app.utils.schedule import calculate_next_run_at


class CampaignExecutionService:
    def __init__(self):
        self.campaign_repository = CampaignRepository()
        self.log_repository = ExecutionLogRepository()
        self.posting_service = FacebookPostingService()
        self.ig_posting_service = InstagramPostingService()

    def execute_next_row(self, campaign_id: str) -> dict:
        campaign = self.campaign_repository.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign không tồn tại")

        if not campaign.pages and not campaign.instagram_accounts:
            raise AppError("Campaign chưa có Facebook Page hoặc Instagram Account nào được chọn", status_code=400)

        sheet_service = GoogleSheetsService(campaign.sheet_id, campaign.sheet_tab_name)
        row = sheet_service.find_next_planning_row()
        sheet_service.mark_processing(row.row_number)

        log = self.log_repository.create({
            "campaign_id": campaign.id,
            "via_account_id": campaign.pages[0].via_account_id,
            "status": "Running",
            "request_payload": {
                "sheet_id": campaign.sheet_id,
                "sheet_tab_name": campaign.sheet_tab_name,
                "row_number": row.row_number,
                "caption": row.caption,
                "video_uri": row.video_uri,
            },
        })

        try:
            posted_results = []

            for page in campaign.pages:
                result = self.posting_service.publish_video(
                    page_id=page.page_id,
                    page_access_token=page.page_access_token,
                    video_url=row.video_uri,
                    caption=row.caption,
                )
                posted_results.append({
                    "platform": "facebook",
                    "name": page.page_name,
                    "id": page.page_id,
                    "permalink_url": result["permalink_url"],
                })

            for ig in campaign.instagram_accounts:
                result = self.ig_posting_service.publish_video(
                    ig_user_id=ig.instagram_id,
                    access_token=ig.page_access_token,
                    video_url=row.video_uri,
                    caption=row.caption,
                )
                posted_results.append({
                    "platform": "instagram",
                    "name": ig.username,
                    "id": ig.instagram_id,
                    "permalink_url": result["permalink_url"],
                })

            first_post_url = posted_results[0]["permalink_url"] if posted_results else ""
            sheet_service.mark_done(row.row_number, first_post_url)

            self.log_repository.update(log.id, {
                "status": "Done",
                "response_payload": {
                    "posted_results": posted_results,
                    "sheet_row_number": row.row_number,
                },
                "finished_at": datetime.utcnow(),
            })

            campaign.next_run_at = calculate_next_run_at(campaign.schedule_mode, campaign.schedule_config)
            self.campaign_repository.save(campaign)

            return {
                "campaign_id": campaign.id,
                "sheet_row_number": row.row_number,
                "posted_results": posted_results,
                "first_post_url": first_post_url,
                "status": "Done",
            }

        except Exception as exc:
            try:
                sheet_service.mark_error(row.row_number, str(exc))
            except Exception:
                pass
            self.log_repository.update(log.id, {
                "status": "Error",
                "error_message": str(exc),
                "finished_at": datetime.utcnow(),
            })
            raise
