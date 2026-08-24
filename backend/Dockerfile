# Multi-stage production build for 67Songs Unified Backend (FastAPI + Socket.IO)
FROM node:20-bookworm-slim AS node-builder

# Install pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /build/realtime
COPY backend/realtime/package.json backend/realtime/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY backend/realtime/ ./
RUN pnpm build

# Final Unified Runtime
FROM python:3.12-slim-bookworm

# Install Node.js 20, curl, and procps
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install Python dependencies
COPY backend/music/requirements.txt /app/backend/music/
RUN pip install --no-cache-dir -r /app/backend/music/requirements.txt

# 2. Copy Python application
COPY backend/music/ /app/backend/music/

# 3. Copy Node.js built application and node_modules
COPY backend/realtime/package.json /app/backend/realtime/
COPY --from=node-builder /build/realtime/node_modules /app/backend/realtime/node_modules
COPY --from=node-builder /build/realtime/dist /app/backend/realtime/dist

# 4. Copy and prepare start script
COPY backend/start.sh /app/backend/start.sh
RUN chmod +x /app/backend/start.sh

# Expose Railway PORT
ENV PORT=4000
EXPOSE 4000

# Run entrypoint
CMD ["/app/backend/start.sh"]
