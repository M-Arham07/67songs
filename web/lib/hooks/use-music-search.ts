"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { SearchResponse, SearchFilter } from "@/lib/types/music";

export function useMusicSearch(query: string, filter: SearchFilter = "all", debounceMs: number = 300) {
  const [debouncedQuery, setDebouncedQuery] = React.useState(query);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  return useQuery<SearchResponse>({
    queryKey: ["music-search", debouncedQuery, filter],
    queryFn: async ({ signal }) => {
      if (!debouncedQuery || !debouncedQuery.trim()) {
        return { query: "", filter, results: [], timestamp: Date.now() };
      }

      const url = new URL("/api/music/search", window.location.origin);
      url.searchParams.set("q", debouncedQuery.trim());
      url.searchParams.set("filter", filter);

      const res = await fetch(url.toString(), { signal });
      if (!res.ok) {
        throw new Error("Music search failed");
      }
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
