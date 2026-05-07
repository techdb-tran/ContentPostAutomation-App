---
name: be-flask-auth
description: >
  Pattern chuẩn cho Authentication và Authorization trong Flask dùng JWT.
  Bắt buộc đọc khi implement login/logout/register, bảo vệ routes, phân
  quyền theo role, refresh token, hoặc bất kỳ thứ gì liên quan đến xác
  thực người dùng. Dùng khi viết decorator @login_required, @role_required,
  hoặc xử lý JWT token.
---

# Flask Auth Skill

## Thư viện & Cài đặt

```bash
pip install flask-jwt-extended bcrypt
```

```python
# app/extensions.py
from flask_jwt_extended import JWTManager
jwt = JWTManager()

# app/__init__.py
from app.extensions import jwt
jwt.init_app(app)

# config.py
class Config:
    JWT_SECRET_KEY          = os.environ.get("JWT_SECRET_KEY")   # Bắt buộc set trong .env
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
```

---

## Luồng Authentication

```
Register:  [POST /auth/register] → validate → hash password → tạo User → trả tokens
Login:     [POST /auth/login]    → tìm User → verify password → trả tokens
Refresh:   [POST /auth/refresh]  → verify refresh_token → trả access_token mới
Logout:    [POST /auth/logout]   → blocklist token (nếu cần)
Me:        [GET  /auth/me]       → verify access_token → trả current user info
```

---

## Password Hashing

```python
# app/utils/security.py
import bcrypt

def hash_password(plain_password: str) -> str:
    """Hash password trước khi lưu DB — không bao giờ lưu plain text"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """So sánh password người dùng nhập vs hash trong DB"""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )
```

---

## Token Helpers

```python
# app/utils/token.py
from flask_jwt_extended import create_access_token, create_refresh_token
from datetime import timedelta

def generate_tokens(user_id: int, extra_claims: dict = None) -> dict:
    """Tạo cặp access + refresh token"""
    identity = str(user_id)
    additional = extra_claims or {}

    return {
        "access_token": create_access_token(
            identity=identity,
            additional_claims=additional
        ),
        "refresh_token": create_refresh_token(
            identity=identity
        ),
        "token_type": "Bearer"
    }

# Ví dụ dùng extra_claims để nhúng role vào token
tokens = generate_tokens(user.id, extra_claims={"role": user.role})
```

---

## Auth Routes (`app/api/v1/auth/routes.py`)

```python
from flask import Blueprint, request
from flask_jwt_extended import (
    jwt_required, get_jwt_identity, get_jwt,
    create_access_token
)
from app.services.auth_service import AuthService
from app.schemas.auth_schema import (
    RegisterRequestSchema, LoginRequestSchema,
    TokenResponseSchema, UserResponseSchema
)
from app.utils.response import success_response

bp = Blueprint("auth", __name__, url_prefix="/auth")
service = AuthService()


@bp.route("/register", methods=["POST"])
def register():
    data = RegisterRequestSchema().load(request.json or {})
    user, tokens = service.register(data)
    return success_response(
        data={
            "user": UserResponseSchema().dump(user),
            "tokens": tokens
        },
        message="Đăng ký thành công",
        status_code=201
    )


@bp.route("/login", methods=["POST"])
def login():
    data = LoginRequestSchema().load(request.json or {})
    user, tokens = service.login(data["email"], data["password"])
    return success_response(
        data={
            "user": UserResponseSchema().dump(user),
            "tokens": tokens
        },
        message="Đăng nhập thành công"
    )


@bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)   # Chỉ chấp nhận refresh token
def refresh():
    user_id = get_jwt_identity()
    access_token = create_access_token(identity=user_id)
    return success_response(
        data={"access_token": access_token},
        message="Token đã được làm mới"
    )


@bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = service.get_current_user(user_id)
    return success_response(data=UserResponseSchema().dump(user))
```

---

## Auth Service (`app/services/auth_service.py`)

