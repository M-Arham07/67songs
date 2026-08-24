import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const musicServiceUrl = process.env.MUSIC_SERVICE_URL || "http://localhost:8000";
    const sharedSecret = process.env.MUSIC_SERVICE_SHARED_SECRET || "";

    const url = `${musicServiceUrl}/api/tracks/${encodeURIComponent(videoId)}`;
    const res = await fetch(url, {
      headers: {
        "X-Music-Secret": sharedSecret,
      },
      next: { revalidate: 86400 }, // Cache track metadata for 24h
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Track metadata lookup failed" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch track metadata" },
      { status: 500 }
    );
  }
}
