# Backend Dockerfile — AWS App Runner.
#
# Layout note: backend is copied under /app/backend and the sibling frontend
# under /app/frontend, so the runtime's relative path
# `path.resolve(__dirname, '../../../frontend')` in src/services/render.ts
# still resolves to the frontend tree, and `createRequire(path.join(
# FRONTEND_DIR, 'noop.js'))` can find @remotion/lambda in
# frontend/node_modules.
#
# Remotion composition changes require rebuilding this image so the bundled
# frontend source is fresh.

FROM node:22-slim

WORKDIR /app

# Install OS deps that @remotion/renderer / headless Chromium may need at
# runtime. (Lambda path doesn't use Chromium, but a future dev/local render on
# the container would.)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends \
       ca-certificates python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

# Backend deps (no @remotion/* — those are resolved from the frontend tree at
# runtime via createRequire).
COPY backend/package.json backend/package-lock.json* backend/pnpm-lock.yaml* ./backend/
WORKDIR /app/backend
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile --prod; \
    else npm install --omit=dev; fi

# Frontend deps (Remotion Lambda + its transitive deps) — production installs
# the same set that the dev environment uses, just omitting dev tooling.
COPY frontend/package.json frontend/package-lock.json* frontend/pnpm-lock.yaml* ../frontend/
WORKDIR /app/frontend
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile --prod; \
    else npm install --omit=dev; fi

# Copy sources last so source changes don't bust the dependency layers.
WORKDIR /app
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Drop the dev-only render-from-bundler path: ensureRendersDir + local
# static/renders dir are unused in production (Lambda MP4 lives in S3).
# We still need to ensure those paths exist for health checks and for the
# local-render dev fallback. mkdir -p is idempotent.
RUN mkdir -p /app/backend/static/renders /app/backend/uploads/bgm

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000

# Node 22+ supports --experimental-strip-types; the project ships as .ts and
# has no compile step in its npm `start` script.
WORKDIR /app/backend
CMD ["node", "--experimental-strip-types", "src/server.ts"]
