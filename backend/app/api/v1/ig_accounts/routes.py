from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.repositories.instagram_account_repository import InstagramAccountRepository
from app.schemas.instagram_account_schema import InstagramAccountResponseSchema, SaveIgSelectionSchema
from app.utils.exceptions import NotFoundError
from app.utils.response import success_response

bp = Blueprint("ig_accounts", __name__, url_prefix="/instagram-accounts")
repository = InstagramAccountRepository()
response_schema = InstagramAccountResponseSchema()
selection_schema = SaveIgSelectionSchema()


@bp.get("")
@jwt_required()
def list_ig_accounts():
    user_id = get_jwt_identity()
    via_account_id = request.args.get("via_account_id")
    accounts = repository.list_all(user_id=user_id, via_account_id=via_account_id)
    return success_response(
        data=response_schema.dump(accounts, many=True),
        message="Instagram accounts retrieved successfully",
    )
