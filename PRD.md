# 67Songs — Product Requirements Document

**Status:** Final implementation specification

**Version:** 1.0

**Date:** 2026-08-24

**Product name:** 67Songs (working name; all product copy must be configurable)
**Platforms:** Responsive web application, desktop-first and fully usable on mobile browsers

---

## 1. Product Summary

67Songs is a social, synchronized listening application. A host starts a room, finds a track using `ytmusicapi`, and invites people through a QR code, a share link, or a four-character alphanumeric room code. Every participant has a visible embedded YouTube player in their own browser. The application synchronizes commands and time; it never receives, relays, extracts, downloads, modifies, or stores music audio.

The product should feel like a focused music product: fast search, a familiar music-library hierarchy, a persistent now-playing bar, a queue, presence, and reactions. It must **not** look like a generic AI dashboard: no oversized hero gradients, no rows of fake metric cards, no rounded containers around every element, no excessive whitespace, and no ornamental animation.

The central promise is simple:

> Start one song in one room. Everyone hears the same moment as closely as browsers and networks allow.

This is synchronized listening, not live remote instrumental jamming. Live microphones, multi-track mixing, and WebRTC musician collaboration are explicitly outside the first product.

---

## 2. Goals, Non-Goals, and Success Criteria

### 2.1 Product Goals

1. Let a host create and share a listening room in under 20 seconds.
2. Let a guest join a room from a QR code, direct link, or four-character code in under 15 seconds.
3. Make host playback actions appear immediate and keep active members perceptually synchronized.
4. Make music search and queue management feel fast, deliberate, and native.
5. Make anonymous guest participation frictionless while protecting rooms from brute-force joins and abuse.
6. Deliver a refined, Vercel-inspired visual system using shadcn/ui primitives without default shadcn-dashboard styling.
7. Operate the initial release without Redis by deliberately running exactly one Socket.IO realtime instance.

### 2.2 Non-Goals for v1

1. Streaming, downloading, recording, extracting, or mixing YouTube Music audio.
2. Perfect sample-level sync across arbitrary devices and networks.
3. Native iOS, Android, desktop, television, or browser-extension apps.
4. Live voice/video or instrument jamming over WebRTC.
5. Offline playback, background playback, karaoke lyric timing, DJ beat matching, crossfades, or audio effects.
6. User-created music uploads, copyright claims handling, artist payouts, subscriptions, or payment processing.
7. Horizontal scaling of the Socket.IO service before a shared pub/sub broker is introduced.

### 2.3 Product Success Metrics

| Metric | v1 target | Measurement |
| --- | --- | --- |
| Room creation completion | >= 90% | `room_create_started` → `room_created` |
| Invite join completion | >= 85% | `join_started` → `room_joined` |
| Search-to-queue completion | >= 60% | Search result selected within a room |
| First playback readiness | >= 90% within 5 seconds | Player reports cued/ready |
| Perceived sync | >= 90% of healthy clients within 300 ms after correction | Client drift telemetry |
| Realtime action latency | p95 < 250 ms from Socket.IO server to connected client | Server/client event timestamps |
| Room stability | >= 99% no unexpected state loss during a normal room | Room lifecycle events |
| Accessibility | Keyboard-complete critical flows; no critical automated a11y issues | CI and manual audit |

### 2.4 Honest Synchronization Target

The application must target **perceptual synchronization**, not false precision. Under healthy networks and wired/phone speakers, the target is generally within 100–300 ms after correction. Bluetooth output, browser scheduling, buffering, network jitter, and YouTube player behavior can make a device sound later even if player timestamps agree. The UI must never promise “perfect” or “zero-latency” synchronization.

---

## 3. Locked Technical Decisions

| Area | Locked choice | Rationale |
| --- | --- | --- |
| Web application | Next.js + TypeScript on Vercel | Fast delivery, server rendering, reliable preview deployments |
| UI system | Tailwind CSS + shadcn/ui + Radix primitives + Lucide icons | Accessible primitives with a fully custom visual language |
| Client data | TanStack Query for server data; small Zustand stores for ephemeral UI/player state | Avoids a global, unstructured state object |
| Forms and validation | React Hook Form + Zod | Typed, accessible forms and shared payload schemas |
| Persistent database | MongoDB Atlas + Mongoose | Durable user, room, queue, discovery, and history data; geospatial support |
| Realtime transport | Socket.IO | Rooms, acknowledgements, reconnects, ordered event protocol, full synchronization control |
| Realtime deployment | One long-lived Node.js Socket.IO service on Railway | Vercel remains the web/API host; Railway holds persistent sockets |
| Live-state cache/broker | **None in v1** | Active room state lives in the single Socket.IO process; no Redis or Upstash |
| Music discovery | Python FastAPI service using **`ytmusicapi`** | Required music catalog/search integration |
| Music playback | Visible YouTube IFrame Player in every participant browser | Clients play locally; server transmits state only |
| QR generation | `qrcode` package | Generates room invite QR codes on the server or client |
| Authentication | Auth.js backed by MongoDB, Google sign-in plus anonymous guest sessions | Hosts can own rooms; guests can join quickly |
| Monitoring | Sentry for web, Socket.IO, and FastAPI errors; structured Railway logs | Diagnose player, sync, and provider failures |
| Product analytics | Privacy-conscious event tracking with no music-audio collection | Measures funnel and sync health |

### 3.1 Explicit No-Redis Constraint

The v1 architecture intentionally has one Socket.IO server replica. The service owns an in-memory `Map<roomId, ActiveRoomState>` and is the authoritative source for currently active rooms. **Do not configure Railway to run multiple Socket.IO replicas.** Multiple replicas without a shared broker would split rooms and break synchronization.

MongoDB is not used as a realtime bus and clients never poll MongoDB to synchronize playback. MongoDB receives durable room snapshots asynchronously at lifecycle transitions and at a bounded interval. A Socket.IO service restart can therefore recover a room snapshot, but all participants must reconnect and resynchronize; an uninterrupted room through a process restart is not guaranteed in v1.

When the product needs multiple Socket.IO replicas, add a shared broker (Redis, NATS, or equivalent) as a separately approved architecture change. Do not silently add it to v1.

### 3.2 External Music Constraint

`ytmusicapi` is the required discovery provider. It is an unofficial integration that emulates YouTube Music web-client requests. The codebase must isolate it behind a provider interface so it can be replaced if it breaks or becomes unsuitable.

