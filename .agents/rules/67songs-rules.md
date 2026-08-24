# 67Songs — Mandatory Agent Rules

## 1. Codebase Memory MCP — ALWAYS USE FIRST

Before ANY code discovery, exploration, or understanding task, you MUST use codebase-memory-mcp tools in this priority order:

1. `search_graph` — find functions, classes, routes, components, variables by pattern
2. `trace_path` — trace who calls a function or what it calls
3. `get_code_snippet` — read specific function/class source code
4. `query_graph` — run Cypher queries for complex patterns
5. `get_architecture` — high-level project summary
6. `search_code` — text-level code search within the graph

**Fall back to grep/glob ONLY when:**
- Searching for string literals, error messages, config values
- Searching non-code files (Dockerfiles, shell scripts, configs, .env)
- MCP tools return empty/insufficient results

**After completing significant work, ALWAYS run `index_repository` to keep the graph updated.**

## 2. NO AI SLOP UI — ABSOLUTE ZERO TOLERANCE

The UI must NEVER look like generic AI-generated dashboard slop. Violating any of these is an immediate failure:

### BANNED patterns (never use):
- ❌ Oversized hero sections with massive gradient backgrounds
- ❌ Rows of metric/stat cards with icons (the "AI dashboard" look)
- ❌ Rounded containers/cards wrapping every single element
- ❌ Excessive whitespace that wastes screen real estate
- ❌ Generic blue/purple gradient buttons
- ❌ Placeholder "Lorem ipsum" or "Feature 1, Feature 2, Feature 3" content
- ❌ Giant decorative illustrations or stock art
- ❌ Slow, bouncy, spring-based animations
- ❌ Glassmorphism cards floating on gradient backgrounds
- ❌ Large pill-shaped buttons everywhere
- ❌ Rainbow gradients, neon glows, or excessive shadows
- ❌ Cookie-cutter landing pages with "Get Started" hero + 3-column feature grid
- ❌ Using album art as blurred background decoration
- ❌ Generic "Welcome to [App]" headings with no utility

