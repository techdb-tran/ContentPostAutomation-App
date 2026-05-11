from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.schemas.facebook_page_schema import FacebookPageResponseSchema
from app.schemas.via_account_schema import CreateViaAccountRequestSchema, SavePageSelectionSchema, ViaAccountResponseSchema
from app.services.via_account_service import ViaAccountService
from app.utils.response import success_response

bp = Blueprint("accounts", __name__, url_prefix="/via-accounts")
service = ViaAccountService()
create_schema = CreateViaAccountRequestSchema()
response_schema = ViaAccountResponseSchema()
page_response_schema = FacebookPageResponseSchema()
selection_schema = SavePageSelectionSchema()


@bp.get("")
@jwt_required()
def list_via_accounts():
    accounts = service.list_accounts()
    return success_response(
        data=response_schema.dump(accounts, many=True),
        message="Via accounts retrieved successfully",
    )


@bp.post("")
@jwt_required()
def create_via_account():
    payload = create_schema.load(request.get_json(silent=True) or {})
    account = service.create_account(payload)
    return success_response(
        data=response_schema.dump(account),
        message="Via account created successfully",
        status_code=201,
    )


@bp.delete("/<via_id>")
@jwt_required()
def delete_via_account(via_id: str):
    service.delete_account(via_id)
    return success_response(message="Via account đã được xóa")


@bp.post("/<via_id>/fetch-pages")
@jwt_required()
def fetch_pages(via_id: str):
    pages = service.fetch_pages_from_facebook(via_id)
    return success_response(
        data=page_response_schema.dump(pages, many=True),
        message=f"Đã tải {len(pages)} page từ Facebook",
    )


@bp.post("/<via_id>/pages/selection")
@jwt_required()
def save_page_selection(via_id: str):
    payload = selection_schema.load(request.get_json(silent=True) or {})
    pages = service.save_page_selection(via_id, payload["selected_page_ids"])
    return success_response(
        data=page_response_schema.dump(pages, many=True),
        message="Đã lưu tùy chọn page",
    )
