---
name: be-database-patterns
description: >
  Quy tắc làm việc với SQLAlchemy và Repository pattern trong Flask. Dùng
  skill này khi viết models, queries, relationships, transactions, migrations
  (Alembic), hoặc bất kỳ thao tác DB nào. Bắt buộc đọc trước khi tạo model
  mới, viết query phức tạp, xử lý transaction, hoặc tạo migration.
---

# Database Patterns Skill

## SQLAlchemy Model chuẩn

```python
# app/models/user.py
from app.extensions import db
from datetime import datetime

class TimestampMixin:
    """Mixin dùng chung cho mọi model — luôn kế thừa cái này"""
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password   = db.Column(db.String(255), nullable=False)
    is_active  = db.Column(db.Boolean, default=True, nullable=False)
    role       = db.Column(db.String(20), default="user", nullable=False)

    # Relationships
    orders     = db.relationship("Order", back_populates="user", lazy="dynamic")

    def __repr__(self):
        return f"<User {self.email}>"
```

---

## Column Types & Options phổ biến

```python
# Types
db.Integer           # int
db.BigInteger        # bigint (dùng cho ID lớn)
db.String(n)         # varchar(n) — luôn chỉ định độ dài
db.Text              # text (không giới hạn)
db.Boolean           # bool
db.Float             # float
db.Numeric(10, 2)    # decimal — dùng cho tiền tệ
db.DateTime          # datetime
db.Date              # date only
db.JSON              # json column

# Options quan trọng
db.Column(db.String(255),
    nullable=False,      # NOT NULL
    unique=True,         # UNIQUE constraint
    index=True,          # Tạo index — dùng cho field hay WHERE/JOIN
    default="value",     # Giá trị mặc định Python-side
    server_default="0",  # Giá trị mặc định DB-side
)
```

---

## Relationships

```python
# One-to-Many (User có nhiều Orders)
class User(db.Model):
    orders = db.relationship(
        "Order",
        back_populates="user",
        lazy="dynamic",        # Trả về query object, không load ngay
        cascade="all, delete-orphan"  # Xóa user → xóa orders
    )

class Order(db.Model):
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    user    = db.relationship("User", back_populates="orders")

# Many-to-Many (Post có nhiều Tags)
post_tags = db.Table("post_tags",
    db.Column("post_id", db.Integer, db.ForeignKey("posts.id"), primary_key=True),
    db.Column("tag_id",  db.Integer, db.ForeignKey("tags.id"),  primary_key=True)
)

class Post(db.Model):
    tags = db.relationship("Tag", secondary=post_tags, back_populates="posts")

# Lazy loading options:
# lazy="select"   → load khi access (default) — dễ gây N+1
# lazy="dynamic"  → trả query object, gọi .all() khi cần
# lazy="joined"   → JOIN ngay khi query parent — dùng khi luôn cần data
# lazy="subquery" → subquery riêng — tốt cho list lớn
```

---

## Repository Pattern chuẩn

```python
# app/repositories/base_repository.py
from typing import TypeVar, Generic, Type, List, Optional
from app.extensions import db

T = TypeVar("T")

class BaseRepository(Generic[T]):
    """Base class — mọi repository đều kế thừa cái này"""

    def __init__(self, model: Type[T]):
        self.model = model

    def get_by_id(self, id: int) -> Optional[T]:
        return self.model.query.get(id)

    def get_all(self) -> List[T]:
        return self.model.query.all()

    def create(self, data: dict) -> T:
        obj = self.model(**data)
        db.session.add(obj)
        db.session.commit()
        return obj

    def update(self, obj: T, data: dict) -> T:
        for key, value in data.items():
            setattr(obj, key, value)
        db.session.commit()
        return obj

    def delete(self, obj: T) -> None:
        db.session.delete(obj)
        db.session.commit()

    def save(self, obj: T) -> T:
        """Dùng khi đã modify obj trực tiếp"""
        db.session.add(obj)
        db.session.commit()
        return obj


# app/repositories/user_repository.py
from app.models.user import User
from app.repositories.base_repository import BaseRepository
from typing import Optional, List

class UserRepository(BaseRepository[User]):

    def __init__(self):
        super().__init__(User)

    # Thêm methods đặc thù cho User
    def get_by_email(self, email: str) -> Optional[User]:
        return User.query.filter_by(email=email).first()

    def get_active_users(self) -> List[User]:
        return User.query.filter_by(is_active=True).all()

    def get_paginated(self, page: int, per_page: int, **filters):
        query = User.query
        if filters.get("role"):
            query = query.filter_by(role=filters["role"])
        if filters.get("search"):
            search = f"%{filters['search']}%"
            query = query.filter(
                db.or_(User.name.ilike(search), User.email.ilike(search))
            )
        pagination = query.order_by(User.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        return pagination.items, pagination.total
```

