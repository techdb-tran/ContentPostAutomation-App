from marshmallow import Schema, fields, validate


class CreateFacebookPageRequestSchema(Schema):
    via_account_id = fields.Integer(required=True, validate=validate.Range(min=1))
    page_id = fields.String(required=True, validate=validate.Length(min=2, max=128))
    page_name = fields.String(required=True, validate=validate.Length(min=2, max=255))
    page_access_token = fields.String(required=True, load_only=True, validate=validate.Length(min=10))
    is_selected = fields.Boolean(required=False, load_default=False)
    is_active = fields.Boolean(required=False, load_default=True)


class FacebookPageResponseSchema(Schema):
    id = fields.Integer(dump_only=True)
    via_account_id = fields.Integer()
    page_id = fields.String()
    page_name = fields.String()
    is_selected = fields.Boolean()
    is_active = fields.Boolean()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)
