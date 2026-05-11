from flask import Blueprint, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required

from app.schemas.auth_schema import (
    AuthTokenResponseSchema,
    AuthUserResponseSchema,
    LoginRequestSchema,
    RegisterRequestSchema,
)
from app.services.auth_service import AuthService
from app.utils.response import success_response

bp = Blueprint("auth", __name__, url_prefix="/auth")
service = AuthService()
login_schema = LoginRequestSchema()
register_schema = RegisterRequestSchema()
user_response_schema = AuthUserResponseSchema()
token_response_schema = AuthTokenResponseSchema()


@bp.post("/login")
def login():
    payload = login_schema.load(request.get_json(silent=True) or {})
    user, tokens = service.login(payload["username"], payload["password"])
    return success_response(
        data={
            "user": user_response_schema.dump(user),
            "tokens": token_response_schema.dump(tokens),
        },
        message="Đăng nhập thành công",
    )


@bp.post("/register")
def register():
    payload = register_schema.load(request.get_json(silent=True) or {})
    user, tokens = service.register(
        username=payload["username"],
        password=payload["password"],
        display_name=payload["display_name"],
    )
    return success_response(
        data={
            "user": user_response_schema.dump(user),
            "tokens": token_response_schema.dump(tokens),
        },
        message="Đăng ký thành công",
        status_code=201,
    )


@bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    username = get_jwt_identity()
    claims = get_jwt()
    user = service.get_current_user(username)
    access_token = create_access_token(
        identity=user.username,
        additional_claims={"display_name": user.display_name, "role": claims.get("role", user.role)},
    )
    return success_response(
        data={"access_token": access_token},
        message="Token đã được làm mới",
    )


@bp.get("/me")
@jwt_required()
def me():
    username = get_jwt_identity()
    user = service.get_current_user(username)
    return success_response(
        data=user_response_schema.dump(user),
        message="Thông tin người dùng hiện tại",
    )
