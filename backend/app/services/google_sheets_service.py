from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

VN_TZ = timezone(timedelta(hours=7))

import gspread
from flask import current_app
from google.oauth2.service_account import Credentials

from app.utils.exceptions import AppError, NotFoundError


STATUS_PLANNING = "Planning"
STATUS_PROCESSING = "Processing"
STATUS_DONE = "Done"
STATUS_ERROR = "Error"


@dataclass
class SheetRowData:
    row_number: int
    caption: str
    video_uri: str
    platform: str | None = None
    niche: str | None = None
    product_link: str | None = None
    raw_values: dict[str, Any] | None = None


class GoogleSheetsService:
    def __init__(self, spreadsheet_id: str, worksheet_name: str):
        self.spreadsheet_id = spreadsheet_id
        self.worksheet_name = worksheet_name
        self.credentials_file = current_app.config["GOOGLE_SERVICE_ACCOUNT_FILE"]

        if not self.credentials_file:
            raise AppError(
                "Missing GOOGLE_SERVICE_ACCOUNT_FILE",
                status_code=500,
            )

        self._worksheet = None
        self._header_map: dict[str, int] | None = None

    def _client(self):
        import json, os
        scopes = ["https://www.googleapis.com/auth/spreadsheets"]
        json_str = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON")
        if json_str:
            info = json.loads(json_str)
            credentials = Credentials.from_service_account_info(info, scopes=scopes)
        else:
            credentials = Credentials.from_service_account_file(self.credentials_file, scopes=scopes)
        return gspread.authorize(credentials)

    def _get_worksheet(self):
        if self._worksheet is None:
            spreadsheet = self._client().open_by_key(self.spreadsheet_id)
            self._worksheet = spreadsheet.worksheet(self.worksheet_name)
        return self._worksheet

    def _normalize_key(self, value: str) -> str:
        return value.strip().lower().replace(" ", "_").replace("-", "_")

    def _headers(self) -> dict[str, int]:
        if self._header_map is not None:
            return self._header_map

        worksheet = self._get_worksheet()
        header_row = worksheet.row_values(1)
        self._header_map = {self._normalize_key(name): index + 1 for index, name in enumerate(header_row)}
        return self._header_map

    def _column(self, *names: str) -> Optional[int]:
        headers = self._headers()
        for name in names:
            key = self._normalize_key(name)
            if key in headers:
                return headers[key]
        return None

    def _cell(self, row: int, *names: str) -> str:
        column = self._column(*names)
        if not column:
            return ""
        return self._get_worksheet().cell(row, column).value or ""

    def find_next_planning_row(self) -> SheetRowData:
        worksheet = self._get_worksheet()
        values = worksheet.get_all_values()

        if len(values) < 2:
            raise NotFoundError("Không tìm thấy dòng nội dung nào trong Google Sheet")

        status_column = self._column("Status")
        caption_column = self._column("Caption")
        video_column = self._column("Video URI", "Video URL", "Video Link")
        platform_column = self._column("Platform")
        niche_column = self._column("Niche")

        if not status_column or not caption_column or not video_column:
            raise AppError(
                "Google Sheet thiếu các cột bắt buộc: Caption, Video URI, Status",
                status_code=400,
            )

        for row_number, row_values in enumerate(values[1:], start=2):
            status_value = self._safe_value(row_values, status_column).strip().lower()
            if status_value != STATUS_PLANNING.lower():
                continue

            caption = self._safe_value(row_values, caption_column).strip()
            video_uri = self._safe_value(row_values, video_column).strip()
            if not caption or not video_uri:
                continue
            if not video_uri.startswith(("http://", "https://")):
                continue

            # Column B is index 1 (0-based), read directly by position
            product_link_raw = row_values[1].strip() if len(row_values) > 1 else ""
            product_link = product_link_raw if product_link_raw.startswith(("http://", "https://")) else None

            return SheetRowData(
                row_number=row_number,
                caption=caption,
                video_uri=video_uri,
                platform=self._safe_value(row_values, platform_column) if platform_column else None,
                niche=self._safe_value(row_values, niche_column) if niche_column else None,
                product_link=product_link,
                raw_values={"values": row_values},
            )

        raise NotFoundError("Không còn dòng Planning nào để đăng")

    def mark_processing(self, row_number: int) -> None:
        self._update_row(row_number, {"Status": STATUS_PROCESSING})

    def mark_done(self, row_number: int, posted_url: str) -> None:
        now_vn = datetime.now(tz=VN_TZ).strftime("%Y-%m-%d %H:%M:%S")
        update_payload = {"Status": STATUS_DONE, "Posted URI": posted_url, "Posted URL": posted_url, "Link Post": posted_url, "Time Post": now_vn}
        self._update_row(row_number, update_payload)

    def mark_error(self, row_number: int, error_message: str) -> None:
        update_payload = {"Status": STATUS_ERROR, "Error Message": error_message}
        self._update_row(row_number, update_payload)

    def _safe_value(self, row_values: list[str], column_number: Optional[int]) -> str:
        if not column_number:
            return ""
        index = column_number - 1
        if index >= len(row_values):
            return ""
        return row_values[index]

    def _update_row(self, row_number: int, updates: dict[str, Any]) -> None:
        worksheet = self._get_worksheet()
        headers = self._headers()
        cells = []
        for header_name, value in updates.items():
            normalized = self._normalize_key(header_name)
            column = headers.get(normalized)
            if not column:
                continue
            cells.append(gspread.Cell(row_number, column, value))

        if not cells:
            return

        worksheet.update_cells(cells)
