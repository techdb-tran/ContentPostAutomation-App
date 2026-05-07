from marshmallow import Schema, fields, validate


class LoginRequestSchema(Schema):
    username = fields.String(required=True, validate=validate.Length(min=2, max=50))
    password = fields.String(required=True, load_only=True, validate=validate.Length(min=6, max=100))


class AuthUserResponseSchema(Schema):
    username = fields.String()
    display_name = fields.String()
    role = fields.String()


class AuthTokenResponseSchema(Schema):
    access_token = fields.String()
    refresh_token = fields.String()
    token_type = fields.String()