---

## Query Patterns

```python
# Filter cơ bản
User.query.filter_by(role="admin").all()
User.query.filter(User.email == "a@b.com").first()
User.query.filter(User.is_active == True).count()

# Multiple conditions
User.query.filter(
    User.is_active == True,
    User.role == "admin"
).all()

# OR condition
from sqlalchemy import or_
User.query.filter(
    or_(User.name.ilike("%john%"), User.email.ilike("%john%"))
).all()

# Order + Limit
User.query.order_by(User.created_at.desc()).limit(10).all()

# JOIN
Order.query.join(User).filter(User.role == "vip").all()

# Exists check
from sqlalchemy import exists
db.session.query(exists().where(User.email == email)).scalar()

# Aggregate
from sqlalchemy import func
db.session.query(func.count(User.id)).scalar()
db.session.query(func.sum(Order.total)).filter_by(user_id=1).scalar()

# Pagination
pagination = User.query.paginate(page=1, per_page=20, error_out=False)
items  = pagination.items   # list objects
total  = pagination.total   # tổng số records
pages  = pagination.pages   # tổng số trang
```

---

## Transaction Handling

```python
# Pattern 1: Tự động commit (dùng cho thao tác đơn giản)
def create(self, data: dict):
    obj = Model(**data)
    db.session.add(obj)
    db.session.commit()
    return obj

# Pattern 2: Manual transaction (dùng khi nhiều thao tác phụ thuộc nhau)
def transfer_order(self, from_user_id: int, to_user_id: int, order_id: int):
    try:
        order = self.order_repo.get_by_id(order_id)
        order.user_id = to_user_id
        # Có thể nhiều thao tác DB khác ở đây
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise e

# Pattern 3: Bulk operations (không commit từng cái — nhanh hơn nhiều)
def bulk_create(self, items: list):
    try:
        objects = [Model(**item) for item in items]
        db.session.bulk_save_objects(objects)
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise

# Quy tắc: commit chỉ ở Repository, KHÔNG commit trong Service
```

---

## Alembic Migrations

```bash
# Khởi tạo (chỉ 1 lần)
flask db init

# Tạo migration sau khi thay đổi model
flask db migrate -m "add users table"

# Xem migration được tạo ra — LUÔN kiểm tra trước khi apply
# File ở: migrations/versions/xxxx_add_users_table.py

# Apply migration
flask db upgrade

# Rollback 1 bước
flask db downgrade

# Xem lịch sử
flask db history
```

**Quy tắc migration:**
- Luôn `git add migrations/` cùng với model changes
- Tên migration phải mô tả rõ: `add_email_to_users`, `create_orders_table`
- Không sửa file migration đã được apply trên production
- Mỗi PR chỉ nên có 1 migration file

---

## Indexes — Khi nào cần

```python
# Đặt index=True cho field thường xuất hiện trong:
# WHERE, JOIN, ORDER BY, GROUP BY

# Single index
email = db.Column(db.String(255), index=True)

# Composite index (nhiều field cùng nhau)
class Order(db.Model):
    __table_args__ = (
        db.Index("ix_orders_user_status", "user_id", "status"),
    )

# Unique constraint nhiều field
class UserRole(db.Model):
    __table_args__ = (
        db.UniqueConstraint("user_id", "role_id", name="uq_user_role"),
    )
```

---

## Quy tắc bắt buộc

1. **Mọi model** đều kế thừa `TimestampMixin` — không ngoại lệ
2. **Commit chỉ ở Repository** — Service không gọi `db.session.commit()`
3. **Không dùng** `lazy="select"` cho relationship hay dùng nhiều — gây N+1 query
4. **Luôn dùng** `filter_by` cho equality, `filter` cho điều kiện phức tạp
5. **Sau khi thay đổi model** phải tạo migration ngay, không để tích lại
6. `String` column **luôn có độ dài** — không dùng `db.String()` trống
7. Tiền tệ dùng `db.Numeric(10, 2)` — không dùng `Float` (sai số)