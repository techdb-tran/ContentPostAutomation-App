---
name: be-schema-validation
description: >
  Quy tắc viết Marshmallow schemas để validate input và serialize output
  trong Flask. Dùng skill này khi tạo schema mới, validate request body,
  serialize response, xử lý nested objects, custom validators, hoặc bất
  cứ khi nào làm việc với file *_schema.py. Bắt buộc đọc trước khi viết
  bất kỳ schema nào.
---

# Schema Validation Skill

## Nguyên tắc cốt lõi

- **Request Schema** → validate và deserialize **input** từ client
- **Response Schema** → serialize **output** trả về client
- Tách biệt Request và Response schema — không dùng chung 1 schema cho cả 2 mục đích
- Schema **không chứa business logic** — chỉ validate format/type/required

---

## Cài đặt Marshmallow

```python
# app/extensions.py
from flask_marshmallow import Marshmallow
ma = Marshmallow()

# app/__init__.py
from app.extensions import ma
ma.init_app(app)
```

---

## Template Schema chuẩn

```python
# app/schemas/user_schema.py
from marshmallow import Schema, fields, validate, validates, ValidationError, post_load
from app.extensions import ma

# ── REQUEST SCHEMAS ──────────────────────────────────────────

class CreateUserRequestSchema(Schema):
    """Validate input khi tạo user mới"""
    name = fields.String(
        required=True,
        validate=validate.Length(min=2, max=100),
        error_messages={"required": "Tên là bắt buộc"}
    )
    email = fields.Email(
        required=True,
        error_messages={"required": "Email là bắt buộc", "invalid": "Email không hợp lệ"}
    )
    password = fields.String(
        required=True,
        load_only=True,           # Không bao giờ serialize ra ngoài
        validate=validate.Length(min=8)
    )
    role = fields.String(
        load_default="user",      # Giá trị mặc định nếu không gửi
        validate=validate.OneOf(["user", "admin"])
    )

    @validates("email")
    def validate_email_unique(self, value):
        """Custom validator — ví dụ check DB"""
        from app.repositories.user_repository import UserRepository
        if UserRepository().get_by_email(value):
            raise ValidationError("Email đã được sử dụng")

    @post_load
    def make_object(self, data, **kwargs):
        """Chạy sau khi validate — có thể transform data"""
        data["email"] = data["email"].lower()
        return data


class UpdateUserRequestSchema(Schema):
    """Validate input khi update — tất cả field đều optional"""
    name = fields.String(validate=validate.Length(min=2, max=100))
    email = fields.Email()
    # Không có password ở đây — đặt trong ChangePasswordSchema riêng


# ── RESPONSE SCHEMAS ─────────────────────────────────────────

class UserResponseSchema(Schema):
    """Serialize user ra ngoài — kiểm soát chặt field nào được trả"""
    id = fields.Integer(dump_only=True)
    name = fields.String()
    email = fields.String()
    role = fields.String()
    created_at = fields.DateTime(format="%Y-%m-%d %H:%M:%S")
    # Không có: password, internal fields
```

---

## Field Types phổ biến

```python
# Kiểu dữ liệu
fields.String()           # text
fields.Integer()          # số nguyên
fields.Float()            # số thực
fields.Boolean()          # true/false
fields.Email()            # validate email tự động
fields.URL()              # validate URL tự động
fields.DateTime()         # datetime object
fields.Date()             # date only
fields.UUID()             # UUID

# Options thường dùng
fields.String(
    required=True,                          # Bắt buộc phải có
    load_default="value",                   # Giá trị mặc định khi thiếu
    dump_default="value",                   # Giá trị mặc định khi serialize
    load_only=True,                         # Chỉ nhận vào, không dump ra
    dump_only=True,                         # Chỉ dump ra, không nhận vào
    allow_none=True,                        # Cho phép null
    validate=validate.Length(min=1, max=255),
    error_messages={"required": "Trường này bắt buộc"}
)
```

---

## Validators có sẵn

