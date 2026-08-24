import { NextResponse } from "next/server";

const MUSIC_SERVICE_URL = process.env.MUSIC_SERVICE_URL || "http://localhost:8000";
const MUSIC_SERVICE_SECRET = process.env.MUSIC_SERVICE_SHARED_SECRET || "default_music_service_internal_secret_key_32_chars";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const res = await fetch(`${MUSIC_SERVICE_URL}/api/audio/${encodeURIComponent(videoId)}`, {
      method: "GET",
      headers: {
        "x-music-secret": MUSIC_SERVICE_SECRET,
      },
      next: { revalidate: 3600 }, // Cache audio stream URL for 1 hour
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.detail || "Audio stream fallback extraction failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[API/AudioFallback] Error fetching audio stream:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve audio fallback" },
      { status: 500 }
    );
  }
}
