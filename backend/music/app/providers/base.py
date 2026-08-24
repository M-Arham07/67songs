from abc import ABC, abstractmethod
from typing import List, Optional
from app.schemas.music import SearchResult, NormalizedTrack


class MusicProvider(ABC):
    """Abstract interface isolating music discovery providers."""

    @abstractmethod
    async def search(self, query: str, filter_type: str = "all") -> List[SearchResult]:
        pass

    @abstractmethod
    async def get_track(self, video_id: str) -> Optional[NormalizedTrack]:
        pass
