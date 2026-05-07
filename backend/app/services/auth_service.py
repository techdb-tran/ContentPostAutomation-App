from app.models.user import User
from app.utils.exceptions import UnauthorizedError
from app.utils.security import verify_password
from app.utils.token import generate_tokens


class AuthService:
    def login(self, username: str, password: str):
        user = User.query.filter_by(username=username, is_active=True).first()
        if not user or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Tên đăng nhập hoặc mật khẩu không đúng")

        tokens = generate_tokens(
            identity=user.username,
            extra_claims={"display_name": user.display_name, "role": user.role},
        )
        return user, tokens

    def get_current_user(self, username: str):
        user = User.query.filter_by(username=username, is_active=True).first()
        if not user:
            raise UnauthorizedError("Phiên đăng nhập không hợp lệ")
        return user