The application must use a visible YouTube player for playback and comply with applicable YouTube embedded-player and API policies. The product must not extract audio, hide/obscure the player, bypass ads or restrictions, or enable background/offline playback. See the current [YouTube Developer Policies](https://developers.google.com/youtube/terms/developer-policies) and [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference) during implementation and release review.

---

## 4. Users and Roles

### 4.1 Visitor

A person who has not signed in and is browsing public marketing pages or discovery. A visitor can search public preview content only if enabled; they cannot create a room or enter a protected room without a guest identity.

### 4.2 Guest

A temporary, anonymous room member. A guest chooses a display name and receives a signed, short-lived guest session. Guests can listen, react, chat, and propose tracks according to room settings. They cannot administer a room.

### 4.3 Member

A signed-in user. Members can create rooms, save preferences, view their room history, block users, and manage their profile.

### 4.4 Host

The member who created the room or was explicitly transferred ownership. The host controls playback by default, controls room settings, and can remove members.

### 4.5 Co-host

A member promoted by the host. Co-hosts can moderate and control playback if the host enables those permissions. A room supports multiple co-hosts.

### 4.6 Moderator / Administrator

Internal role for abuse review and operations. Not exposed in normal room UI.

---

## 5. Feature Inventory and Release Priority

The following is the complete feature inventory. “P0” must ship for the first usable release; “P1” ships immediately after the core is stable; “P2” is explicitly deferred.

| Area | Feature | Priority |
| --- | --- | --- |
| Identity | Google sign-in, sign-out, anonymous guest sessions, display names | P0 |
| Rooms | Create, end, join, leave, host transfer, room settings | P0 |
| Invites | Direct link, QR code, four-character alphanumeric code | P0 |
| Playback | Host controls, scheduled start, seek, pause, change track, drift correction | P0 |
| Queue | Search, add, reorder, remove, clear, next-track behavior | P0 |
| Music | `ytmusicapi` search, song/album/artist metadata, track selection | P0 |
| Presence | Member list, host/co-host labels, connection/reconnect status | P0 |
| Social | Reactions and text chat | P0 |
| UI | Responsive Spotify-like music shell, Vercel-themed shadcn implementation | P0 |
| Safety | Permission checks, rate limits, report, block, code-join protections | P0 |
| Reliability | Error states, reconnect, player unavailable handling, room snapshot recovery | P0 |
| History | Signed-in user room history and saved queues | P1 |
| Discovery | Public room directory, filters, occupancy and live state | P1 |
| Nearby | Optional browser geolocation, configurable radius, coarse privacy-preserving display | P1 |
| Collaboration | Track proposals, votes, host approval mode | P1 |
| Personalization | Favorites, recently played, profile preferences | P1 |
| Notifications | Browser/in-app invites and room-start reminders | P1 |
| Moderation | Admin review queue, room/user reports, ban controls | P1 |
| Growth | Share preview cards, referral/invite attribution, analytics dashboard | P1 |
| Mobile polish | Installable PWA, mobile queue sheet, mobile room controls | P1 |
| Payments | Premium plans or creator monetization | P2 |
| Live jam | WebRTC voice/instrument audio | P2 |
| Multi-server realtime | Redis/NATS-backed Socket.IO scaling | P2 |
| Native applications | iOS/Android/Desktop clients | P2 |

---

## 6. Core User Journeys

### 6.1 Create a Room

1. A signed-in member clicks **Start a jam**.
2. They choose a room name, visibility, join policy, queue policy, and optional max participants.
3. The web app creates a durable room record through the Next.js API.
4. The Socket.IO service creates the active room state in memory and makes the creator host.
5. The app opens the room lobby with a QR code, direct link, and four-character code.
6. The host searches for a song through the `ytmusicapi` service and selects one.
7. The selected track is cued in the visible player; the host can begin playback once ready.

### 6.2 Join by QR or Link

1. A guest scans a QR code or opens the share URL.
2. The URL contains a room locator and a high-entropy invite token for private/unlisted rooms.
3. The app asks for sign-in only if required by the room; otherwise it asks for a display name.
4. The guest joins the Socket.IO room and receives current room state.
5. The app cues the active track, measures server-clock offset, and displays **Syncing**.
6. After player readiness and a user gesture if browser policy requires it, the guest starts at the current canonical position.

### 6.3 Join by Four-Character Code

1. A visitor opens **Join a jam** and enters an uppercase four-character code.
2. The application normalizes ambiguous characters according to the displayed alphabet.
3. The app resolves the code to an active, joinable room.
4. The guest completes any required password, host approval, or sign-in step.
5. The standard sync flow begins.

**Security rule:** the four-character code is a convenient locator, not a secret. Private rooms require an invite token, password, or host approval. The join endpoint is rate-limited and enumeration-resistant.

### 6.4 Host Starts Synchronized Playback

1. The host selects **Play**.
2. The host client emits a `play_request` with the current state version.
3. The Socket.IO service validates host permission and state version.
4. The service writes a new canonical state in memory with a future `startAtServerMs` timestamp, normally 2–3 seconds ahead.
5. The service persists the state asynchronously to MongoDB and broadcasts `play_at` to every connected room member.
6. Each client converts server time to local time, cues/seeks the player, and starts at the same scheduled instant.
7. Clients report readiness and drift telemetry. A late or buffering participant catches up to canonical time without delaying the room.

### 6.5 Guest Reconnects

1. Socket.IO reconnects using the authenticated member/guest token.
2. The service restores role, verifies room membership, and sends current room state and version.
3. The client recalculates expected position from `positionSeconds`, `playing`, and `changedAtServerMs`.
4. The player seeks to the expected position and resumes only after a permitted user interaction where required.
5. The UI announces the result: **Back in sync**, **Tap to resume**, or a specific failure state.

### 6.6 Host Leaves

1. If the host intentionally ends the room, all members receive `room_ended`, playback stops, and the app returns to the home screen.
2. If the host disconnects unexpectedly, the room enters a 60-second host-grace period. Playback remains as-is but new host actions are disabled.
3. The host can reconnect during the grace period.
4. If the host does not return, the longest-present eligible member is offered host transfer; if none accepts, the room ends after a short countdown.
5. The host can manually transfer ownership to a member or co-host at any time.

---

## 7. Functional Requirements

### 7.1 Authentication and Identity

| ID | Requirement |
| --- | --- |
| AUTH-01 | A signed-in member can create a room, host it, and access their profile/history. |
| AUTH-02 | Google OAuth is the initial sign-in method. The system must be designed to add email or other providers later. |
| AUTH-03 | A guest can join a room without creating an account when room policy permits it. |
| AUTH-04 | A guest must supply a display name of 2–24 visible characters; the host can edit/remove abusive names. |
| AUTH-05 | Guest sessions are signed, scoped to a room, and expire after the room ends or a maximum lifetime. |
| AUTH-06 | Each account has a stable user ID; display name and avatar are profile fields, never authorization fields. |
| AUTH-07 | The UI provides sign-out and account deletion/request controls. |

### 7.2 Rooms and Permissions

| ID | Requirement |
| --- | --- |
| ROOM-01 | A host can create a room with title, visibility, join policy, queue policy, and maximum member count. |
| ROOM-02 | Default room visibility is **Unlisted**: joinable by link/QR/code but absent from public discovery. |
| ROOM-03 | Visibility options are Private, Unlisted, Public, and Nearby. Public/Nearby are P1 features but their schema ships in P0. |
| ROOM-04 | The service generates a unique uppercase four-character code using a non-ambiguous alphabet such as `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. |
| ROOM-05 | The service generates a high-entropy invite token for all link/QR invites. A QR code encodes the full invite URL, never just the four-character code. |
| ROOM-06 | Host controls must include: allow guests, require approval, require password, and sign-in required. |
| ROOM-07 | Host controls must include: allow guest queue additions, allow guest reordering, allow voting, allow chat, allow reactions, and allow co-host controls. |
| ROOM-08 | A host or co-host can remove a member, mute their chat, revoke their invite token, or lock the room. |
| ROOM-09 | A host can end the room. Ending a room immediately makes its code and tokens invalid. |
| ROOM-10 | The room page displays title, host, participant count, visibility, code, invite actions, and current state. |
| ROOM-11 | Initial active-room capacity defaults to 25 participants and is configurable from 2–25 by the host. |
| ROOM-12 | A user may not be an active participant in more than one room in the same browser identity at a time without an explicit leave confirmation. |

### 7.3 Invites and Joining

| ID | Requirement |
| --- | --- |
| JOIN-01 | The room lobby displays a copyable invite URL, QR code, and four-character code. |
| JOIN-02 | The copy action provides immediate visual confirmation and an accessible live announcement. |
| JOIN-03 | Camera scanning is optional; the app must work when the OS/browser opens the QR link directly. |
| JOIN-04 | A manual join page supports code entry, paste, automatic uppercase conversion, and grouped visual input. |
| JOIN-05 | Invalid, expired, ended, full, locked, or unauthorized rooms return clear recovery actions instead of generic errors. |
| JOIN-06 | Code lookup and join attempts are rate-limited by IP/session and log suspicious bursts. |
| JOIN-07 | A host approval request shows the guest’s display name and allows approve/deny. The request expires automatically. |
| JOIN-08 | QR and direct invite links can be regenerated to invalidate previously shared links. |

### 7.4 Music Search and Discovery (`ytmusicapi`)

| ID | Requirement |
| --- | --- |
| MUSIC-01 | Every music search request passes through the FastAPI `ytmusicapi` service; browser clients never call `ytmusicapi` directly. |
| MUSIC-02 | Search supports tracks, artists, albums, playlists, videos, and optional filter tabs when provider data permits. |
| MUSIC-03 | Search results show title, primary artist, album when available, duration, artwork, content type, and a stable `videoId`. |
| MUSIC-04 | Search has debouncing, cancellation of stale requests, a keyboard shortcut, loading rows, empty states, and retry states. |
| MUSIC-05 | Result selection opens an action menu: Play now, Add next, Add to queue, View artist, View album, and Propose (when permitted). |
| MUSIC-06 | The server normalizes provider responses into product-owned schemas so client UI never depends on raw `ytmusicapi` payloads. |
| MUSIC-07 | The service caches lightweight, non-audiovisual metadata only according to the project’s policy review; it must never cache or proxy media streams. |
| MUSIC-08 | Missing, restricted, region-unavailable, deleted, or unembeddable tracks produce a clear error and leave the queue usable. |
| MUSIC-09 | The provider integration records health metrics, timeout rate, provider error category, and normalized request latency. |
| MUSIC-10 | A provider interface named `MusicProvider` isolates `ytmusicapi` calls from the rest of the product. |

### 7.5 Queue and Track Selection

| ID | Requirement |
| --- | --- |
| QUEUE-01 | A room has one ordered queue and one current track. |
| QUEUE-02 | The host can add a track, add next, move, remove, clear upcoming tracks, or play any queue item immediately. |
| QUEUE-03 | Guests can add/propose tracks only when host policy allows it. |
| QUEUE-04 | Every queue modification is validated server-side and emitted as an ordered realtime event with a monotonically increasing room version. |
| QUEUE-05 | Queue UI shows artwork, title, artist, duration, added by, position, and proposal/vote status when applicable. |
| QUEUE-06 | The current track is visually distinct but not presented as a giant decorative card. |
| QUEUE-07 | When a track ends, the server promotes the next valid queue item or transitions the room to an idle state. |
| QUEUE-08 | If the next item cannot be cued, the server skips it, records a reason, informs members, and tries the following item. |
| QUEUE-09 | Queue reordering uses optimistic UI only after a server acknowledgement; on conflict it reconciles to canonical ordering. |
| QUEUE-10 | P1 voting supports one vote per room member per proposed track, host approval mode, and clear ordering rules. |

### 7.6 Playback and Synchronization

| ID | Requirement |
| --- | --- |
| SYNC-01 | The Socket.IO service is authoritative for active-room playback state. The host requests actions; it does not directly command other clients. |
| SYNC-02 | Canonical state includes `track`, `status`, `positionSeconds`, `changedAtServerMs`, `startAtServerMs`, `version`, and `commandId`. |
| SYNC-03 | All state-changing events carry a unique `commandId`, room `version`, actor ID, and server timestamp. |
| SYNC-04 | Clients ignore stale versions, deduplicate command IDs, and request a full state refresh when a version gap occurs. |
| SYNC-05 | Play and track-change events schedule playback 2–3 seconds in the future by default to permit cueing and buffering. |
| SYNC-06 | Every client estimates its server clock offset using several Socket.IO ping/pong samples and uses the median low-latency sample. |
| SYNC-07 | While playing, expected position is `positionSeconds + (estimatedServerNow - changedAtServerMs) / 1000`. |
| SYNC-08 | Clients check player position every 3–5 seconds and after reconnect, visibility return, buffering, or playback-state changes. |
| SYNC-09 | Drift below 0.5 seconds is ignored. Drift from 0.5–1.5 seconds is corrected conservatively when the player permits. Drift above 1.5 seconds triggers a seek to canonical time. Exact thresholds are feature flags for tuning. |
| SYNC-10 | A seek applies a future server timestamp and is scheduled like a play event, preventing members from applying it in arrival order. |
| SYNC-11 | Pause freezes canonical `positionSeconds` at the server-measured action time. Resume schedules a future start from that frozen position. |
| SYNC-12 | The app surfaces player readiness: Loading, Ready, Syncing, In sync, Buffering, Tap to resume, and Unavailable. |
| SYNC-13 | Browser autoplay restrictions are respected. If a user gesture is required, the UI must provide one clear **Start synced playback** action. |
| SYNC-14 | The YouTube player remains visible, usable, and unblocked by overlays. |
| SYNC-15 | Host action acknowledgement must return success, rejection reason, and canonical state/version. |
| SYNC-16 | A room must never fork playback state. If state becomes uncertain, clients pause local control, request canonical state, and resynchronize. |
| SYNC-17 | Sync telemetry records absolute drift buckets, player buffering state, round-trip estimate, and client platform—never audio data or precise location. |

### 7.7 Presence, Chat, and Reactions

| ID | Requirement |
| --- | --- |
| SOCIAL-01 | The room displays connected members, display names, avatar/initial, host/co-host labels, and connection status. |
| SOCIAL-02 | Presence updates are emitted only for joins, leaves, reconnects, role changes, and explicit status changes; there is no high-frequency presence polling. |
| SOCIAL-03 | Text chat supports short messages, timestamps, sender identity, system messages, rate limits, and delete/moderation actions. |
| SOCIAL-04 | Chat is disabled in private/quiet rooms when host policy disallows it. |
| SOCIAL-05 | Reactions are a small, curated emoji set with lightweight burst animation and server-side rate limits. |
| SOCIAL-06 | Reactions do not permanently obstruct player controls, queue controls, or room navigation. |
| SOCIAL-07 | P1 supports track proposals and votes; a proposal is not added to the final queue until host policy permits it. |
| SOCIAL-08 | Users can block another signed-in user. Blocking suppresses their chat/reactions and prevents future direct invitations where applicable. |

### 7.8 Public and Nearby Discovery (P1)

| ID | Requirement |
| --- | --- |
| DISC-01 | Public rooms can appear in a discovery view with title, current track, host, occupancy, language/genre tags, and join status. |
| DISC-02 | Discovery supports search, occupancy, language, and tag filters. |
| DISC-03 | Nearby discovery is opt-in and never requested before the user explicitly chooses Nearby. |
| DISC-04 | The browser Geolocation API is used only after a clear explanation and permission action. “GPRS” is not an app API; supported devices provide browser location through their platform location services. |
| DISC-05 | Users choose a radius (for example 1 km, 5 km, 10 km, or 25 km). The default is 5 km. |
| DISC-06 | MongoDB uses a `2dsphere` index for radius matching. Precise coordinates are never shown to other users. |
| DISC-07 | Persist only a coarse location representation or a temporary query coordinate with a strict TTL; do not retain raw location history by default. |
| DISC-08 | Nearby results show approximate distance bands, not a pin, map location, or another user’s precise coordinates. |
| DISC-09 | Nearby rooms require Public/Nearby visibility and explicit host consent. Private and Unlisted rooms never appear. |
| DISC-10 | Location permission denial has a complete fallback: enter a code, scan QR, search public rooms, or share a link. |

### 7.9 Profile, History, and Preferences (P1)

| ID | Requirement |
| --- | --- |
| PROF-01 | A member can edit display name, avatar, and default room preferences. |
| PROF-02 | A member can view rooms they hosted or joined, subject to privacy rules. |
| PROF-03 | A member can save a queue template and reuse it in a new room. |
| PROF-04 | A member can maintain favorite tracks/artists only where provider/data policy permits. |
| PROF-05 | A member can manage blocked users, location preference, notification preference, and data/export/deletion requests. |

### 7.10 Safety, Moderation, and Abuse Prevention

| ID | Requirement |
| --- | --- |
| SAFE-01 | Every HTTP route and Socket.IO event verifies authentication, room membership, role, and payload schema. |
| SAFE-02 | Host-only actions cannot be performed by replaying a client event from a guest. |
| SAFE-03 | The app rate-limits code lookups, join attempts, messages, reactions, search requests, queue actions, and playback actions. |
| SAFE-04 | The host can remove, mute, or block a room member. Removed guests cannot rejoin with the same session. |
| SAFE-05 | Any participant can report a user, room, chat message, or abusive room title. |
| SAFE-06 | Reports store sufficient audit context without storing music audio, exact location, or unnecessary personal data. |
| SAFE-07 | Public room titles, display names, and chat content are validated, length-limited, and escape all user-generated content. |
| SAFE-08 | Service credentials, `ytmusicapi` credentials/configuration, MongoDB URI, and auth secrets never reach browser bundles. |
| SAFE-09 | Browser clients receive short-lived signed tokens scoped to their permitted Socket.IO room actions. |
| SAFE-10 | Audit logs capture sensitive moderation and ownership-transfer actions. |

---

## 8. UX and Visual Design Requirements

### 8.1 Design Direction

The visual language is **Vercel-inspired, music-first, and restrained**:

- Default to near-black, white, and neutral grays; use one intentional accent color only for active/player states.
- Use crisp one-pixel borders, clear type hierarchy, disciplined spacing, and high contrast.
- Prefer content density and hierarchy over decorative surfaces.
- Use album art as music content, not as generic background decoration.
- Use cards only when an item needs a visual container, such as a room result or media tile. Lists, rows, dividers, and panes should carry most information architecture.
- Do not copy Vercel’s logo, trademark, or product identity. “Vercel-themed” means the visual discipline, not impersonation.

### 8.2 Component Foundation

Use shadcn/ui components as accessible primitives only. Customize them through semantic design tokens and purpose-built compositions.

| Primitive | Product use |
| --- | --- |
| Button | Playback, join, primary host actions; clear priority hierarchy |
| Dialog / Sheet | Join, create room, share, settings, mobile queue/chat |
| Dropdown menu | Track actions, room/member actions, overflow controls |
| Command | Global search and keyboard-first music search |
| Tooltip | Icon-only controls and keyboard hints |
| Avatar | Participant identity; initials fallback |
| Scroll area | Queue, member list, chat, library lists |
| Sonner/Toast | Non-blocking confirmations and recoverable errors |
| Tabs | Search filters, room side-panel sections, profile pages |
| Input / Form | Code entry, search, room creation, settings |
| Separator | Dense list structure and pane boundaries |

### 8.3 Layout

#### Desktop Shell

```text
┌──────────────┬─────────────────────────────────────────────┬───────────────┐
│ Sidebar      │ Main content                                │ Room panel    │
│ Home         │ Search / library / current room             │ Queue         │
│ Search       │                                             │ Members       │
│ Your rooms   │                                             │ Chat          │
├──────────────┴─────────────────────────────────────────────┴───────────────┤
│ Persistent now-playing bar: artwork · track · controls · sync state         │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Sidebar is fixed on desktop, collapsible to icons, and never consumes excessive width.
- Main content is a flexible pane with a dense, readable maximum width.
- The room panel is contextual, not a permanent generic dashboard rail.
- The now-playing bar is persistent, compact, and keyboard accessible.

#### Mobile Shell

- Top app bar: back/menu, current page title, room indicator.
- Bottom navigation: Home, Search, Rooms, Profile.
- Now-playing bar sits above navigation; tapping opens a full-screen player sheet.
- Queue, members, chat, and room settings use sheets or full-screen routes.
- Playback controls remain thumb-reachable.

### 8.4 Required Screens

| Screen | Required content and actions |
| --- | --- |
| Landing / Home | Start a jam, Join a jam, recent rooms, public discovery preview when enabled |
| Join | Four-character code input, QR/link handling, join errors, guest-name step |
| Create room | Name, visibility, invite policy, guest controls, capacity, create action |
| Room lobby | QR, code, link, member presence, selected track/queue, ready state, start action |
| Active room | Visible player, current track, playback controls by role, queue, members, chat/reactions, sync status |
| Search | Command-like input, filters, result rows, media details, quick actions |
| Queue | Ordered items, drag/reorder for permitted roles, add/remove/action menu, proposal/vote state |
| Discovery | Public and nearby rooms, filters, occupancy, now-playing metadata, safe join flow |
| Profile | Identity, history, saved queues, preferences, blocked users, privacy controls |
| Settings | Account, appearance, reduced motion, location, notifications, data controls |
| Error / Empty | Offline, player unavailable, no results, ended room, expired invite, full room, denied access |
| Admin (P1) | Reports, user/room action log, moderation controls |

### 8.5 Typography and Tokens

- Font: Geist or an equally clean system-focused sans serif; use tabular numerals for playback timestamps.
- Base body: 14–15 px on desktop, 15–16 px on mobile.
- Track title: prominent but not oversized; artist and metadata remain readable.
- Use semantic tokens: `background`, `foreground`, `muted`, `border`, `surface`, `accent`, `danger`, `success`, and `focus`.
- Border radius: modest and intentional (for example 6–10 px); avoid large pill-heavy UI except status chips and compact controls.
- Focus styles must be visible on every interactive element.

### 8.6 Motion Requirements

The interface should feel fast like a native app.

| Interaction | Duration | Motion |
| --- | --- | --- |
| Button/row hover and pressed state | 80–120 ms | Color/opacity/transform only |
| Menus, tooltips, small popovers | 120–160 ms | Opacity + 2–4 px translate |
| Sheets/dialogs | 160–220 ms | Opacity + short transform |
| Queue reorder acknowledgement | <= 180 ms | Direct position transition only |
| Reaction burst | <= 300 ms | Small scale/fade; no layout shift |
| Page transition | <= 180 ms | Optional fade/translate, never blocks input |

Rules:

1. Use CSS transitions first; do not add a heavy animation library for basic UI.
2. Animate only `opacity` and `transform` wherever possible.
3. Never animate continuous gradients, large shadows, layout dimensions, or huge spring effects.
4. Controls must respond immediately; network confirmation never delays pressed state.
5. Respect `prefers-reduced-motion`; reduce nonessential movement to instant state changes.

### 8.7 Accessibility Requirements

- Meet WCAG 2.2 AA for contrast, focus, labels, and interaction targets.
- Support keyboard navigation for search, queue actions, player controls, room creation, joining, and chat.
- Provide visible focus rings; never remove outline without replacement.
- Announce state changes such as successful join, sync status, new track, playback paused, and error recovery through appropriate live regions.
- Do not make color the sole indicator of role, sync state, queue state, or errors.
- Provide text alternatives for QR code and icons.
- Ensure the visible embedded player retains its usable controls and accessible context.

---

## 9. System Architecture

### 9.1 Deployment Topology

```text
Browser
  │
  ├── HTTPS ───────────────► Next.js web app + API routes (Vercel)
  │                              │
  │                              ├── MongoDB Atlas
  │                              └── signed HTTP ─► FastAPI music service (Railway)
  │                                                     └── ytmusicapi
  │
  ├── Socket.IO WebSocket ─► Realtime Node service (Railway, exactly 1 replica)
  │                              │
  │                              └── MongoDB Atlas snapshots / membership verification
  │
  └── visible iframe ──────► YouTube embedded player (one per participant)
```

### 9.2 Service Responsibilities

#### Next.js Web Application — Vercel

- Renders all public and authenticated pages.
- Hosts REST/route-handler APIs for durable entities, auth, room creation, profile, discovery, and signed music-service proxy calls.
- Mints short-lived Socket.IO authorization tokens after verifying the member/guest session.
- Owns shadcn UI, player wrapper, local sync client, and browser state.
- Never owns a long-lived Socket.IO connection server.

#### Realtime Service — Railway

- Node.js + TypeScript + Socket.IO server, one replica only.
- Validates Socket.IO handshake tokens and room permissions.
- Maintains `activeRooms: Map<string, ActiveRoomState>` in process memory.
- Owns authoritative active playback state, ordering, command deduplication, presence, chat fan-out, and drift coordination.
- Persists room lifecycle and bounded snapshots to MongoDB asynchronously.
- Exposes a health endpoint and structured operational metrics.
- Must reject startup with a configuration that enables more than one replica unless a broker architecture has been added.

#### Music Service — Railway

- Python + FastAPI + **`ytmusicapi`**.
- Exposes normalized, authenticated endpoints for search and metadata lookup.
- Enforces request schema, timeout, provider error normalization, and service-level rate limits.
- Is not a playback proxy and does not return audio bytes or media stream URLs.
- Is called through a server-side Next.js proxy or other signed service-to-service request; browser clients do not receive service credentials.

#### MongoDB Atlas

- Stores durable product data and periodic room snapshots.
- Uses indexes for user lookups, codes/tokens, room history, discovery filters, TTL cleanup, and geospatial queries.
- Is never polled by clients for active playback state.

### 9.3 Active Room State

```ts
type ActiveRoomState = {
  roomId: string;
  roomCode: string;
  hostId: string;
  coHostIds: string[];
  members: Map<string, ActiveMember>;
  currentTrack: NormalizedTrack | null;
  queue: QueueItem[];
  playback: {
    status: "idle" | "cued" | "playing" | "paused" | "ended" | "error";
    positionSeconds: number;
    changedAtServerMs: number;
    startAtServerMs: number | null;
    version: number;
    lastCommandId: string | null;
  };
  settings: ActiveRoomSettings;
  chatBuffer: ChatMessage[];
  createdAtServerMs: number;
  lastSnapshotAtServerMs: number;
};
```

Rules:

1. This object exists only in the single Socket.IO process during an active room.
2. All writes flow through one serialized room command handler to preserve ordering.
3. Every mutation increments `playback.version` or `queue.version` as relevant.
4. Room snapshots are saved after state transitions and no more often than every 15 seconds during active playback.
5. The service uses a bounded chat/reaction buffer; durable chat retention is a P1 policy decision.
6. If the process loses state, it may reconstruct the most recent snapshot from MongoDB, but must notify all clients to resync.

### 9.4 Synchronization Protocol

#### Time Synchronization

1. On socket connection and every 60 seconds, client sends `clock_ping` with its local timestamp.
2. Server replies `clock_pong` with receive/send server timestamps.
3. Client computes round-trip time and clock offset.
4. Client keeps the median offset from the best recent samples, discarding high-latency outliers.
5. All scheduled player actions use estimated server time rather than event arrival time.

#### Playback Event Example

```json
{
  "type": "play_at",
  "roomId": "room_01",
  "commandId": "cmd_01J...",
  "version": 42,
  "track": { "videoId": "abc123", "title": "Example" },
  "positionSeconds": 12.4,
  "startAtServerMs": 1760000002500,
  "changedAtServerMs": 1760000000000
}
```

#### Client Application Algorithm

1. Verify `roomId`, ignore duplicate `commandId`, and reject a stale `version`.
2. Ensure the announced `videoId` is cued in the local visible player.
3. Compute `millisecondsUntilStart = startAtServerMs - estimatedServerNow()`.
4. Seek to `positionSeconds` before the scheduled time.
5. Schedule local playback at `millisecondsUntilStart`.
6. If late, compute expected position from canonical timestamp and seek forward rather than replaying old audio.
7. On every reconciliation interval, compare `player.getCurrentTime()` with expected position and apply the drift policy.
8. Send lightweight readiness/drift telemetry; never send audio data.

#### Event Ordering Guarantees

- Socket.IO delivery order is not sufficient by itself for a full reconnect/retry model; application-level `version` and `commandId` are mandatory.
- The server accepts a host command only when its base version matches current state, otherwise returns canonical state and a conflict response.
- Clients apply only contiguous versions. A gap triggers `state_request`.
- All host actions use acknowledgements. The UI may optimistically show press feedback, but authoritative state comes from server acknowledgement/broadcast.

### 9.5 Socket.IO Event Contract

#### Client → Server

| Event | Allowed roles | Payload / result |
| --- | --- | --- |
| `room_join` | Guest, Member | Invite/code credentials; returns room state, role, token refresh status |
| `room_leave` | Any member | Leaves presence and returns confirmation |
| `clock_ping` | Any member | Client timestamp; returns server time fields |
| `state_request` | Any member | Returns complete canonical state |
| `play_request` | Host/allowed co-host | Base version; returns acceptance/rejection + canonical state |
| `pause_request` | Host/allowed co-host | Base version and client intent |
| `seek_request` | Host/allowed co-host | Target seconds and base version |
| `track_select_request` | Host/allowed co-host | Normalized track reference |
| `queue_mutation_request` | Permission-dependent | Add, add-next, move, remove, clear action |
| `chat_send` | Permission-dependent | Plain text message |
| `reaction_send` | Permission-dependent | Curated reaction identifier |
| `proposal_vote` | Permission-dependent | Queue item ID and vote action |
| `member_action_request` | Host/co-host | Remove, mute, promote, transfer-host action |
| `player_status` | Any member | Ready, buffering, autoplay-blocked, unavailable state |
| `sync_telemetry` | Any member | Drift bucket and connection/player state |

#### Server → Client

| Event | Meaning |
| --- | --- |
| `room_state` | Full canonical state for join/recovery |
| `member_joined` / `member_left` | Presence update |
| `play_at` / `pause_at` / `seek_at` | Timestamped canonical playback command |
| `track_changed` | New current track and scheduled state |
| `queue_updated` | Canonical ordered queue and version |
| `chat_message` | Sanitized, rate-limited chat message |
| `reaction` | Curated reaction event |
| `member_updated` | Role/mute/moderation state change |
| `room_settings_updated` | Canonical settings |
| `host_grace_started` / `host_transferred` | Host continuity event |
| `room_ended` | Final reason and navigation instructions |
| `sync_status` | Recovery, blocked autoplay, player unavailable guidance |
| `error` | Typed, actionable error code and safe message |

### 9.6 HTTP API Surface

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/auth/*` | Auth.js | Authentication callbacks and sessions |
| `/api/rooms` | `POST` | Create durable room and invite material |
| `/api/rooms/:roomId` | `GET`, `PATCH`, `DELETE` | View/update/end durable room settings |
| `/api/rooms/resolve/:code` | `POST` | Rate-limited code resolution; never exposes private details before authorization |
| `/api/rooms/:roomId/invites` | `POST`, `DELETE` | Create/revoke invite tokens |
| `/api/rooms/:roomId/socket-token` | `POST` | Mint a short-lived scoped Socket.IO token |
| `/api/music/search` | `GET` | Validated proxy to FastAPI `ytmusicapi` search |
| `/api/music/tracks/:videoId` | `GET` | Normalized track metadata lookup |
| `/api/discovery/rooms` | `GET` | Public room discovery and filters (P1) |
| `/api/discovery/nearby` | `POST` | Opt-in radius query (P1) |
| `/api/me` | `GET`, `PATCH` | Profile and preferences |
| `/api/me/history` | `GET` | Room history (P1) |
| `/api/reports` | `POST` | Report user/room/message |
| `/api/health` | `GET` | Web service health without sensitive data |

---

## 10. MongoDB Data Model

### 10.1 Collections

| Collection | Purpose | Key fields / indexes |
| --- | --- | --- |
| `users` | Signed-in account and profile | Unique provider account ID, normalized display name |
| `sessions` / `accounts` | Auth.js session/provider data | Auth.js required indexes |
| `rooms` | Durable room configuration and final state | Unique active `roomCode`, host ID, visibility, status, timestamps |
| `roomInvites` | High-entropy invite tokens and revocation | Unique token hash, room ID, expiry TTL |
| `roomMembers` | Durable membership/history record | Compound room/user or guest identity index |
| `queueItems` | Durable/saved queue records and post-room history | Room ID + order index |
| `roomSnapshots` | Latest recoverable active-room state | Unique room ID, `updatedAt`, TTL for stale active snapshots |
| `roomEvents` | Auditable lifecycle/control events | Room ID + createdAt index; retention policy |
| `reports` | Abuse reports and moderation state | Status, reported entity, createdAt index |
| `blocks` | User block relationships | Unique blocker + blocked pair |
| `nearbyRoomLocations` | Coarse, temporary discovery data (P1) | `2dsphere` index, TTL index |
| `analyticsEvents` | Privacy-scoped product/sync telemetry | Event name + timestamp, retention/aggregation policy |

### 10.2 `rooms` Document Shape

```ts
type RoomDocument = {
  _id: ObjectId;
  code: string;
  title: string;
  hostUserId: ObjectId;
  visibility: "private" | "unlisted" | "public" | "nearby";
  joinPolicy: {
    allowGuests: boolean;
    requiresSignIn: boolean;
    requiresApproval: boolean;
    passwordHash?: string;
  };
  collaborationPolicy: {
    guestsCanAdd: boolean;
    guestsCanReorder: boolean;
    votingEnabled: boolean;
    chatEnabled: boolean;
    reactionsEnabled: boolean;
    coHostPlaybackEnabled: boolean;
  };
  capacity: number;
  status: "draft" | "active" | "ended" | "expired";
  currentTrack?: NormalizedTrack;
  createdAt: Date;
  activatedAt?: Date;
  endedAt?: Date;
};
```

### 10.3 Data Retention Defaults

- Active snapshots: expire shortly after a room ends, unless needed for incident review.
- Invite tokens: store only hashes; expire/revoke aggressively.
- Nearby coordinates: temporary/coarse with TTL; no location history by default.
- Chat/reactions: keep only if a defined retention policy and user disclosure exist; otherwise treat as transient.
- Analytics: aggregate and delete raw event detail on a defined schedule.
- User deletion: anonymize or delete records where legally/operationally appropriate while preserving minimal abuse/audit records under documented retention rules.

---

## 11. Security, Privacy, and Compliance Requirements

### 11.1 Security

1. Use HTTPS/WSS only in production.
2. Validate all route and socket payloads with shared Zod schemas.
3. Authenticate Socket.IO handshakes using short-lived, signed, audience-scoped tokens minted by the web API.
4. Verify host/co-host permission server-side for every state-changing command.
5. Use cryptographically secure random generators for invite tokens, guest IDs, command IDs, and passwords/salts.
6. Hash passwords and invite tokens; do not store plaintext secrets.
7. Apply CSP, secure headers, CSRF protection where relevant, origin checks, and strict CORS configuration.
8. Keep MongoDB, Railway, Vercel, OAuth, Sentry, and music-service secrets in their deployment secret stores only.
9. Log security-relevant events without logging auth tokens, raw cookies, full IPs where avoidable, or user provider credentials.
10. Dependabot/Renovate and dependency-audit workflows must cover Next.js, Socket.IO, FastAPI, and `ytmusicapi` dependencies.

### 11.2 Privacy

1. Explain why location is requested before invoking browser permission.
2. Make Nearby discovery off by default and independently reversible in settings.
3. Never display exact participant coordinates or a live map of people.
4. Collect the minimum identity data needed for the selected sign-in method.
5. Clearly disclose that participant browsers load content through an embedded YouTube player.
6. Do not collect microphone, camera, contacts, or background-location access.
7. Provide privacy policy, terms, reporting, data deletion, and contact routes before public launch.

### 11.3 Third-Party and Provider Risk

`ytmusicapi` is not an official YouTube Music product API. Its endpoints, authentication behavior, and response format can change without notice. The product must have:

- A provider adapter boundary and normalized response contracts.
- Feature flags to disable provider-dependent actions during outages.
- A maintenance runbook for provider breakage.
- No user request to paste browser cookies or upload authentication headers.
- A legal/product review before public deployment and after material provider policy changes.

---

## 12. Performance and Reliability Requirements

### 12.1 Budget

| Area | Target |
| --- | --- |
| Initial app shell usable | < 2.5 s on a typical 4G connection after cached revisit |
| Search interaction feedback | < 100 ms; network results rendered as available |
| Socket connect after valid token | p95 < 1.5 s under normal conditions |
| Host command acknowledgment | p95 < 250 ms within same broad region |
| Track cue attempt | Start immediately; report ready/error within 5 s target |
| Room state resync | p95 < 2 s plus YouTube/player buffering time |
| Client drift checks | 3–5 s interval; no network request required for each check |
| UI control response | visual pressed state < 50 ms |

### 12.2 Error Handling

| Failure | Required behavior |
| --- | --- |
| Socket disconnect | Show reconnecting state; disable unsafe local controls; auto-reconnect and fetch canonical state |
| Socket service restart | Reconnect, load latest snapshot if available, tell clients to resync; no silent divergent playback |
| Player not ready | Keep user in sync-ready state, offer retry/start manually, do not block other members |
| Autoplay blocked | Show one focused button that begins playback at current canonical position |
| Track unavailable | Inform host, skip/replace according to queue policy, keep room active |
| Music service error | Show retry/error in search only; current playback remains unaffected |
| MongoDB temporary error | Preserve in-memory active room, retry snapshot persistence, surface operational telemetry |
| Invalid event/version | Reject with typed error and send canonical state |
| Room full/ended/locked | Explain cause and provide return/join-another-room actions |

### 12.3 Observability

- Sentry captures exceptions with scrubbed context across web, Socket.IO, and FastAPI services.
- Structured logs include request ID, room ID hash/ID, event type, elapsed time, and error category.
- Metrics include active rooms, active connections, connection churn, room duration, command acknowledgement time, version conflicts, player failures, provider latency, and drift buckets.
- Alerts trigger on service down, elevated provider failures, unusual socket disconnect spikes, MongoDB connectivity failures, and high drift rates.
- An operator dashboard may expose aggregates but must not expose private room contents without authorized moderation access.

---

## 13. Deployment and Operations

### 13.1 Environments

| Environment | Purpose |
| --- | --- |
| Local | Developers run web, Socket.IO, FastAPI, and local/hosted MongoDB independently |
| Preview | Vercel preview for UI/API; isolated Railway/Mongo configuration or mocked realtime/music where required |
| Staging | Full integration environment with test provider configuration and controlled test rooms |
| Production | Vercel web/API, one Railway Socket.IO service, one Railway FastAPI `ytmusicapi` service, MongoDB Atlas |

### 13.2 Required Environment Variables

#### Web (Vercel)

```text
MONGODB_URI=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
SOCKET_SERVER_URL=
SOCKET_TOKEN_SECRET=
MUSIC_SERVICE_URL=
MUSIC_SERVICE_SHARED_SECRET=
SENTRY_DSN=
NEXT_PUBLIC_APP_URL=
```

#### Realtime (Railway)

```text
MONGODB_URI=
SOCKET_TOKEN_SECRET=
WEB_APP_ORIGIN=
SENTRY_DSN=
ROOM_SNAPSHOT_INTERVAL_MS=15000
MAX_SOCKET_REPLICAS=1
```

#### Music Service (Railway)

```text
MUSIC_SERVICE_SHARED_SECRET=
YTMUSIC_CONFIG_PATH=
SENTRY_DSN=
REQUEST_TIMEOUT_SECONDS=
```

No environment file containing real secrets is committed. Development uses `.env.example` with placeholders only.

### 13.3 Railway Service Rules

1. Deploy `realtime` and `music` as separate Railway services.
2. Expose the Socket.IO service publicly over a custom secure domain.
3. Restrict the music service to signed service requests; do not make it a public unauthenticated catalog API.
4. Use health checks and restart policies for both services.
5. Set Socket.IO service replicas to **one**.
6. Set a deployment/maintenance notice or graceful shutdown path so clients receive a reconnect warning when possible.
7. Establish MongoDB backups and alerting before public launch.

### 13.4 CI/CD Gates

Every pull request must run:

1. Typecheck.
2. Lint.
3. Unit tests.
4. Component/accessibility tests.
5. Socket event schema contract tests.
6. Integration tests against a test MongoDB database.
7. A production build.
8. Dependency and secret scanning.

Staging promotion additionally requires sync test results, provider-health review, and a manual keyboard/mobile smoke test.

---

## 14. Quality Assurance and Acceptance Criteria

### 14.1 End-to-End Acceptance Scenarios

| ID | Scenario | Pass condition |
| --- | --- | --- |
| E2E-01 | Create unlisted room | Signed-in user receives room page, QR, link, unique four-character code, and host role |
| E2E-02 | Join through QR | Guest opens encoded invite, supplies name if needed, sees lobby, and is present in member list |
| E2E-03 | Join through code | Correct code reaches permitted room; invalid/expired code leaks no private metadata |
| E2E-04 | Search and select | `ytmusicapi` result renders normalized metadata and host can cue it |
| E2E-05 | Scheduled play | Two independent browser clients start the selected track using one `startAt` event and report bounded drift |
| E2E-06 | Pause and resume | Host pause/resume updates every client once, with contiguous versions |
| E2E-07 | Seek | Host seek repositions every ready client to the correct canonical window |
| E2E-08 | Late join | Guest joins during a playing track and seeks to expected current position |
| E2E-09 | Reconnect | Disconnected client reconnects, receives state, and returns to sync without affecting room state |
| E2E-10 | Guest restriction | Guest cannot perform host-only controls; server rejects forged events |
| E2E-11 | Queue collaboration | Allowed guest adds track; disallowed guest receives clear policy error |
| E2E-12 | Player restriction | Autoplay-blocked client receives a usable manual-start action and room continues |
| E2E-13 | Host loss | Host grace period, transfer offer, and room end state behave according to policy |
| E2E-14 | Mobile UX | Join, playback, queue, member list, chat, and leave flow work at common mobile viewport widths |
| E2E-15 | Reduced motion | Essential state changes remain clear and nonessential animation is suppressed |
| E2E-16 | Nearby discovery (P1) | User consent, radius query, coarse result display, denial fallback, and location TTL all work |

### 14.2 Sync Test Matrix

Test at minimum:

- Two desktop browsers on the same network.
- Desktop plus mobile browser on different networks.
- High-latency/throttled connection.
- One buffering client.
- One client with autoplay blocked.
- One reconnecting client.
- Host rapid play/pause/seek sequence.
- Queue change while clients are buffering.
- Background/tab visibility resume.
- Bluetooth-output user warning/expected delay communication.

For every test, record action timestamp, client arrival time, scheduled time, player current time before/after correction, and visible state. Do not declare sync success only because Socket.IO messages were delivered.

---

## 15. Implementation Phases

### Phase 0 — Foundation

- Create monorepo/service boundaries or clearly separated deployable directories.
- Establish Next.js, Tailwind, shadcn/ui, design tokens, MongoDB/Mongoose, Auth.js, Socket.IO, FastAPI, and `ytmusicapi` scaffolding.
- Configure Vercel, Railway, MongoDB Atlas, secrets, health checks, error monitoring, and CI.
- Implement shared TypeScript schemas for all API and realtime events.

### Phase 1 — Core Listening Room (P0)

- Auth and anonymous guest identity.
- Create/end rooms, direct links, QR codes, four-character code join.
- Single Railway Socket.IO service with in-memory active room state.
- `ytmusicapi` search/normalized metadata service.
- Visible YouTube player wrapper.
- Host playback controls and timestamp synchronization protocol.
- Queue, presence, join/leave, reconnect, player states, error handling.
- Vercel-themed responsive shell, now-playing bar, core accessibility, fast motion rules.

### Phase 2 — Collaboration and Hardening (remaining P0)

- Chat, reactions, moderation controls, rate limiting, block/report flows.
- Room snapshots/restart-recovery experience.
- Sync telemetry, alerts, end-to-end test matrix, performance tuning.
- Security review and third-party policy review.

### Phase 3 — Social Discovery (P1)

- Public room discovery, occupancy, filters, profiles/history, saved queues.
- Nearby opt-in discovery with MongoDB geospatial queries and privacy controls.
- Track proposals, voting, and richer collaboration settings.
- PWA/mobile refinement, notifications, admin report queue.

### Phase 4 — Scale Decision (P2 / architecture review)

- Measure active rooms, concurrent connections, drift, service restart impact, and Railway limits.
- If horizontal Socket.IO scaling is necessary, write an ADR and add a broker before increasing replicas.
- Do not scale by merely changing a replica count.

---

## 16. Risks and Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| `ytmusicapi` changes or fails | Search/discovery outage | Provider interface, timeouts, feature flags, provider health monitoring, fallback roadmap |
| YouTube policy/player restriction | Playback feature blocked or non-compliant | Visible official embed, no audio extraction, periodic policy review, clear UX for browser limitations |
| Browser autoplay | Guest cannot start automatically | Pre-cue track, clear one-tap sync action, explain state |
| Network/device latency | Perceived mismatch | Future timestamps, clock estimation, drift correction, honest UI, testing matrix |
| Bluetooth latency | Individual user hears delay | Explain limitations; do not misdiagnose as socket failure |
| Single Socket.IO instance restart | Active room interruption | Mongo snapshots, reconnect UX, maintenance handling, monitoring; defer multi-instance scale until broker added |
| Four-character code guessing | Unauthorized room discovery | Token/password/approval policies, rate limiting, no sensitive detail before authorization |
| Public-room abuse | Unsafe community experience | Reporting, moderation roles, rate limits, room controls, audit events |
| Location misuse | Privacy harm | Strict opt-in, coarse/temporary storage, no exact display, clear fallback |
| Unbounded `ytmusicapi` calls | Provider instability/cost | Debounce, cache normalized metadata cautiously, server-side rate limits, request timeouts |
| UI drift into generic dashboard | Weak product quality | Enforce visual rules, design review, content-first layouts, no decorative cards/gradients |

---

## 17. Explicit Product Decisions

These are final defaults for implementation unless changed through a new product decision:

1. `ytmusicapi` is the music discovery integration.
2. MongoDB Atlas is the persistent database.
3. Redis/Upstash is not part of v1.
4. Socket.IO runs separately on Railway as exactly one replica.
5. FastAPI + `ytmusicapi` runs as a separate Railway service.
6. Next.js web/API deploys on Vercel.
7. Every listener uses their own visible embedded YouTube player; 67Songs does not stream music.
8. QR and direct links are the preferred private invite mechanism; a four-character code is convenience, not security.
9. Default rooms are Unlisted and guest-friendly; host settings can make them stricter.
10. Nearby discovery is opt-in P1, not a launch blocker.
11. The default visual style is Vercel-inspired and dense, implemented with shadcn/ui primitives but not generic shadcn layouts.
12. Motion is short, purposeful, and reduced-motion aware; slow ornamental animation is prohibited.

---

## 18. Definition of Done for v1

v1 is complete only when all P0 features are implemented, tested, documented, and deployable, including:

- A host can create a room, search via `ytmusicapi`, choose a track, invite people by QR/link/code, and end the room.
- A guest can join without unnecessary account friction, see live presence, and play in sync using the visible YouTube player.
- Host playback, seek, track changes, queue actions, and permission rules are authoritative, ordered, acknowledged, and recoverable.
- The product works on current desktop and mobile browsers with clear autoplay/reconnect/player failure states.
- The UI follows the stated Vercel-inspired design and motion requirements rather than default card-heavy generated-app aesthetics.
- MongoDB persistence, Socket.IO single-instance operational constraints, FastAPI `ytmusicapi` isolation, security controls, logs, and monitoring are in place.
- The full sync test matrix and critical accessibility flows pass before public release.
