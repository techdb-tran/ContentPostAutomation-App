from flask_jwt_extended import create_access_token, create_refresh_token


def generate_tokens(identity: str, extra_claims: dict | None = None) -> dict:
    claims = extra_claims or {}
    return {
        "access_token": create_access_token(identity=identity, additional_claims=claims),
        "refresh_token": create_refresh_token(identity=identity, additional_claims=claims),
        "token_type": "Bearer",
    }