```python
from marshmallow import validate

validate.Length(min=2, max=100)         # Độ dài string/list
validate.Range(min=0, max=100)          # Phạm vi số
validate.OneOf(["a", "b", "c"])         # Enum values
validate.Regexp(r"^\+?[1-9]\d{9,14}$") # Regex (ví dụ: phone)
validate.URL()                           # Validate URL
validate.Email()                         # Validate email
validate.NoneOf(["admin", "root"])      # Blacklist values
```

---

## Nested Schemas (quan hệ 1-N, 1-1)

```python
class AddressSchema(Schema):
    street = fields.String(required=True)
    city = fields.String(required=True)
    country = fields.String(load_default="VN")

class CreateOrderRequestSchema(Schema):
    items = fields.List(
        fields.Nested(OrderItemSchema),
        required=True,
        validate=validate.Length(min=1, error="Đơn hàng phải có ít nhất 1 sản phẩm")
    )
    shipping_address = fields.Nested(AddressSchema, required=True)

class UserResponseSchema(Schema):
    id = fields.Integer()
    name = fields.String()
    orders = fields.List(fields.Nested(OrderResponseSchema))  # 1-N
    profile = fields.Nested(ProfileResponseSchema)            # 1-1
```

---

## Cách dùng trong Routes

```python
from app.schemas.user_schema import CreateUserRequestSchema, UserResponseSchema
from marshmallow import ValidationError

# Cách 1: Để error handler bắt (khuyến nghị)
@bp.route("/users", methods=["POST"])
def create_user():
    schema = CreateUserRequestSchema()
    data = schema.load(request.json or {})  # Tự throw ValidationError nếu lỗi
    user = service.create_user(data)
    return success_response(
        data=UserResponseSchema().dump(user),
        status_code=201
    )

# Cách 2: Bắt lỗi thủ công (dùng khi cần xử lý đặc biệt)
@bp.route("/users", methods=["POST"])
def create_user():
    schema = CreateUserRequestSchema()
    try:
        data = schema.load(request.json or {})
    except ValidationError as e:
        return error_response(message="Dữ liệu không hợp lệ", errors=e.messages, status_code=400)
    user = service.create_user(data)
    return success_response(data=UserResponseSchema().dump(user), status_code=201)

# Serialize list
users = service.get_all()
return success_response(data=UserResponseSchema(many=True).dump(users))
```

---

## Quy ước đặt tên Schema

| Mục đích | Pattern | Ví dụ |
|---------|---------|-------|
| Tạo mới | `Create<Noun>RequestSchema` | `CreateUserRequestSchema` |
| Cập nhật | `Update<Noun>RequestSchema` | `UpdateUserRequestSchema` |
| Trả về 1 item | `<Noun>ResponseSchema` | `UserResponseSchema` |
| Query params | `<Noun>FilterSchema` | `UserFilterSchema` |
| Đổi password | `Change<Noun>Schema` | `ChangePasswordSchema` |

---

## Validate Query Parameters

```python
class UserFilterSchema(Schema):
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))
    search = fields.String(load_default=None, allow_none=True)
    role = fields.String(validate=validate.OneOf(["user", "admin"]), load_default=None)

# Trong route:
@bp.route("/users")
def get_users():
    filter_schema = UserFilterSchema()
    params = filter_schema.load(request.args)  # Validate query params
    users, total = service.get_users(**params)
    return paginated_response(...)
```

---

## Quy tắc bắt buộc

1. **Luôn tách** `RequestSchema` và `ResponseSchema` — không dùng 1 schema cho cả 2
2. **Password và sensitive fields** phải có `load_only=True` trong mọi schema
3. **Không bao giờ** `.load()` trực tiếp `request.json` không kiểm tra null — dùng `request.json or {}`
4. `dump_only=True` cho `id`, `created_at`, `updated_at` trong response schema
5. Error messages phải bằng tiếng Việt hoặc tiếng Anh nhất quán trong toàn dự án — **chọn 1, giữ mãi**