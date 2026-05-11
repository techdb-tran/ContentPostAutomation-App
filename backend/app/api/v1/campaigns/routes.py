from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.schemas.campaign_schema import CampaignResponseSchema, CreateCampaignRequestSchema, UpdateCampaignRequestSchema
from app.services.campaign_service import CampaignService
from app.utils.response import success_response

bp = Blueprint("campaigns", __name__, url_prefix="/campaigns")
service = CampaignService()
create_campaign_schema = CreateCampaignRequestSchema()
update_campaign_schema = UpdateCampaignRequestSchema()
campaign_response_schema = CampaignResponseSchema()


@bp.get("")
@jwt_required()
def list_campaigns():
    campaigns = service.list_campaigns()
    return success_response(
        data=campaign_response_schema.dump(campaigns, many=True),
        message="Campaigns retrieved successfully",
    )


@bp.post("")
@jwt_required()
def create_campaign():
    payload = create_campaign_schema.load(request.get_json(force=True))
    campaign = service.create_campaign(payload)
    return success_response(
        data=campaign_response_schema.dump(campaign),
        message="Campaign created successfully",
        status_code=201,
    )


@bp.put("/<campaign_id>")
@jwt_required()
def update_campaign(campaign_id: str):
    payload = update_campaign_schema.load(request.get_json(force=True))
    campaign = service.update_campaign(campaign_id, payload)
    return success_response(
        data=campaign_response_schema.dump(campaign),
        message="Campaign đã được cập nhật",
    )


@bp.delete("/<campaign_id>")
@jwt_required()
def delete_campaign(campaign_id: str):
    service.delete_campaign(campaign_id)
    return success_response(message="Campaign đã được xóa")


@bp.post("/<campaign_id>/execute-next")
@jwt_required()
def execute_next_row(campaign_id: str):
    result = service.execute_next_row(campaign_id)
    return success_response(
        data=result,
        message="Đã xử lý row tiếp theo thành công",
    )
