import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
import httpx
import yt_dlp
from app.middleware.auth import verify_music_service_secret

router = APIRouter(prefix="/api", tags=["stream"])
executor = ThreadPoolExecutor(max_workers=4)

YDL_OPTS = {
    "format": "bestaudio/best",
    "quiet": True,
    "no_warnings": True,
    "noplaylist": True,
    "extract_flat": False,
    "skip_download": True,
    "socket_timeout": 10,
}

_audio_url_cache = {}


def _extract_audio_url_sync(video_id: str):
    if video_id in _audio_url_cache:
        return _audio_url_cache[video_id]

    url = f"https://www.youtube.com/watch?v={video_id}"
    with yt_dlp.YoutubeDL(YDL_OPTS) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            if not info:
                return None

            raw_url = None
            if "url" in info:
                raw_url = info["url"]
            else:
                formats = info.get("formats", [])
                audio_formats = [f for f in formats if f.get("acodec") != "none" and f.get("vcodec") == "none"]
                if audio_formats:
                    raw_url = audio_formats[-1]["url"]
                elif formats:
                    raw_url = formats[-1]["url"]

            if raw_url:
                res = {
                    "audioUrl": raw_url,
                    "duration": info.get("duration", 0),
                    "title": info.get("title"),
                    "ext": info.get("ext", "m4a"),
                }
                _audio_url_cache[video_id] = res
                return res
            return None
        except Exception as e:
            print(f"[yt-dlp] Extraction error for {video_id}: {e}")
            return None


@router.get("/stream/{video_id}")
async def proxy_audio_stream(video_id: str, request: Request):
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, _extract_audio_url_sync, video_id)
    if not result or not result.get("audioUrl"):
        raise HTTPException(status_code=404, detail="Audio stream not found")

    target_url = result["audioUrl"]
    client = httpx.AsyncClient(follow_redirects=True, timeout=20.0)

    # Forward Range headers if present
    req_headers = {}
    range_header = request.headers.get("range")
    if range_header:
        req_headers["range"] = range_header

    req_headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

    try:
        req = client.build_request("GET", target_url, headers=req_headers)
        r = await client.send(req, stream=True)

        async def stream_generator():
            try:
                async for chunk in r.aiter_raw():
                    yield chunk
            finally:
                await r.aclose()
                await client.aclose()

        resp_headers = {
            "Accept-Ranges": "bytes",
            "Content-Type": r.headers.get("content-type", "audio/mp4"),
        }
        if "content-range" in r.headers:
            resp_headers["Content-Range"] = r.headers["content-range"]
        if "content-length" in r.headers:
            resp_headers["Content-Length"] = r.headers["content-length"]

        return StreamingResponse(
            stream_generator(),
            status_code=r.status_code,
            headers=resp_headers,
        )
    except Exception as e:
        await client.aclose()
        raise HTTPException(status_code=500, detail=str(e))
