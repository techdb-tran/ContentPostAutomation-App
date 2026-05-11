from app.repositories.user_repository import UserRepository
from app.utils.exceptions import ConflictError, UnauthorizedError
from app.utils.security import hash_password, verify_password
from app.utils.token import generate_tokens


class AuthService:
    def __init__(self):
        self.repo = UserRepository()

    def login(self, username: str, password: str):
        user = self.repo.get_by_username(username)
        if not user or not user.is_active or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Tên đăng nhập hoặc mật khẩu không đúng")

        tokens = generate_tokens(
            identity=user.username,
            extra_claims={"display_name": user.display_name, "role": user.role},
        )
        return user, tokens

    def register(self, username: str, password: str, display_name: str):
        if self.repo.get_by_username(username):
            raise ConflictError("Tên đăng nhập đã tồn tại")

        user = self.repo.create({
            "username": username,
            "display_name": display_name,
            "role": "user",
            "password_hash": hash_password(password),
            "is_active": True,
        })
        tokens = generate_tokens(
            identity=user.username,
            extra_claims={"display_name": user.display_name, "role": user.role},
        )
        return user, tokens

    def get_current_user(self, username: str):
        user = self.repo.get_by_username(username)
        if not user or not user.is_active:
            raise UnauthorizedError("Phiên đăng nhập không hợp lệ")
        return user
