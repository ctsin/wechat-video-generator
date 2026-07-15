# Backend — WeChat Dialogue Video Generator

Express + TypeScript orchestration server. Implements every API the current frontend needs and exposes static folders for uploaded BGM + rendered MP4s.

## Stack

- **Runtime**: Node.js 20+
- **HTTP**: Express 4 (multer for `multipart/form-data`, raw body parser for `WeChat/Alipay` callbacks)
- **Validation**: `zod` schemas mirrored against `frontend/src/types.ts` and `AGENTS.md §2`
- **Auth**: stateless HS256 JWT via `jose`, claims round-tripped against a JSON-file user table
- **Persistence**: JSON file at `db.json` (atomic temp-write + rename)
- **AWS Lambda render**: `@remotion/lambda` (resolved from the frontend package so versions match the composition), gated behind `REMOTION_LAMBDA_ENABLED=1` + bucket + function env. Without it the render endpoints render locally via `@remotion/renderer` into `static/renders/<jobId>.mp4` — a real, playable MP4 so the front-end loop works without AWS credentials.

## Layout

```
backend/
├── src/
│   ├── server.ts            # entry: CORS, JSON, routers, static, error handler
│   ├── lib/
│   │   ├── env.ts           # zod-validated env loader
│   │   ├── auth.ts          # JWT sign/verify
│   │   └── db.ts            # JSON-file persistence (users + projects)
│   ├── middleware/
│   │   ├── cors.ts          # CORS bound to FRONTEND_ORIGIN
│   │   ├── auth.ts          # verifyJwt (populates req.user) + requireJwt (401)
│   │   ├── validateScript.ts# AGENTS.md §2 + §5 guardrail (zod, FREE/PREMIUM)
│   │   └── error.ts         # JSON error handler
│   ├── routes/
│   │   ├── auth.ts          # /api/auth/anonymous · /me · /upgrade
│   │   ├── projects.ts      # /api/projects [GET/POST/GET:id/PUT:id/DELETE:id]
│   │   ├── render.ts        # /api/preview/render · /api/render · /jobs
│   │   ├── pay.ts           # /api/pay/orders · /callback · /dev/success
│   │   └── assets.ts        # POST /api/assets/bgm (multipart upload)
│   ├── services/
│   │   ├── jobs.ts          # in-memory job store + URL builder
│   │   └── render.ts        # dispatch to AWS Lambda OR write placeholder MP4
│   └── types/script.ts      # DialogueScript + TierLimits
├── static/renders/          # produced MP4s (gitignored)
├── uploads/bgm/             # uploaded BGM (gitignored)
├── db.json                  # persisted users + projects (gitignored)
├── .env.example
└── package.json
```

## Endpoints (current frontend)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | — | uptime check |
| POST | `/api/auth/anonymous` | — | issue a free-tier JWT for a clientId |
| GET | `/api/auth/me` | bearer | introspect current JWT claims |
| POST | `/api/auth/upgrade` | bearer (free) | dev-only premium upgrade |
| POST | `/api/preview/render` | — | watermarked free-tier render |
| GET | `/api/preview/render/:id` | — | poll free-tier job status |
| POST | `/api/render` | bearer (premium) | HD render |
| GET | `/api/render/:id` | bearer (premium) | poll job status |
| GET | `/api/jobs` | bearer | list caller's recent jobs |
| GET / POST / PUT / DELETE | `/api/projects[/:id]` | bearer | script save/load |
| POST | `/api/pay/orders` | — | create a Native-pay order (returns mock QR + dev `simulateSuccessUrl`) |
| POST | `/api/pay/callback` | provider | WeChat/Alipay webhook (JSON, form-urlencoded, raw XML) |
| GET | `/api/pay/dev/success/:orderId` | — | dev helper to flip an order to paid |
| POST | `/api/assets/bgm` | bearer | upload MP3/WAV; returns served URL |
| GET | `/static/bgm/:file` | — | serve BGM |
| GET | `/static/renders/:id.mp4` | — | serve rendered MP4 |

## Dev run

```bash
cd backend
cp .env.example .env        # tweak FRONTEND_ORIGIN/JWT_SECRET/PUBLIC_BASE_URL as needed
npm install
npm run dev                 # tsx watch on :4000
```

Frontend `vite.config.ts` already proxies `/api` and `/static` to `http://localhost:4000`, so the SPA hits the same-origin URLs the production setup will use.

## Production / AWS

1. **Provision + verify in one step.** With AWS credentials exported
   (`REMOTION_AWS_ACCESS_KEY_ID` + `REMOTION_AWS_SECRET_ACCESS_KEY`, or an
   `AWS_PROFILE`), run `cd frontend && npm run verify:render`. It creates the S3
   bucket, deploys a version-compatible Lambda function, bundles + uploads the
   `WeChatChat` site, runs a short render, downloads it, and prints the exact
   `REMOTION_BUCKET_NAME` / `REMOTION_FUNCTION_NAME` to copy into `backend/.env`.
2. Fill `backend/.env`: `REMOTION_LAMBDA_ENABLED=1`, `REMOTION_AWS_REGION`,
   `REMOTION_BUCKET_NAME`, `REMOTION_FUNCTION_NAME`, and the AWS credentials.
   The backend then deploys the site once per process (or reuses
   `REMOTION_SERVE_URL` if set), submits `renderMediaOnLambda`, polls
   `getRenderProgress(skipLambdaInvocation: true)`, and `downloadMedia`s into
   `static/renders/<jobId>.mp4`.
3. The dev `/api/auth/upgrade` shortcut should be removed; the real flow goes
   `/api/pay/orders → user scans QR → provider POSTs /api/pay/callback → user
   auto-upgraded + JWT re-issued`.
4. Swap the JSON-file DB for SQLite / Postgres; the helpers in `lib/db.ts` are
   the only call-sites.
5. Replace HS256 with RS256 + KMS-managed key.

## Smoke test recap

```bash
# health
curl localhost:4000/api/health

# anonymous JWT
curl -X POST localhost:4000/api/auth/anonymous -H 'content-type: application/json' -d '{"clientId":"cli"}'

# preview render
curl -X POST localhost:4000/api/preview/render -H 'content-type: application/json' \
  -d '{"script":{"width":720,"height":1280,"fps":30,"phoneModel":"standard","timeline":[{"id":"a","type":"text","sender":"target","content":"hi","durationInFrames":30}]}}'

# poll until done, then fetch the outputUrl
```
