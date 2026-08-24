import asyncio
import re
from typing import List, Optional
from ytmusicapi import YTMusic
from app.providers.base import MusicProvider
from app.schemas.music import SearchResult, NormalizedTrack, Thumbnail


def parse_duration_to_seconds(duration_str: Optional[str]) -> int:
    if not duration_str:
        return 0
    try:
        parts = list(map(int, duration_str.split(":")))
        if len(parts) == 2:
            return parts[0] * 60 + parts[1]
        elif len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return 0
    except Exception:
        return 0


class YTMusicProvider(MusicProvider):
    """Unofficial YouTube Music API provider in unauthenticated mode."""

    def __init__(self):
        # Initialize unauthenticated YTMusic instance
        self.yt = YTMusic()

    async def search(self, query: str, filter_type: str = "all") -> List[SearchResult]:
        loop = asyncio.get_event_loop()

        # Map filter_type to ytmusicapi filter parameter
        # ytmusicapi filters: 'songs', 'videos', 'albums', 'artists', 'playlists'
        yt_filter = None
        if filter_type == "songs":
            yt_filter = "songs"
        elif filter_type == "videos":
            yt_filter = "videos"
        elif filter_type == "albums":
            yt_filter = "albums"
        elif filter_type == "artists":
            yt_filter = "artists"

        try:
            raw_results = await loop.run_in_executor(
                None, lambda: self.yt.search(query, filter=yt_filter, limit=20)
            )
        except Exception as e:
            print(f"[YTMusicProvider] Search error for query '{query}': {e}")
            return []

        results: List[SearchResult] = []

        for item in raw_results:
            result_type = item.get("resultType", "song")
            if result_type not in ["song", "video", "album", "artist"]:
                continue

            video_id = item.get("videoId")
            browse_id = item.get("browseId")
            item_id = video_id or browse_id or ""

            # Extract thumbnails
            thumbnails = item.get("thumbnails", [])
            thumb_url = ""
            if thumbnails:
                thumb_url = thumbnails[-1].get("url", "")

            # Extract artist name
            artists_list = item.get("artists", [])
            artist_name = "Unknown Artist"
            if artists_list and isinstance(artists_list, list):
                artist_name = ", ".join(
                    [a.get("name", "") for a in artists_list if isinstance(a, dict)]
                )
            elif item.get("author"):
                artist_name = item.get("author")

            # Extract album
            album_info = item.get("album")
            album_name = None
            if isinstance(album_info, dict):
                album_name = album_info.get("name")
            elif isinstance(album_info, str):
                album_name = album_info

            duration_str = item.get("duration", "")
            duration_sec = item.get(
                "duration_seconds", parse_duration_to_seconds(duration_str)
            )

            results.append(
                SearchResult(
                    id=item_id,
                    type=result_type,
                    title=item.get("title", "Untitled"),
                    artist=artist_name,
                    album=album_name,
                    durationSeconds=duration_sec,
                    durationFormatted=duration_str,
                    thumbnailUrl=thumb_url,
                    videoId=video_id,
                )
            )

        return results

    async def get_track(self, video_id: str) -> Optional[NormalizedTrack]:
        loop = asyncio.get_event_loop()

        try:
            song_data = await loop.run_in_executor(
                None, lambda: self.yt.get_song(video_id)
            )
            video_details = song_data.get("videoDetails", {})
            title = video_details.get("title", "Untitled")
            author = video_details.get("author", "Unknown Artist")
            duration_seconds = int(video_details.get("lengthSeconds", 0))

            thumbnails = video_details.get("thumbnail", {}).get("thumbnails", [])
            thumb_url = thumbnails[-1].get("url", "") if thumbnails else f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

            return NormalizedTrack(
                videoId=video_id,
                title=title,
                artist=author,
                durationSeconds=duration_seconds,
                thumbnailUrl=thumb_url,
                thumbnails=[Thumbnail(url=t.get("url", "")) for t in thumbnails],
                source="ytmusic",
            )
        except Exception as e:
            print(f"[YTMusicProvider] get_track error for '{video_id}': {e}")
            # Fallback metadata from basic youtube structure
            return NormalizedTrack(
                videoId=video_id,
                title="YouTube Track",
                artist="YouTube Music",
                durationSeconds=0,
                thumbnailUrl=f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
                source="ytmusic",
            )
