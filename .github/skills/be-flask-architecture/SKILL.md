---
name: be-flask-architecture
description: >
  Định nghĩa chuẩn kiến trúc Flask cho dự án. Dùng skill này bất cứ khi nào:
  tạo feature mới, thêm endpoint mới, tổ chức lại file/folder, hỏi về luồng
  dữ liệu, đặt tên class/function/file trong Flask. Bắt buộc đọc trước khi
  viết bất kỳ file Python nào trong backend.
---

# Flask Architecture Skill

## Cấu trúc thư mục chuẩn

```
backend/
└── app/
    ├── api/                  # Routes & Blueprint
    │   ├── __init__.py       # Đăng ký tất cả blueprints
    │   └── v1/
    │       ├── __init__.py
    │       └── <feature>/
    │           ├── __init__.py
    │           └── routes.py
    ├── models/               # SQLAlchemy models (DB schema)
    │   ├── __init__.py
    │   └── <feature>.py
    ├── repositories/         # Truy vấn DB (chỉ CRUD thuần)
    │   ├── __init__.py
    │   └── <feature>_repository.py
    ├── schemas/              # Marshmallow schemas (validate + serialize)
    │   ├── __init__.py
    │   └── <feature>_schema.py
    ├── services/             # Business logic
    │   ├── __init__.py
    │   └── <feature>_service.py
    └── utils/                # Hàm tiện ích dùng chung
        ├── __init__.py
        ├── exceptions.py     # Custom exceptions
        └── helpers.py
```

---

## Luồng dữ liệu bắt buộc

```
Request
   ↓
[routes.py]         ← Chỉ: validate input qua Schema, gọi Service, trả Response
   ↓
[service.py]        ← Business logic, orchestrate, không query DB trực tiếp
   ↓
[repository.py]     ← Chỉ: query DB qua SQLAlchemy, không có logic
   ↓
[model.py]          ← SQLAlchemy model, không có business logic
   ↓
Database
```

**Quy tắc cứng:**
- Route **không được** gọi Repository trực tiếp
- Repository **không được** chứa business logic
- Service **không được** import từ `api/` (tránh circular import)
- Model **không được** chứa validation logic

---

## Quy tắc đặt tên

### Files
| Layer | Pattern | Ví dụ |
|-------|---------|-------|
| Model | `<noun>.py` | `user.py`, `order.py` |
| Repository | `<noun>_repository.py` | `user_repository.py` |
| Schema | `<noun>_schema.py` | `user_schema.py` |
| Service | `<noun>_service.py` | `user_service.py` |
| Routes | `routes.py` | (trong folder feature) |

### Classes & Functions
```python
# Model: PascalCase noun
class User(db.Model): ...

# Repository: PascalCase + Repository suffix
class UserRepository: ...

# Service: PascalCase + Service suffix
class UserService: ...

# Schema: PascalCase + Schema suffix, thêm Request/Response nếu cần
class UserSchema(ma.Schema): ...
class CreateUserRequestSchema(ma.Schema): ...
class UserResponseSchema(ma.Schema): ...

# Repository methods: động từ rõ ràng
def get_by_id(self, user_id: int) -> Optional[User]: ...
def get_all(self, **filters) -> List[User]: ...
def create(self, data: dict) -> User: ...
def update(self, user: User, data: dict) -> User: ...
def delete(self, user: User) -> None: ...

# Service methods: mô tả hành động business
def register_user(self, data: dict) -> User: ...
def deactivate_account(self, user_id: int) -> None: ...
```

---

## Template tạo feature mới

### Bước 1: Model (`app/models/<feature>.py`)
```python
from app.extensions import db
from datetime import datetime

class FeatureName(db.Model):
    __tablename__ = "feature_names"

    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<FeatureName {self.id}>"
```

