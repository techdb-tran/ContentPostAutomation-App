from flask import Blueprint, current_app, request

from app.scheduler import run_due_campaigns
from app.utils.response import error_response, success_response


bp = Blueprint("health", __name__, url_prefix="/health")


@bp.get("")
def health_check():
    return success_response(
        data={"status": "ok", "service": "backend"},
        message="Service is healthy",
    )


@bp.route("/tick", methods=["GET", "POST"])
def tick():
    """External cron pinger hits this to (a) keep the free-tier web service
    awake and (b) run any due campaigns immediately. Protected by TICK_TOKEN
    passed either as ?token=... or the X-Tick-Token header."""
    expected = current_app.config.get("TICK_TOKEN", "")
    if expected:
        provided = request.args.get("token") or request.headers.get("X-Tick-Token", "")
        if provided != expected:
            return error_response(message="Unauthorized", status_code=401)

    result = run_due_campaigns(current_app._get_current_object())
    return success_response(data=result, message="Tick processed")
