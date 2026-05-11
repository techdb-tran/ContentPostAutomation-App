from __future__ import annotations

import time
from typing import Any

import requests

from app.utils.exceptions import AppError

GRAPH = "https://graph.facebook.com/v20.0"
# Max seconds to wait for IG media container to finish processing
_CONTAINER_POLL_TIMEOUT = 90
_CONTAINER_POLL_INTERVAL = 5


class InstagramPostingService:
    def publish_video(
        self,
        ig_user_id: str,
        access_token: str,
        video_url: str,
        caption: str,
    ) -> dict[str, Any]:
        container_id = self._create_video_container(ig_user_id, access_token, video_url, caption)
        self._wait_for_container(container_id, access_token)
        media_id = self._publish_container(ig_user_id, access_token, container_id)
        permalink = self._get_permalink(media_id, access_token)
        return {
            "media_id": media_id,
            "container_id": container_id,
            "permalink_url": permalink,
        }

    def _create_video_container(
        self, ig_user_id: str, access_token: str, video_url: str, caption: str
    ) -> str:
        resp = requests.post(
            f"{GRAPH}/{ig_user_id}/media",
            data={
                "media_type": "REELS",
                "video_url": video_url,
                "caption": caption,
                "access_token": access_token,
            },
            timeout=60,
        )
        if resp.status_code >= 400:
            raise AppError(f"Instagram API error (create container): {resp.text}", status_code=502)
        container_id = resp.json().get("id")
        if not container_id:
            raise AppError("Instagram API did not return a container id", status_code=502)
        return container_id

    def _wait_for_container(self, container_id: str, access_token: str) -> None:
        deadline = time.time() + _CONTAINER_POLL_TIMEOUT
        while time.time() < deadline:
            resp = requests.get(
                f"{GRAPH}/{container_id}",
                params={"fields": "status_code", "access_token": access_token},
                timeout=30,
            )
            if resp.status_code < 400:
                status = resp.json().get("status_code", "")
                if status == "FINISHED":
                    return
                if status == "ERROR":
                    raise AppError("Instagram media container processing failed", status_code=502)
            time.sleep(_CONTAINER_POLL_INTERVAL)
        raise AppError("Instagram media container timed out waiting for processing", status_code=504)

    def _publish_container(self, ig_user_id: str, access_token: str, container_id: str) -> str:
        resp = requests.post(
            f"{GRAPH}/{ig_user_id}/media_publish",
            data={
                "creation_id": container_id,
                "access_token": access_token,
            },
            timeout=60,
        )
        if resp.status_code >= 400:
            raise AppError(f"Instagram API error (publish): {resp.text}", status_code=502)
        media_id = resp.json().get("id")
        if not media_id:
            raise AppError("Instagram API did not return a media id", status_code=502)
        return media_id

    def _get_permalink(self, media_id: str, access_token: str) -> str:
        resp = requests.get(
            f"{GRAPH}/{media_id}",
            params={"fields": "permalink", "access_token": access_token},
            timeout=30,
        )
        if resp.status_code < 400:
            permalink = resp.json().get("permalink", "")
            if permalink:
                return permalink
        return f"instagram.com/reel/{media_id}"
