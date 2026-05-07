from datetime import datetime

from app.extensions import db


class ExecutionLog(db.Model):
    __tablename__ = "execution_logs"

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey("campaigns.id"), nullable=False)
    via_account_id = db.Column(db.Integer, db.ForeignKey("via_accounts.id"), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="Running")
    request_payload = db.Column(db.JSON, nullable=True)
    response_payload = db.Column(db.JSON, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    finished_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