### Bước 2: Repository (`app/repositories/<feature>_repository.py`)
```python
from typing import List, Optional
from app.models.<feature> import FeatureName
from app.extensions import db

class FeatureNameRepository:
    def get_by_id(self, id: int) -> Optional[FeatureName]:
        return FeatureName.query.get(id)

    def get_all(self) -> List[FeatureName]:
        return FeatureName.query.all()

    def create(self, data: dict) -> FeatureName:
        obj = FeatureName(**data)
        db.session.add(obj)
        db.session.commit()
        return obj

    def update(self, obj: FeatureName, data: dict) -> FeatureName:
        for key, value in data.items():
            setattr(obj, key, value)
        db.session.commit()
        return obj

    def delete(self, obj: FeatureName) -> None:
        db.session.delete(obj)
        db.session.commit()
```

### Bước 3: Service (`app/services/<feature>_service.py`)
```python
from app.repositories.<feature>_repository import FeatureNameRepository
from app.utils.exceptions import NotFoundError

class FeatureNameService:
    def __init__(self):
        self.repo = FeatureNameRepository()

    def get_item(self, id: int):
        obj = self.repo.get_by_id(id)
        if not obj:
            raise NotFoundError(f"FeatureName {id} not found")
        return obj

    def create_item(self, data: dict):
        # Business logic ở đây
        return self.repo.create(data)
```

### Bước 4: Routes (`app/api/v1/<feature>/routes.py`)
```python
from flask import Blueprint, request
from app.services.<feature>_service import FeatureNameService
from app.schemas.<feature>_schema import CreateFeatureSchema, FeatureResponseSchema
from app.utils.response import success_response, error_response

bp = Blueprint("<feature>", __name__, url_prefix="/<features>")
service = FeatureNameService()

@bp.route("/", methods=["GET"])
def get_all():
    items = service.get_all()
    return success_response(data=FeatureResponseSchema(many=True).dump(items))

@bp.route("/<int:id>", methods=["GET"])
def get_one(id):
    item = service.get_item(id)
    return success_response(data=FeatureResponseSchema().dump(item))

@bp.route("/", methods=["POST"])
def create():
    schema = CreateFeatureSchema()
    data = schema.load(request.json)  # Validate input
    item = service.create_item(data)
    return success_response(data=FeatureResponseSchema().dump(item), status_code=201)
```

---

## Exceptions chuẩn (`app/utils/exceptions.py`)

```python
class AppError(Exception):
    """Base exception cho toàn bộ app"""
    status_code = 500
    message = "Internal server error"

    def __init__(self, message=None, status_code=None):
        super().__init__()
        if message:
            self.message = message
        if status_code:
            self.status_code = status_code

class NotFoundError(AppError):
    status_code = 404
    message = "Resource not found"

class ValidationError(AppError):
    status_code = 400
    message = "Validation failed"

class UnauthorizedError(AppError):
    status_code = 401
    message = "Unauthorized"

class ForbiddenError(AppError):
    status_code = 403
    message = "Forbidden"

class ConflictError(AppError):
    status_code = 409
    message = "Resource already exists"
```

---

## Global Error Handler (`app/__init__.py`)

```python
from app.utils.exceptions import AppError
from app.utils.response import error_response

def register_error_handlers(app):
    @app.errorhandler(AppError)
    def handle_app_error(e):
        return error_response(message=e.message, status_code=e.status_code)

    @app.errorhandler(404)
    def handle_404(e):
        return error_response(message="Endpoint not found", status_code=404)

    @app.errorhandler(500)
    def handle_500(e):
        return error_response(message="Internal server error", status_code=500)
```

---

## Checklist trước khi thêm feature

- [ ] Tạo Model → chạy migration
- [ ] Tạo Repository (chỉ CRUD)
- [ ] Tạo Service (business logic)
- [ ] Tạo Schema (input + output)
- [ ] Tạo Routes (Blueprint)
- [ ] Đăng ký Blueprint trong `app/api/__init__.py`
- [ ] Không có logic nào bị đặt sai layer

## Tham khảo thêm
- Xem `references/blueprint-registration.md` cho cách đăng ký Blueprint phức tạp