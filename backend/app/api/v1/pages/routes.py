from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.schemas.facebook_page_schema import CreateFacebookPageRequestSchema, FacebookPageResponseSchema
from app.services.facebook_page_service import FacebookPageService
from app.utils.response import success_response

bp = Blueprint("pages", __name__, url_prefix="/facebook-pages")
service = FacebookPageService()
create_schema = CreateFacebookPageRequestSchema()
response_schema = FacebookPageResponseSchema()


@bp.get("")
@jwt_required()
def list_pages():
    user_id = get_jwt_identity()
    via_account_id = request.args.get("via_account_id")
    pages = service.list_pages(user_id=user_id, via_account_id=via_account_id)
    return success_response(
        data=response_schema.dump(pages, many=True),
        message="Facebook pages retrieved successfully",
    )


@bp.post("")
@jwt_required()
def create_page():
    user_id = get_jwt_identity()
    payload = create_schema.load(request.get_json(silent=True) or {})
    page = service.create_page(payload, user_id)
    return success_response(
        data=response_schema.dump(page),
        message="Facebook page created successfully",
        status_code=201,
    )
