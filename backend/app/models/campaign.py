from datetime import datetime

from app.extensions import db


campaign_pages = db.Table(
    "campaign_pages",
    db.Column("campaign_id", db.Integer, db.ForeignKey("campaigns.id"), primary_key=True),
    db.Column("facebook_page_id", db.Integer, db.ForeignKey("facebook_pages.id"), primary_key=True),
)


class Campaign(db.Model):
    __tablename__ = "campaigns"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    schedule_mode = db.Column(db.String(64), nullable=False)
    schedule_config = db.Column(db.JSON, nullable=False, default=dict)
    sheet_id = db.Column(db.String(255), nullable=False)
    sheet_tab_name = db.Column(db.String(255), nullable=False, default="Sheet1")
    rows_per_run = db.Column(db.Integer, nullable=False, default=5)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    next_run_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    pages = db.relationship("FacebookPage", secondary=campaign_pages, lazy="joined")
