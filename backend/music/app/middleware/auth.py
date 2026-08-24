import os
from fastapi import Header, HTTPException, status


async def verify_music_service_secret(x_music_secret: str = Header(None)):
    """Verifies that the request comes from an authorized service proxy."""
    expected_secret = os.getenv("MUSIC_SERVICE_SHARED_SECRET")
    
    # If no secret is configured locally, allow requests in dev mode with a warning
    if not expected_secret:
        return True

    if not x_music_secret or x_music_secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Music-Secret header",
        )
    return True
