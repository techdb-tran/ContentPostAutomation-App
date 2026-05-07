from datetime import datetime

from app.extensions import db


class SheetContentRow(db.Model):
    __tablename__ = "sheet_content_rows"

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("campaigns.id"), nullable=False)
    sheet_row_number = db.Column(db.Integer, nullable=False)
    caption = db.Column(db.Text, nullable=False)
    video_link = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="Planning")
    post_url = db.Column(db.Text, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    scheduled_at = db.Column(db.DateTime, nullable=True)
    posted_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
