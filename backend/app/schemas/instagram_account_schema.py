from marshmallow import Schema, fields


class InstagramAccountResponseSchema(Schema):
    id = fields.String(dump_only=True)
    via_account_id = fields.String()
    instagram_id = fields.String()
    username = fields.String()
    is_selected = fields.Boolean()
    is_active = fields.Boolean()
    created_at = fields.DateTime(dump_only=True)
    updated_at = fields.DateTime(dump_only=True)


class SaveIgSelectionSchema(Schema):
    selected_ig_ids = fields.List(fields.String(), required=True)
