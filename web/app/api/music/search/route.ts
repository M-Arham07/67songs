import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const filter = searchParams.get("filter") || "all";

    if (!q || !q.trim()) {
      return NextResponse.json({ query: "", filter, results: [], timestamp: Date.now() });
    }

    const musicServiceUrl =
      process.env.MUSIC_SERVICE_URL ||
      process.env.SOCKET_SERVER_URL ||
      "http://localhost:8000";
    const sharedSecret =
      process.env.MUSIC_SERVICE_SHARED_SECRET ||
      "local_music_shared_secret_1234567890";

    const url = new URL("/api/search", musicServiceUrl);
    url.searchParams.set("q", q.trim());
    url.searchParams.set("filter", filter);

    const res = await fetch(url.toString(), {
      headers: {
        "X-Music-Secret": sharedSecret,
      },
      next: { revalidate: 300 }, // Cache search queries for 5 minutes
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[Music Proxy] Music service error:", err);
      return NextResponse.json(
        { error: "Music discovery service unavailable", results: [] },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[Music Proxy] Fetch error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to search music", results: [] },
      { status: 500 }
    );
  }
}
