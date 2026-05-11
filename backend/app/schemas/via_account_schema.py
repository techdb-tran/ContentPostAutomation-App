from marshmallow import Schema, fields, validate


class CreateViaAccountRequestSchema(Schema):
    display_name = fields.String(required=True, validate=validate.Length(min=2, max=255))
    access_token = fields.String(required=True, load_only=True, validate=validate.Length(min=10))
    token_expires_at = fields.DateTime(required=False, allow_none=True)


class ViaAccountResponseSchema(Schema):
    id = fields.String(dump_only=True)
    display_name = fields.String()
    token_expires_at = fields.DateTime(allow_none=True)
    is_active = fields.Boolean()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class SavePageSelectionSchema(Schema):
    selected_page_ids = fields.List(fields.String(), required=True)
