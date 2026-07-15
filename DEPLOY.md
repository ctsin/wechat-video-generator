# DEPLOY.md — 上线 runbook

MVP 目标:Cloudflare(前端 SPA + 反代)+ AWS App Runner(后端)+ Remotion Lambda(渲染)。
完整方案见 `/Users/ctsin/.claude/plans/stateless-sparking-shannon.md`。

## 0. 前置 / 一次性

- [ ] **轮换泄露的 AWS Key**:旧 IAM 用户的 Access Key 已在对话上下文中明文出现
      (`AKIA…NYQ4Q`,全部 20 位仅作占位),在 AWS 控制台 IAM → Users 停用旧 key、生成新 key,
      或者改用 IAM 角色(见步骤 2)。
- [ ] 本地跑一遍 `cd backend && npm run typecheck` + `cd frontend && npx tsc --noEmit -p tsconfig.json`,
      确认无类型错误(本仓库已通过)。

## 1. 部署 Remotion 站点(仅合成代码变更时重跑)

复用 `frontend/scripts/verify-render.mjs` 里的 `deploySite` 流程,或单独写一个 deploy-site.mjs:

```bash
cd frontend
eval "$(aws configure export-credentials --format env)"
node -e "
import('@remotion/lambda').then(async (l) => {
  const { bucketName } = await l.getOrCreateBucket({ region:'us-east-1' });
  const { serveUrl } = await l.deploySite({
    bucketName, region:'us-east-1',
    entryPoint:'src/remotion/index.ts',
    siteName:'wechat-video',
  });
  console.log('serveUrl=', serveUrl);
});
"
```

把打印的 `serveUrl` 记下来,设到后端环境变量 `REMOTION_SERVE_URL`。

## 2. 后端 → AWS App Runner

镜像构建依赖:**后端自身不装 `@remotion/*`**,Dockerfile 会从 `frontend/node_modules` 安装。
确认本机有 Docker 登录 ECR 的权限(`aws ecr get-login-password`)。

### 2.1 建 ECR 仓库并推镜像

```bash
AWS_REGION=us-east-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
REPO=wechat-video-backend
aws ecr create-repository --repository-name $REPO --region $AWS_REGION

# 登录 + 构建 + 推送
aws ecr get-login-password --region $AWS_REGION \
  | docker login --username AWS --password-stdin $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com
docker build -t $REPO:latest -f backend/Dockerfile .
docker tag  $REPO:latest $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
docker push $ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$REPO:latest
```

### 2.2 创建 IAM 角色给 App Runner 实例用

```bash
# trust policy (App Runner)
cat > /tmp/trust.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "tasks.apprunner.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
JSON
aws iam create-role --role-name apprunner-wechat-video \
  --assume-role-policy-document file:///tmp/trust.json

# 最小权限:Remotion Lambda 调用 + 读 S3 render output + 写 S3(若要支持写产物)
cat > /tmp/perms.json <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect":"Allow", "Action":["lambda:InvokeFunction","lambda:GetFunction"],
      "Resource":"arn:aws:lambda:us-east-1:ACCOUNT:function:remotion-render-4-0-488-mem2048mb-disk2048mb-120sec" },
    { "Effect":"Allow", "Action":["s3:GetObject","s3:ListBucket"],
      "Resource":["arn:aws:s3:::remotionlambda-useast1-kb4drvyja4",
                  "arn:aws:s3:::remotionlambda-useast1-kb4drvyja4/*"] }
  ]
}
JSON
# 把占位符 ACCOUNT 替换为你的账号 ID
sed -i "s/ACCOUNT/$ACCOUNT/" /tmp/perms.json
aws iam put-role-policy --role-name apprunner-wechat-video \
  --policy-name wechat-video-runtime --policy-document file:///tmp/perms.json
```

记下角色 ARN:`arn:aws:iam::$ACCOUNT:role/apprunner-wechat-video`。

### 2.3 创建 App Runner 服务

控制台 → App Runner → Create service:

