from datetime import datetime
from typing import Optional

from app.extensions import get_firestore
from app.models.execution_log import ExecutionLog

COLLECTION = "execution_logs"


class ExecutionLogRepository:
    def _db(self):
        return get_firestore()

    def create(self, data: dict) -> ExecutionLog:
        now = datetime.utcnow()
        data.setdefault("created_at", now)
        data.setdefault("started_at", now)
        data.setdefault("status", "Running")
        ref = self._db().collection(COLLECTION).document()
        ref.set(data)
        d = ref.get().to_dict()
        return ExecutionLog(
            id=ref.id,
            campaign_id=d["campaign_id"],
            via_account_id=d["via_account_id"],
            status=d.get("status", "Running"),
            request_payload=d.get("request_payload"),
            response_payload=d.get("response_payload"),
            error_message=d.get("error_message"),
            started_at=d.get("started_at", now),
            finished_at=d.get("finished_at"),
            created_at=d.get("created_at", now),
        )

    def update(self, log_id: str, data: dict) -> None:
        self._db().collection(COLLECTION).document(log_id).update(data)
