from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class Thumbnail(BaseModel):
    url: str
    width: Optional[int] = None
    height: Optional[int] = None


class NormalizedTrack(BaseModel):
    videoId: str
    title: str
    artist: str
    artists: Optional[List[str]] = None
    album: Optional[str] = None
    durationSeconds: int = 0
    durationFormatted: Optional[str] = None
    thumbnailUrl: str
    thumbnails: Optional[List[Thumbnail]] = None
    source: Literal["ytmusic"] = "ytmusic"


class SearchResult(BaseModel):
    id: str
    type: Literal["song", "video", "album", "artist"]
    title: str
    artist: str
    album: Optional[str] = None
    durationSeconds: Optional[int] = None
    durationFormatted: Optional[str] = None
    thumbnailUrl: str
    videoId: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    filter: str
    results: List[SearchResult]
    timestamp: int