- **Source**: Container registry → ECR → 上一步推的镜像。
- **Service name**: `wechat-video-backend`。
- **Port**: 4000。
- **Health check**: `GET /api/health`。
- **Security**: 出站流量开公网即可(后端要访问 S3/Lambda API)。VPC 视需要选 Public。
- **Instance role**: 上一步的 `apprunner-wechat-video`。
- **Environment variables**(全部去掉 `REMOTION_AWS_ACCESS_KEY_ID`/`SECRET`,改用角色):
  ```
  NODE_ENV=production
  PORT=4000
  FRONTEND_ORIGIN=https://app.example.com
  PUBLIC_BASE_URL=https://app.example.com
  REMOTION_LAMBDA_ENABLED=1
  REMOTION_AWS_REGION=us-east-1
  REMOTION_BUCKET_NAME=remotionlambda-useast1-kb4drvyja4
  REMOTION_FUNCTION_NAME=remotion-render-4-0-488-mem2048mb-disk2048mb-120sec
  REMOTION_SERVE_URL=<步骤 1 的 serveUrl>
  ```
- **Auto scaling**: 建议 min=1, max=1(MVP 内存态,扩缩会丢 job/orders/db.json)。
- 创建后记下 `https://<id>.us-east-1.awsapprunner.com`。

## 3. 前端 → Cloudflare Pages

### 3.1 Pages 项目

- 控制台 → Workers & Pages → Create application → Pages → 直连 Git 仓库(也可
  `npm run build` 后直传 `dist/`,但 Git 连接更便于自动部署)。
- **Build command**: `cd frontend && npm ci && npm run build`。
- **Build output directory**: `frontend/dist`。
- **Environment variables**(Production):
  ```
  BACKEND_ORIGIN=https://<id>.us-east-1.awsapprunner.com
  ```
- 首次部署后,Custom domains 绑 `app.example.com`。Cloudflare 会自动管证书。

### 3.2 反代 Functions

仓库里已写好 `frontend/functions/api/[[path]].ts` 与 `frontend/functions/static/[[path]].ts`
(共享 `frontend/functions/_lib/proxy.ts`),Pages 部署时会自动发现并发布成
Functions,运行时读 `ctx.env.BACKEND_ORIGIN`。

如要本地调试 Pages Functions,可用 `wrangler pages dev frontend/dist`。

## 4. 联调验证

- [ ] `curl https://app.example.com/api/health` → `{"ok":true}`(反代通到 App Runner)。
- [ ] 浏览器打开 `https://app.example.com`,看 SPA 加载;`DevTools Network` 里看 `/api/auth/anonymous`
      走的应是同源,然后服务端转发到 App Runner。
- [ ] 编辑一条对话 → 点"下载超清MP4",轮询状态走 `done`,`outputUrl` 形如
      `https://s3.us-east-1.amazonaws.com/remotionlambda-useast1-kb4drvyja4/renders/<renderId>/out.mp4`,
      点击可播放(用 ffprobe 或 `@remotion/media-parser` 复核)。
- [ ] 上传一首 BGM,返回的 URL `https://app.example.com/static/bgm/<file>` 能直接打开。
- [ ] App Runner 日志无 `ExpiredToken`(角色链不过期)、无 downloadMedia 失败。

## 5. 已知 MVP 限制

- 单实例:`jobs`/`orders` 内存 Map、`db.json` 本地文件、`uploads/bgm` 本地磁盘。
  App Runner 重启/重部署会丢在途 job、订单、用户/项目数据与已上传 BGM。
  后续硬化:见 `CLAUDE.md` TODO(→ DynamoDB/Postgres/S3/CloudFront)。
- 不开 HTTPS 自管:Cloudflare 自动管证书;App Runner 自带 HTTPS,无需关心 ACM。
- App Runner **不可控文件系统**:若需持久化(db.json、uploads),目前只适合
  "丢得起"的 MVP 数据,否则请在硬化阶段切到托管数据库/对象存储。
