from dataclasses import dataclass

from app.utils.exceptions import UnauthorizedError
from app.utils.security import hash_password
from app.utils.security import verify_password
from app.utils.token import generate_tokens


@dataclass(frozen=True)
class DemoAuthUser:
    username: str
    display_name: str
    role: str
    password_hash: str


class AuthService:
    def __init__(self):
        admin1_password_hash = hash_password("Admin1@123")
        admin2_password_hash = hash_password("Admin2@123")

        self.users = {
            "Admin1": DemoAuthUser(
                username="Admin1",
                display_name="Admin 1",
                role="admin",
                password_hash=admin1_password_hash,
            ),
            "Admin2": DemoAuthUser(
                username="Admin2",
                display_name="Admin 2",
                role="admin",
                password_hash=admin2_password_hash,
            ),
        }

    def login(self, username: str, password: str):
        user = self.users.get(username)
        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Tên đăng nhập hoặc mật khẩu không đúng")

        tokens = generate_tokens(
            identity=user.username,
            extra_claims={"display_name": user.display_name, "role": user.role},
        )
        return user, tokens

    def get_current_user(self, username: str):
        user = self.users.get(username)
        if not user:
            raise UnauthorizedError("Phiên đăng nhập không hợp lệ")
        return user
