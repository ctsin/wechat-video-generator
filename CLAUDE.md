# CLAUDE.md — Project Memory

WeChat Dialogue Video Generator (Remotion-based cloud-rendering SaaS).
See `AGENTS.md` for the full architecture/spec handbook. This file tracks
**current build status** so a fresh session can pick up where we left off.

## Layout
- `frontend/` — Vite + React SPA (editor, `@remotion/player` preview) + the
  Remotion composition (`src/remotion/`, entry `index.ts`, comp id `WeChatChat`).
- `backend/` — Express + TS orchestration API (auth, projects, render, pay, assets).
- `stitch/` — Google Stitch design source.

## Status snapshot (as of 2026-07-14)

### ✅ Done & verified
- **Full frontend↔backend loop wired** (edit → save project → anonymous JWT →
  render → poll → download → pay order → BGM upload). Not just UI stubs.
- **Real local rendering** (dev/default path, no AWS). `backend/src/services/render.ts`
  `renderLocally()` resolves `@remotion/bundler` + `@remotion/renderer` from
  `frontend/node_modules` via `createRequire` rooted at `frontend/` (keeps versions
  matching the composition's `remotion`). Bundles once per process (memoized
  `getServeUrl`), renders H.264 into `static/renders/<jobId>.mp4`.
  Verified: 720×1280 h264 playable MP4 via `@remotion/media-parser`.
- **Video follows the script.** `frontend/src/remotion/index.ts` Composition has
  `calculateMetadata` deriving width/height/fps from `inputProps.script` and
  duration from `totalDuration(timeline)` (incl. `typingBefore`); even-dims for h264;
  falls back to 720×1280×30×90 when no script. Applies to BOTH local + Lambda paths.
  Verified: 1080×1920@60fps, 130 frames.
- **AWS Lambda path (code) fixed** — was broken before. Fixes in `render.ts`:
  (1) `@remotion/lambda` now resolved via `requireFromFrontend` (was
  `ERR_MODULE_NOT_FOUND`); (2) `downloadMedia({...outPath})` per Remotion 4.x
  (was wrongly treated as a stream); (3) `deploySite` memoized per process +
  `REMOTION_SERVE_URL` support (was redeploying every job).
  `env.ts`/`.env.example`: added `REMOTION_AWS_ACCESS_KEY_ID`,
  `REMOTION_AWS_SECRET_ACCESS_KEY`, `REMOTION_SERVE_URL`, `REMOTION_SITE_NAME` +
  startup warning when Lambda enabled without creds.
  `frontend/scripts/verify-render.mjs`: same downloadMedia fix, auto-picks a
  version-compatible function (`getFunctions({compatibleOnly:true})`), prints the
  `.env` values to copy. Typecheck + boot smoke green. **Not run against real AWS**
  (needs the user's credentials).

### 🟡 Still mock / dev-only
- **Payment**: `backend/src/routes/pay.ts` returns a mock Native QR
  (`weixin://...devmock_`) + `/api/pay/dev/success/:orderId` helper.
  `backend/src/routes/auth.ts` `/upgrade` is a dev-only shortcut.
- **Watermark**: AGENTS §4.2 requires a burned-in watermark for the free tier.
  `job.watermark` flag is plumbed through, but NOT burned into the video yet
  (only a frontend text hint). Now feasible since rendering is real.

### 🔴 Production TODO (backend/README.md §Production)
1. Run `cd frontend && npm run verify:render` with AWS creds to provision +
   verify, then fill `backend/.env` (`REMOTION_LAMBDA_ENABLED=1`, bucket, function).
2. Remove `/api/auth/upgrade`; drive upgrades via pay callback (silent onboarding).
3. JSON-file DB (`lib/db.ts`) → SQLite/Postgres.
4. HS256 → RS256 + KMS.
5. Watermark burn-in (free vs premium).

## Conventions / gotchas
- Backend has **no** `@remotion/*` in its own `node_modules` by design — always
  resolve Remotion packages from `frontend/` via `requireFromFrontend`.
- Installed Remotion versions drift slightly (remotion 4.0.486 / bundler 488 /
  renderer 486 / lambda 488) — only a warning, renders fine.
- Dev default is local render (`REMOTION_LAMBDA_ENABLED` empty). `.env` was created
  from `.env.example`.
- Kill stray backend before restart: `lsof -ti tcp:4000 | xargs kill -9`.

## Commands
- Backend dev: `cd backend && npm run dev` (:4000, tsx watch). Typecheck: `npm run typecheck`.
- Frontend dev: `cd frontend && npm run dev` (:5173, proxies /api + /static → :4000).
- Lambda provision/verify: `cd frontend && npm run verify:render` (needs AWS creds).