### REQUIRED patterns (always use):
- ✅ Near-black (#0a0a0a), white (#fafafa), neutral grays — Vercel's palette
- ✅ ONE intentional accent color for active/player states only
- ✅ Crisp 1px borders, not thick rounded borders
- ✅ Content-dense layouts — every pixel earns its place
- ✅ Clean type hierarchy using Geist font with tabular numerals
- ✅ Lists, rows, dividers, and panes for information architecture
- ✅ Cards ONLY when items genuinely need visual containers (room tiles, media items)
- ✅ Functional spacing (8px grid), never decorative spacing
- ✅ CSS transitions only: opacity + transform, 80-220ms max
- ✅ Respect `prefers-reduced-motion` everywhere
- ✅ Spotify-like music shell: sidebar + main content + contextual panel + persistent now-playing bar
- ✅ Dense, professional, native-app feel

### Design reference:
Think **Vercel dashboard meets Spotify desktop app**. Not a SaaS landing page. Not a dashboard template. A focused music product.

## 3. Architecture Rules

- The project has 3 services: `web/` (Next.js on Vercel), `backend/realtime/` (Node.js Socket.IO on Railway), `backend/music/` (Python FastAPI on Railway)
- MongoDB Atlas is the only database. NO Redis in v1.
- Socket.IO runs EXACTLY 1 replica. Never configure multiple replicas without a broker.
- `ytmusicapi` is accessed ONLY through the FastAPI music service, never from browser clients.
- Shared TypeScript types go in `web/lib/types/` or a shared package — NEVER duplicate type definitions.
- All Socket.IO events use Zod schemas for validation on both ends.
- Every API route validates input with Zod before processing.
- Never store, proxy, extract, or cache audio/video streams.

## 4. Master Device System — CORE MECHANIC

The room creator is the **Master**. This is the central control model for 67Songs.

### Master privileges (ONLY the master can):
- Play, pause, seek, skip tracks
- Accept or reject song requests from other participants
- Change room settings (visibility, join policy, collaboration policy)
- Remove, mute, or block members
- Promote someone to co-host
- **Transfer master to another member** (explicit action, irreversible until transferred back)
- End the room

### Co-host privileges (master grants these):
- Play/pause/seek if master enables `coHostPlaybackEnabled`
- Moderate chat (delete messages, mute users)
- Accept/reject song requests if master enables it

### Regular members & guests — Song Request System:
- Any member/guest can **request a song** (unless room policy disables it)
- A request appears in the master's queue panel as a **pending request** with: track info, requester name, timestamp
- Master sees Accept / Reject buttons on each request
- Accepted requests go into the queue at the position the master chooses (next up, or end of queue)
- Rejected requests show a brief notification to the requester ("Your request was not added")
- Members can see their own pending/accepted/rejected request status
- Rate limit: max 3 pending requests per member at a time

### Master transfer flow:
1. Master opens member list → clicks a member → "Transfer master control"
2. Confirmation dialog: "Transfer control to {name}? You will become a regular member."
3. On confirm: server updates `hostId`, broadcasts `host_transferred` event
4. Old master becomes regular member, new master gets full controls
5. If master disconnects: 60s grace period → auto-transfer offer to longest-present member

### Socket.IO events for master/request system:
- `song_request` (client→server): member submits a track request
- `song_request_received` (server→client): master sees new request
- `song_request_response` (client→server): master accepts/rejects
- `song_request_status` (server→client): requester gets accept/reject notification
- `master_transfer_request` (client→server): master initiates transfer
- `host_transferred` (server→client): broadcast new master to all

## 5. Git Commit Rules — MANDATORY

**You MUST commit after every meaningful change.** This is not optional.

### When to commit:
- After completing each sub-section of a phase (e.g., "0.1 Project Structure", "0.2 Shared Types", etc.)
- After fixing a bug or resolving an error
- After adding a new feature or component
- After refactoring or restructuring code
- Before moving to the next phase

### Commit format:
```
<type>(<scope>): <short description>

<optional body with details>
```

Types: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`, `test`
Scopes: `web`, `realtime`, `music`, `types`, `db`, `auth`, `ui`, `player`, `sync`, `queue`, `chat`

### Examples:
```
feat(web): add Spotify-like app shell layout with sidebar and now-playing bar
feat(realtime): implement Socket.IO playback handler with scheduled sync
feat(music): add ytmusicapi search endpoint with normalized schemas
fix(sync): correct clock offset calculation for drift correction
chore(web): configure shadcn/ui design tokens for Vercel-dark theme
```

### Rules:
- NEVER make a giant commit with 20+ files spanning multiple features
- Each commit must be atomic: one logical change per commit
- Always `git add` only the files related to the current change
- Run `git status` before committing to verify staged files
- Write descriptive commit messages — no "update files" or "fix stuff"

## 6. Dependency Auto-Install — MANDATORY

**If ANY dependency is missing during implementation, install it immediately. Do NOT ask the user.**

### Rules:
- Before writing code that uses a new package, check if it's installed
- If `import` fails or a package is not in `package.json` / `requirements.txt`, install it:
  - Web/Realtime: `cd <service-dir> && pnpm add <package>`
  - Music: `cd backend/music && pip install <package>` and update `requirements.txt`
- After installing, verify the import works before continuing
- Log what was installed in the commit message: `chore(web): add missing dep <package>`

## 8. Code Quality Rules

- TypeScript strict mode everywhere (no `any`, no `as` casts without justification)
- Every component must have a unique, descriptive `id` on interactive elements
- Every interactive element must be keyboard accessible
- Use semantic HTML (nav, main, section, article, aside, header, footer)
- Server Components by default; Client Components only when needed (interactivity, hooks, browser APIs)
- Error boundaries on every route segment
- Loading states on every async boundary
- All user-facing strings must be configurable (no hardcoded product name)

## 9. File Organization

```
web/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth routes
│   ├── (main)/            # Main app shell routes  
│   ├── room/[roomId]/     # Room routes
│   └── api/               # API routes
├── components/
│   ├── ui/                # shadcn/ui primitives
│   ├── player/            # YouTube player wrapper
│   ├── room/              # Room-specific components
│   ├── queue/             # Queue components
│   ├── search/            # Music search components
│   └── layout/            # Shell, sidebar, now-playing bar
├── lib/
│   ├── types/             # Shared TypeScript types + Zod schemas
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand stores
│   ├── socket/            # Socket.IO client logic
│   ├── utils/             # Utilities
│   └── api/               # API client functions
├── styles/                # Design tokens, theme
└── public/                # Static assets

backend/
├── realtime/              # Node.js Socket.IO service
│   ├── src/
│   │   ├── handlers/      # Socket event handlers
│   │   ├── state/         # In-memory room state
│   │   ├── sync/          # Synchronization logic
│   │   ├── middleware/     # Auth, rate limiting
│   │   └── types/         # Shared with web via symlink or copy
│   └── package.json
└── music/                 # Python FastAPI service
    ├── app/
    │   ├── routers/       # FastAPI route modules
    │   ├── providers/     # MusicProvider interface + ytmusicapi impl
    │   ├── schemas/       # Pydantic models
    │   └── middleware/    # Auth, rate limiting
    ├── requirements.txt
    └── Dockerfile
```
