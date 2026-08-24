import { z } from "zod";

export const NormalizedTrackSchema = z.object({
  videoId: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  artists: z.array(z.string()).optional(),
  album: z.string().optional().nullable(),
  durationSeconds: z.number().nonnegative(),
  durationFormatted: z.string().optional(),
  thumbnailUrl: z.string().url().or(z.string()),
  thumbnails: z
    .array(
      z.object({
        url: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
      })
    )
    .optional(),
  source: z.literal("ytmusic").default("ytmusic"),
});

export type NormalizedTrack = z.infer<typeof NormalizedTrackSchema>;

export const SearchFilterSchema = z.enum([
  "all",
  "songs",
  "albums",
  "artists",
  "videos",
]);

export type SearchFilter = z.infer<typeof SearchFilterSchema>;

export const SearchResultSchema = z.object({
  id: z.string(),
  type: z.enum(["song", "video", "album", "artist"]),
  title: z.string(),
  artist: z.string(),
  album: z.string().optional().nullable(),
  durationSeconds: z.number().optional(),
  durationFormatted: z.string().optional(),
  thumbnailUrl: z.string(),
  videoId: z.string().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  filter: SearchFilterSchema,
  results: z.array(SearchResultSchema),
  timestamp: z.number(),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
