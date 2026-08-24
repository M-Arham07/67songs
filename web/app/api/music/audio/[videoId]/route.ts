import { NextResponse } from "next/server";

const MUSIC_SERVICE_URL = process.env.MUSIC_SERVICE_URL || "http://localhost:8000";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId" }, { status: 400 });
    }

    const rangeHeader = req.headers.get("range");
    const headers: Record<string, string> = {};
    if (rangeHeader) {
      headers["range"] = rangeHeader;
    }

    const res = await fetch(`${MUSIC_SERVICE_URL}/api/stream/${encodeURIComponent(videoId)}`, {
      method: "GET",
      headers,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Audio stream fallback extraction failed" },
        { status: res.status }
      );
    }

    // Pipe response stream directly
    return new Response(res.body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "audio/mp4",
        "Accept-Ranges": "bytes",
        ...(res.headers.get("content-range")
          ? { "Content-Range": res.headers.get("content-range")! }
          : {}),
        ...(res.headers.get("content-length")
          ? { "Content-Length": res.headers.get("content-length")! }
          : {}),
      },
    });
  } catch (error: any) {
    console.error("[API/AudioFallback] Error piping audio stream:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve audio fallback" },
      { status: 500 }
    );
  }
}