```python
from app.repositories.user_repository import UserRepository
from app.utils.security import hash_password, verify_password
from app.utils.token import generate_tokens
from app.utils.exceptions import UnauthorizedError, ConflictError, NotFoundError

class AuthService:
    def __init__(self):
        self.user_repo = UserRepository()

    def register(self, data: dict):
        # Check email tồn tại
        if self.user_repo.get_by_email(data["email"]):
            raise ConflictError("Email đã được sử dụng")

        # Hash password trước khi lưu
        data["password"] = hash_password(data.pop("password"))

        user = self.user_repo.create(data)
        tokens = generate_tokens(user.id, extra_claims={"role": user.role})
        return user, tokens

    def login(self, email: str, password: str):
        user = self.user_repo.get_by_email(email)

        # Dùng cùng 1 message cho cả 2 trường hợp — tránh user enumeration
        if not user or not verify_password(password, user.password):
            raise UnauthorizedError("Email hoặc mật khẩu không đúng")

        if not user.is_active:
            raise UnauthorizedError("Tài khoản đã bị vô hiệu hóa")

        tokens = generate_tokens(user.id, extra_claims={"role": user.role})
        return user, tokens

    def get_current_user(self, user_id: int):
        user = self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundError("Người dùng không tồn tại")
        return user
```

---

## Decorators Phân quyền (`app/utils/decorators.py`)

```python
from functools import wraps
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from app.utils.exceptions import ForbiddenError, UnauthorizedError

def login_required(f):
    """Bảo vệ route — yêu cầu đăng nhập"""
    @wraps(f)
    @jwt_required()
    def decorated(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    """Bảo vệ route — yêu cầu role cụ thể
    
    Dùng: @role_required("admin") hoặc @role_required("admin", "manager")
    """
    def decorator(f):
        @wraps(f)
        @jwt_required()
        def decorated(*args, **kwargs):
            claims = get_jwt()
            user_role = claims.get("role")
            if user_role not in roles:
                raise ForbiddenError("Bạn không có quyền thực hiện thao tác này")
            return f(*args, **kwargs)
        return decorated
    return decorator


def get_current_user_id() -> int:
    """Helper lấy user_id từ token trong route"""
    return int(get_jwt_identity())
```

---

## Cách dùng Decorators trong Routes

```python
from app.utils.decorators import login_required, role_required, get_current_user_id

# Chỉ cần đăng nhập
@bp.route("/profile", methods=["GET"])
@login_required
def get_profile():
    user_id = get_current_user_id()
    ...

# Chỉ admin
@bp.route("/admin/users", methods=["GET"])
@role_required("admin")
def list_all_users():
    ...

# Admin hoặc manager
@bp.route("/reports", methods=["GET"])
@role_required("admin", "manager")
def get_reports():
    ...

# Kiểm tra ownership (user chỉ được sửa data của mình)
@bp.route("/orders/<int:order_id>", methods=["PUT"])
@login_required
def update_order(order_id):
    current_user_id = get_current_user_id()
    order = service.get_order(order_id)
    if order.user_id != current_user_id:
        raise ForbiddenError("Bạn không có quyền sửa đơn hàng này")
    ...
```

---

## Auth Schemas (`app/schemas/auth_schema.py`)

```python
from marshmallow import Schema, fields, validate, validates, ValidationError

class RegisterRequestSchema(Schema):
    name     = fields.String(required=True, validate=validate.Length(min=2, max=100))
    email    = fields.Email(required=True)
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=8))

class LoginRequestSchema(Schema):
    email    = fields.Email(required=True)
    password = fields.String(required=True, load_only=True)

class UserResponseSchema(Schema):
    id         = fields.Integer(dump_only=True)
    name       = fields.String()
    email      = fields.String()
    role       = fields.String()
    is_active  = fields.Boolean()
    created_at = fields.DateTime(format="%Y-%m-%d %H:%M:%S")
    # Tuyệt đối không có: password
```

---

## JWT Error Handlers (thêm vào `register_error_handlers`)

```python
# app/__init__.py
def register_error_handlers(app):
    from flask_jwt_extended.exceptions import NoAuthorizationError, InvalidHeaderError

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return error_response(message="Token đã hết hạn", status_code=401)

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return error_response(message="Token không hợp lệ", status_code=401)

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return error_response(message="Yêu cầu xác thực", status_code=401)

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return error_response(message="Token đã bị thu hồi", status_code=401)
```

---

## .env cần có

```env
JWT_SECRET_KEY=your-super-secret-key-change-this-in-production
```

---

## Quy tắc bắt buộc

1. **Không bao giờ** lưu plain text password — luôn `hash_password()` trước khi lưu DB
2. **Không bao giờ** trả khác message cho "sai email" vs "sai password" — tránh user enumeration attack
3. **Access token** ngắn (1h), **refresh token** dài (30d) — không đảo ngược
4. `password` field trong schema **luôn** có `load_only=True`
5. **Không nhúng sensitive data** vào JWT claims (chỉ nhúng `user_id`, `role`)
6. `JWT_SECRET_KEY` phải ở `.env` — không hardcode trong code
7. Ownership check (user chỉ sửa data của mình) làm ở **Route layer**, không ở Service