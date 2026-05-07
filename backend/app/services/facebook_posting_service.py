from __future__ import annotations

from typing import Any

import requests

from app.utils.exceptions import AppError


class FacebookPostingService:
    def publish_video(self, page_id: str, page_access_token: str, video_url: str, caption: str) -> dict[str, Any]:
        endpoint = f"https://graph.facebook.com/v20.0/{page_id}/videos"
        response = requests.post(
            endpoint,
            data={
                "access_token": page_access_token,
                "file_url": video_url,
                "description": caption,
            },
            timeout=60,
        )

        if response.status_code >= 400:
            raise AppError(
                f"Facebook API error: {response.text}",
                status_code=502,
            )

        payload = response.json()
        video_id = payload.get("id")
        if not video_id:
            raise AppError("Facebook API did not return a video id", status_code=502)

        permalink = self._get_permalink(video_id, page_access_token)
        return {
            "video_id": video_id,
            "permalink_url": permalink,
            "raw": payload,
        }

    def _get_permalink(self, video_id: str, page_access_token: str) -> str:
        endpoint = f"https://graph.facebook.com/v20.0/{video_id}"
        response = requests.get(
            endpoint,
            params={
                "fields": "permalink_url",
                "access_token": page_access_token,
            },
            timeout=30,
        )

        if response.status_code < 400:
            permalink = response.json().get("permalink_url", "")
            if permalink:
                return self._normalize_fb_url(permalink, video_id)

        return f"facebook.com/reel/{video_id}"

    @staticmethod
    def _normalize_fb_url(permalink: str, video_id: str) -> str:
        # Extract the path segment and normalize to facebook.com/reel/{id}
        # permalink may be https://www.facebook.com/reel/123 or /video/123 etc.
        import re
        match = re.search(r"/(?:reel|video|videos)/(\d+)", permalink)
        reel_id = match.group(1) if match else video_id
        return f"facebook.com/reel/{reel_id}"
