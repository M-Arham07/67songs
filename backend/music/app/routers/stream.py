import asyncio
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
import httpx
import yt_dlp

router = APIRouter(prefix="/api", tags=["stream"])
executor = ThreadPoolExecutor(max_workers=4)

_audio_url_cache: dict[str, dict] = {}
_cache_ttl_ms = 3600_000  # 1 hour
_cache_timestamps: dict[str, float] = {}


def _get_cookie_file_path() -> str | None:
    """Finds or creates a cookie file for yt-dlp authentication.
    Supports:
    1. YOUTUBE_COOKIES environment variable (raw Netscape text or base64)
    2. Local files: ytcookies.txt, cookies.txt in workspace or /app
    """
    # 1. Check environment variable
    raw_cookies = os.environ.get("YOUTUBE_COOKIES", "").strip()
    if raw_cookies:
        try:
            import base64
            if not raw_cookies.startswith("#") and "\t" not in raw_cookies:
                try:
                    decoded = base64.b64decode(raw_cookies).decode("utf-8")
                    if "#" in decoded or "\t" in decoded:
                        raw_cookies = decoded
                except Exception:
                    pass

            tmp_path = Path(tempfile.gettempdir()) / "yt_cookies.txt"
            tmp_path.write_text(raw_cookies, encoding="utf-8")
            return str(tmp_path)
        except Exception as e:
            print(f"[yt-dlp] Error writing YOUTUBE_COOKIES to temp file: {e}")

    # 2. Check candidate local file locations
    candidates = [
        Path("/app/cookies.txt"),
        Path("/app/ytcookies.txt"),
        Path(__file__).parent.parent.parent / "cookies.txt",
        Path(__file__).parent.parent.parent / "ytcookies.txt",
        Path.cwd() / "cookies.txt",
        Path.cwd() / "ytcookies.txt",
        Path.cwd() / "backend" / "music" / "cookies.txt",
        Path.cwd() / "backend" / "music" / "ytcookies.txt",
        Path("/home/M-Arham07/Desktop/67songs/ytcookies.txt"),
        Path("/home/M-Arham07/Desktop/67songs/cookies.txt"),
    ]

    for candidate in candidates:
        if candidate.is_file() and candidate.stat().st_size > 0:
            print(f"[yt-dlp] Using cookie file at: {candidate}")
            return str(candidate)

    return None


def _get_ydl_options() -> dict:
    """Builds yt-dlp options with authenticated cookies if available."""
    opts = {
        "format": "bestaudio/best",
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "extract_flat": False,
        "skip_download": True,
        "socket_timeout": 15,
        "extractor_args": {
            "youtube": {
                "player_client": ["mweb", "tv", "web"]
            }
        }
    }

    cookie_path = _get_cookie_file_path()
    if cookie_path:
        opts["cookiefile"] = cookie_path
        print(f"[yt-dlp] Loaded authenticated cookies from: {cookie_path}")
    else:
        print("[yt-dlp] Warning: No cookies found. Extraction may be blocked on cloud IPs.")

    return opts


def _is_cache_valid(video_id: str) -> bool:
    import time
    ts = _cache_timestamps.get(video_id, 0)
    return (time.time() * 1000 - ts) < _cache_ttl_ms


def _extract_audio_url_sync(video_id: str) -> dict | None:
    if video_id in _audio_url_cache and _is_cache_valid(video_id):
        return _audio_url_cache[video_id]

    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = _get_ydl_options()

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(url, download=False)
            if not info:
                return None

            raw_url = None
            if "url" in info and info["url"]:
                raw_url = info["url"]
            else:
                formats = info.get("formats", [])
                audio_formats = [
                    f for f in formats
                    if f.get("acodec") != "none"
                    and f.get("url")
                ]
                if audio_formats:
                    raw_url = audio_formats[-1]["url"]
                elif formats:
                    for f in reversed(formats):
                        if f.get("url"):
                            raw_url = f["url"]
                            break

            if raw_url:
                import time
                res = {
                    "audioUrl": raw_url,
                    "duration": info.get("duration", 0),
                    "title": info.get("title"),
                    "ext": info.get("ext", "m4a"),
                }
                _audio_url_cache[video_id] = res
                _cache_timestamps[video_id] = time.time() * 1000
                print(f"[yt-dlp] Successfully extracted audio URL for '{info.get('title')}' ({video_id})")
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
        raise HTTPException(
            status_code=404,
            detail="Audio stream extraction failed. Please verify YouTube cookies."
        )

    target_url = result["audioUrl"]
    client = httpx.AsyncClient(follow_redirects=True, timeout=25.0)

    # Forward HTTP Range headers for fast seeking and buffering
    req_headers = {}
    range_header = request.headers.get("range")
    if range_header:
        req_headers["range"] = range_header

    req_headers["User-Agent"] = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )

    try:
        req = client.build_request("GET", target_url, headers=req_headers)
        r = await client.send(req, stream=True)

        if r.status_code >= 400:
            await r.aclose()
            await client.aclose()
            _audio_url_cache.pop(video_id, None)
            _cache_timestamps.pop(video_id, None)
            raise HTTPException(
                status_code=r.status_code,
                detail="Remote audio stream request rejected"
            )

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
            "Cache-Control": "public, max-age=3600",
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
    except HTTPException:
        raise
    except Exception as e:
        await client.aclose()
        _audio_url_cache.pop(video_id, None)
        _cache_timestamps.pop(video_id, None)
        raise HTTPException(status_code=500, detail=str(e))
