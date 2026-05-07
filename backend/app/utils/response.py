from typing import Any, Optional

from flask import jsonify


def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    meta: Optional[dict] = None,
):
    response = {
        "success": True,
        "message": message,
        "data": data,
        "errors": None,
        "meta": meta,
    }
    return jsonify(response), status_code


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    errors: Optional[dict] = None,
):
    response = {
        "success": False,
        "message": message,
        "data": None,
        "errors": errors,
        "meta": None,
    }
    return jsonify(response), status_code


def paginated_response(
    data: list,
    total: int,
    page: int,
    per_page: int,
    message: str = "Success",
):
    meta = {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
        "has_next": page * per_page < total,
        "has_prev": page > 1,
    }
    return success_response(data=data, message=message, meta=meta)
