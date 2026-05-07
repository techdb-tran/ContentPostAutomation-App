from __future__ import annotations

from datetime import datetime

from app.extensions import db
from app.models.execution_log import ExecutionLog
from app.repositories.campaign_repository import CampaignRepository
from app.services.facebook_posting_service import FacebookPostingService
from app.services.google_sheets_service import GoogleSheetsService
from app.utils.exceptions import AppError, NotFoundError
from app.utils.schedule import calculate_next_run_at


class CampaignExecutionService:
    def __init__(self):
        self.campaign_repository = CampaignRepository()
        self.posting_service = FacebookPostingService()

    def execute_next_row(self, campaign_id: int) -> dict:
        campaign = self.campaign_repository.get_by_id(campaign_id)
        if not campaign:
            raise NotFoundError("Campaign không tồn tại")

        if not campaign.pages:
            raise AppError("Campaign chưa có Facebook Page nào được chọn", status_code=400)

        sheet_service = GoogleSheetsService(campaign.sheet_id, campaign.sheet_tab_name)
        row = sheet_service.find_next_planning_row()
        sheet_service.mark_processing(row.row_number)

        execution_log = ExecutionLog(
            campaign_id=campaign.id,
            via_account_id=campaign.pages[0].via_account_id,
            status="Running",
            request_payload={
                "sheet_id": campaign.sheet_id,
                "sheet_tab_name": campaign.sheet_tab_name,
                "row_number": row.row_number,
                "caption": row.caption,
                "video_uri": row.video_uri,
            },
        )

        db.session.add(execution_log)
        db.session.flush()

        try:
            posted_results = []
            for page in campaign.pages:
                result = self.posting_service.publish_video(
                    page_id=page.page_id,
                    page_access_token=page.page_access_token,
                    video_url=row.video_uri,
                    caption=row.caption,
                )
                posted_results.append(
                    {
                        "page_name": page.page_name,
                        "page_id": page.page_id,
                        "permalink_url": result["permalink_url"],
                    }
                )

            first_post_url = posted_results[0]["permalink_url"] if posted_results else ""

            sheet_service.mark_done(row.row_number, first_post_url)

            execution_log.status = "Done"
            execution_log.response_payload = {
                "posted_results": posted_results,
                "sheet_row_number": row.row_number,
            }
            execution_log.finished_at = datetime.utcnow()
            db.session.commit()

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
            db.session.rollback()
            try:
                sheet_service.mark_error(row.row_number, str(exc))
            except Exception:
                pass

            execution_log.status = "Error"
            execution_log.error_message = str(exc)
            execution_log.finished_at = datetime.utcnow()
            db.session.add(execution_log)
            db.session.commit()
            raise

