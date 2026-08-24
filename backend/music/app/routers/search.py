import time
from typing import Optional
from fastapi import APIRouter, Query, Depends, HTTPException
from app.schemas.music import SearchResponse, NormalizedTrack
from app.providers.ytmusic import YTMusicProvider
from app.middleware.auth import verify_music_service_secret

router = APIRouter(prefix="/api", tags=["search"])
provider = YTMusicProvider()


@router.get("/search", response_model=SearchResponse, dependencies=[Depends(verify_music_service_secret)])
async def search_music(
    q: str = Query(..., min_length=1, max_length=100),
    filter: str = Query("all", regex="^(all|songs|albums|artists|videos)$"),
):
    results = await provider.search(query=q, filter_type=filter)
    return SearchResponse(
        query=q,
        filter=filter,
        results=results,
        timestamp=int(time.time() * 1000),
    )


@router.get("/tracks/{video_id}", response_model=NormalizedTrack, dependencies=[Depends(verify_music_service_secret)])
async def get_track_metadata(video_id: str):
    track = await provider.get_track(video_id=video_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track
