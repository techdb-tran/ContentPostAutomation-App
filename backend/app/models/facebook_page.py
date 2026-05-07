from datetime import datetime

from app.extensions import db


class FacebookPage(db.Model):
    __tablename__ = "facebook_pages"

    id = db.Column(db.Integer, primary_key=True)
    via_account_id = db.Column(db.Integer, db.ForeignKey("via_accounts.id"), nullable=False)
    page_id = db.Column(db.String(128), nullable=False, unique=True)
    page_name = db.Column(db.String(255), nullable=False)
    page_access_token = db.Column(db.Text, nullable=False)
    is_selected = db.Column(db.Boolean, default=False, nullable=False)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
