from marshmallow import EXCLUDE, Schema, fields, validate


class FacebookPageSummarySchema(Schema):
    id = fields.String()
    via_account_id = fields.String()
    page_id = fields.String()
    page_name = fields.String()
    is_selected = fields.Boolean()
    is_active = fields.Boolean()


class CreateCampaignRequestSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.String(required=True, validate=validate.Length(min=2, max=255))
    description = fields.String(required=False, allow_none=True)
    schedule_mode = fields.String(
        required=True,
        validate=validate.OneOf(["daily_fixed_time", "window_interval", "flexible_make_like"]),
    )
    schedule_config = fields.Dict(required=True)
    sheet_id = fields.String(required=True, validate=validate.Length(min=3, max=255))
    sheet_tab_name = fields.String(required=False, load_default="Sheet1")
    rows_per_run = fields.Integer(required=False, load_default=5, validate=validate.Range(min=1, max=100))
    page_ids = fields.List(fields.String(), required=False, load_default=list)


class UpdateCampaignRequestSchema(Schema):
    class Meta:
        unknown = EXCLUDE

    name = fields.String(required=False, validate=validate.Length(min=2, max=255))
    description = fields.String(required=False, allow_none=True)
    schedule_mode = fields.String(
        required=False,
        validate=validate.OneOf(["daily_fixed_time", "window_interval", "flexible_make_like"]),
    )
    schedule_config = fields.Dict(required=False)
    sheet_id = fields.String(required=False, validate=validate.Length(min=3, max=255))
    sheet_tab_name = fields.String(required=False)
    rows_per_run = fields.Integer(required=False, validate=validate.Range(min=1, max=100))
    is_active = fields.Boolean(required=False)
    page_ids = fields.List(fields.String(), required=False, load_default=None)


class CampaignResponseSchema(Schema):
    id = fields.String()
    name = fields.String()
    description = fields.String(allow_none=True)
    schedule_mode = fields.String()
    schedule_config = fields.Dict()
    sheet_id = fields.String()
    sheet_tab_name = fields.String()
    rows_per_run = fields.Integer()
    is_active = fields.Boolean()
    next_run_at = fields.DateTime(allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()
    pages = fields.List(fields.Nested(FacebookPageSummarySchema()))
