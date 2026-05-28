from __future__ import annotations

from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask

from app import extensions
from app.repositories.campaign_repository import CampaignRepository
from app.services.campaign_execution_service import CampaignExecutionService
from app.utils.exceptions import NotFoundError


def init_scheduler(app: Flask) -> None:
    if extensions.scheduler is not None:
        return

    scheduler = BackgroundScheduler(timezone=app.config["SCHEDULER_TIMEZONE"])

    def run_due_campaigns():
        with app.app_context():
            campaign_repository = CampaignRepository()
            execution_service = CampaignExecutionService()
            due_campaigns = campaign_repository.list_due(datetime.utcnow())

            for campaign in due_campaigns:
                try:
                    execution_service.execute_next_row(campaign.id)
                except NotFoundError:
                    pass  # no Planning rows left — normal stop condition
                except Exception as exc:
                    app.logger.exception("Campaign %s execution failed: %s", campaign.id, exc)

    scheduler.add_job(
        run_due_campaigns,
        trigger="interval",
        minutes=1,
        id="run_due_campaigns",
        replace_existing=True,
    )
    scheduler.start()
    extensions.scheduler = scheduler
    app.extensions["apscheduler"] = scheduler
