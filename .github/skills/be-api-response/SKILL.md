---
name: be-api-response
description: >
  Chuẩn hóa format response API cho toàn bộ Flask backend. Dùng skill này
  khi viết bất kỳ route nào trả về response, xử lý lỗi, hay cần biết
  HTTP status code phù hợp. Bắt buộc dùng khi tạo helper response, error
  handler, hoặc pagination. Không được tự định nghĩa format response ngoài
  skill này.
---

# API Response Skill

## Response Format chuẩn

Mọi API response đều theo format sau — không ngoại lệ:

```json
{
  "success": true,
  "message": "Mô tả ngắn",
  "data": { },
  "errors": null,
  "meta": null
}
```

| Field | Type | Khi nào có |
|-------|------|------------|
| `success` | bool | Luôn có |
| `message` | string | Luôn có |
| `data` | object/array/null | Khi success = true |
| `errors` | object/null | Khi success = false |
| `meta` | object/null | Khi có pagination |

---

## File cài đặt (`app/utils/response.py`)

```python
from flask import jsonify
from typing import Any, Optional

def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    meta: Optional[dict] = None
):
    """Response chuẩn cho thành công"""
    response = {
        "success": True,
        "message": message,
        "data": data,
        "errors": None,
        "meta": meta
    }
    return jsonify(response), status_code


def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    errors: Optional[dict] = None
):
    """Response chuẩn cho thất bại"""
    response = {
        "success": False,
        "message": message,
        "data": None,
        "errors": errors,
        "meta": None
    }
    return jsonify(response), status_code


def paginated_response(
    data: list,
    total: int,
    page: int,
    per_page: int,
    message: str = "Success"
):
    """Response chuẩn kèm pagination"""
    meta = {
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page,
        "has_next": page * per_page < total,
        "has_prev": page > 1
    }
    return success_response(data=data, message=message, meta=meta)
```

---

## HTTP Status Codes chuẩn

| Tình huống | Code | Dùng khi |
|-----------|------|---------|
| Lấy data thành công | `200 OK` | GET thành công |
| Tạo mới thành công | `201 Created` | POST tạo resource mới |
| Xóa thành công | `204 No Content` | DELETE (không trả body) |
| Validation lỗi | `400 Bad Request` | Input sai format/thiếu field |
| Chưa đăng nhập | `401 Unauthorized` | Thiếu/sai token |
| Không có quyền | `403 Forbidden` | Có token nhưng không đủ quyền |
| Không tìm thấy | `404 Not Found` | Resource không tồn tại |
| Trùng dữ liệu | `409 Conflict` | Email đã tồn tại, duplicate key |
| Lỗi server | `500 Internal` | Unhandled exception |

---

## Ví dụ thực tế

### GET thành công
```python
@bp.route("/users/<int:id>")
def get_user(id):
    user = service.get_user(id)
    return success_response(
        data=UserResponseSchema().dump(user),
        message="User retrieved successfully"
    )
# Response:
# { "success": true, "message": "User retrieved successfully",
#   "data": {"id": 1, "name": "..."}, "errors": null, "meta": null }
```

### POST tạo mới
```python
@bp.route("/users", methods=["POST"])
def create_user():
    data = CreateUserSchema().load(request.json)
    user = service.create_user(data)
    return success_response(
        data=UserResponseSchema().dump(user),
        message="User created successfully",
        status_code=201
    )
```

### Lỗi validation (tự động qua Schema + error handler)
```python
# Nếu Schema.load() raise ValidationError từ Marshmallow,
# error handler sẽ bắt và trả:
# {
#   "success": false,
#   "message": "Validation failed",
#   "data": null,
#   "errors": { "email": ["Not a valid email address."] }
# }
```

### Lỗi not found
```python
# Service raise NotFoundError → error handler bắt → trả:
# {
#   "success": false,
#   "message": "User 99 not found",
#   "data": null,
#   "errors": null
# }
```

### Pagination
```python
@bp.route("/users")
def get_users():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    
    users, total = service.get_users_paginated(page, per_page)
    return paginated_response(
        data=UserResponseSchema(many=True).dump(users),
        total=total,
        page=page,
        per_page=per_page
    )
# Response meta:
# { "total": 150, "page": 1, "per_page": 20,
#   "total_pages": 8, "has_next": true, "has_prev": false }
```

---

## Global Error Handler (đặt trong `app/__init__.py`)

```python
from marshmallow import ValidationError as MarshmallowValidationError
from app.utils.exceptions import AppError
from app.utils.response import error_response

def register_error_handlers(app):
    
    @app.errorhandler(AppError)
    def handle_app_error(e):
        return error_response(
            message=e.message,
            status_code=e.status_code
        )

    @app.errorhandler(MarshmallowValidationError)
    def handle_validation_error(e):
        return error_response(
            message="Validation failed",
            status_code=400,
            errors=e.messages  # Dict chi tiết lỗi từng field
        )

    @app.errorhandler(404)
    def handle_404(e):
        return error_response(message="Endpoint not found", status_code=404)

    @app.errorhandler(405)
    def handle_405(e):
        return error_response(message="Method not allowed", status_code=405)

    @app.errorhandler(500)
    def handle_500(e):
        app.logger.error(f"Unhandled error: {e}")
        return error_response(message="Internal server error", status_code=500)
```

---

## Quy tắc bắt buộc

1. **Không bao giờ** dùng `jsonify()` trực tiếp trong routes — luôn dùng `success_response` / `error_response`
2. **Không bao giờ** raise exception trực tiếp trong routes — raise custom exceptions từ `utils/exceptions.py`, để error handler bắt
3. **Không bao giờ** trả response format khác — frontend phụ thuộc vào structure này
4. `message` phải có nghĩa, tránh dùng "OK", "Error" chung chung
5. Khi trả list rỗng: `data: []` — không phải `data: null`