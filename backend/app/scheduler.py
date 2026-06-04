from __future__ import annotations

from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from flask import Flask

from app import extensions
from app.repositories.campaign_repository import CampaignRepository
from app.services.campaign_execution_service import CampaignExecutionService
from app.utils.exceptions import NotFoundError


def run_due_campaigns(app: Flask) -> dict:
    """Execute every campaign whose next_run_at is due. Reused by both the
    in-process APScheduler tick and the external /health/tick endpoint (so a
    cron pinger can drive posting even when the free-tier web service would
    otherwise be asleep)."""
    executed = 0
    failed = 0
    with app.app_context():
        campaign_repository = CampaignRepository()
        execution_service = CampaignExecutionService()
        due_campaigns = campaign_repository.list_due(datetime.utcnow())

        for campaign in due_campaigns:
            try:
                execution_service.execute_next_row(campaign.id)
                executed += 1
            except NotFoundError:
                pass  # no Planning rows left — normal stop condition
            except Exception as exc:
                failed += 1
                app.logger.exception("Campaign %s execution failed: %s", campaign.id, exc)

    return {"due": len(due_campaigns), "executed": executed, "failed": failed}


def init_scheduler(app: Flask) -> None:
    if extensions.scheduler is not None:
        return

    scheduler = BackgroundScheduler(timezone=app.config["SCHEDULER_TIMEZONE"])

    scheduler.add_job(
        lambda: run_due_campaigns(app),
        trigger="interval",
        minutes=1,
        id="run_due_campaigns",
        replace_existing=True,
    )
    scheduler.start()
    extensions.scheduler = scheduler
    app.extensions["apscheduler"] = scheduler
