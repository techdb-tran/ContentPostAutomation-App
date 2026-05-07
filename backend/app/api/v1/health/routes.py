from flask import Blueprint

from app.utils.response import success_response


bp = Blueprint("health", __name__, url_prefix="/health")


@bp.get("")
def health_check():
    return success_response(
        data={"status": "ok", "service": "backend"},
        message="Service is healthy",
    )
