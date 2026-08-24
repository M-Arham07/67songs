import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth import verify_music_service_secret
import yt_dlp

router = APIRouter(prefix="/api", tags=["stream"])
executor = ThreadPoolExecutor(max_workers=4)

YDL_OPTS = {
    "format": "bestaudio/best",
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "extract_flat": False,
    "skip_download": True,
    "socket_timeout": 8,
}


def _extract_audio_url_sync(video_id: str):
    url = f"https://www.youtube.com/watch?v={video_id}"
    with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            if not info:
                return None

            # Find best audio url
            if "url" in info:
                return {
                    "audioUrl": info["url"],
                    "duration": info.get("duration", 0),
                    "title": info.get("title"),
                    "ext": info.get("ext", "m4a"),
                }

            # Check formats list
            formats = info.get("formats", [])
            audio_formats = [f for f in formats if f.get("acodec") != "none" and f.get("vcodec") == "none"]
            if audio_formats:
                best = audio_formats[-1]
                return {
                    "audioUrl": best["url"],
                    "duration": info.get("duration", 0),
                    "title": info.get("title"),
                    "ext": best.get("ext", "m4a"),
                }
            elif formats:
                best = formats[-1]
                return {
                    "audioUrl": best["url"],
                    "duration": info.get("duration", 0),
                    "title": info.get("title"),
                    "ext": best.get("ext", "mp4"),
                }
            return None
        except Exception as e:
            print(f"[yt-dlp] Extraction error for {video_id}: {e}")
            return None


@router.get("/audio/{video_id}", dependencies=[Depends(verify_music_service_secret)])
async def get_audio_stream_fallback(video_id: str):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, _extract_audio_url_sync, video_id)
    if not result or not result.get("audioUrl"):
        raise HTTPException(status_code=404, detail="Could not extract audio fallback stream")
    return {
        "success": True,
        "videoId": video_id,
        "audioUrl": result["audioUrl"],
        "duration": result.get("duration", 0),
        "ext": result.get("ext", "m4a"),
    }
