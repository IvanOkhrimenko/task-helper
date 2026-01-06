# Task Helper - Deployment Documentation

## Production URLs

| Service | URL | Platform |
|---------|-----|----------|
| Frontend | https://frontend-a97w1knv9-ivans-projects-26918c59.vercel.app | Vercel |
| Backend API | https://task-helper-api.fly.dev | Fly.io |
| Database | PostgreSQL (internal) | Fly.io |
| Repository | https://github.com/IvanOkhrimenko/task-helper | GitHub |

---

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Vercel         │────▶│  Fly.io         │────▶│  Fly.io         │
│  (Frontend)     │     │  (Backend API)  │     │  (PostgreSQL)   │
│                 │     │                 │     │                 │
│  Angular 19     │     │  Node.js/Express│     │  PostgreSQL 17  │
│                 │     │  Prisma ORM     │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Frontend (Vercel)

### Configuration

**File:** `frontend/vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/frontend/browser",
  "framework": "angular",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Environment

**File:** `frontend/src/environments/environment.prod.ts`
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://task-helper-api.fly.dev/api'
};
```

### Deploy Commands

```bash
# Initial deploy
cd frontend
vercel --yes --prod

# Redeploy
vercel --yes --prod
```

### Notes

- Auto-deploy from GitHub is available via Vercel Dashboard
- SPA routing configured with rewrites
- Production build uses `environment.prod.ts`

---

## Backend (Fly.io)

### Configuration

**File:** `backend/fly.toml`
```toml
app = 'task-helper-api'
primary_region = 'ams'

[build]

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = 'stop'
  auto_start_machines = true
  min_machines_running = 0
  processes = ['app']

[[vm]]
  memory = '512mb'
  cpu_kind = 'shared'
  cpus = 1
```

**File:** `backend/Dockerfile`
```dockerfile
FROM node:20-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npm run build
RUN npx prisma generate

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./
EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
```

### Secrets (Environment Variables)

```bash
# View current secrets
fly secrets list --app task-helper-api

# Set secrets
fly secrets set \
  JWT_SECRET="your-secret-key" \
  CORS_ORIGIN="https://your-frontend.vercel.app,http://localhost:4200" \
  --app task-helper-api

# DATABASE_URL is auto-set when attaching postgres
```

### Deploy Commands

```bash
cd backend

# Deploy
fly deploy

# View logs
fly logs --app task-helper-api

# Check status
fly status --app task-helper-api

# SSH into machine
fly ssh console --app task-helper-api
```

### Auto-stop Behavior

Machines are configured with `auto_stop_machines = 'stop'`:
- Machines stop when idle (no requests)
- Auto-start on incoming request
- First request after idle may take 5-10 seconds (cold start)

To disable auto-stop:
```bash
fly scale count 1 --app task-helper-api
```

---

## Database (Fly.io PostgreSQL)

### Connection

- **Internal hostname:** `task-helper-db.flycast`
- **Port:** `5432`
- **Database:** `task_helper_api`

### Management

```bash
# Check database status
fly status --app task-helper-db

# Start database (if stopped)
fly machine start <machine-id> --app task-helper-db

# Connect via psql
fly postgres connect --app task-helper-db

# Run Prisma Studio locally
cd backend
DATABASE_URL="postgres://..." npx prisma studio
```

### Backups

```bash
# Create manual backup
fly postgres backup create --app task-helper-db

# List backups
fly postgres backup list --app task-helper-db
```

---

## Deployment Workflow

### 1. Make Changes Locally

```bash
# Test locally
cd backend && npm run dev
cd frontend && npm start
```

### 2. Commit to GitHub

```bash
git add .
git commit -m "Your changes"
git push
```

### 3. Deploy Backend

```bash
cd backend
fly deploy
```

### 4. Deploy Frontend

```bash
cd frontend
vercel --yes --prod
```

### 5. Update CORS (if frontend URL changes)

```bash
fly secrets set CORS_ORIGIN="https://new-frontend-url.vercel.app,http://localhost:4200" --app task-helper-api
```

---

## Troubleshooting

### Backend не відповідає

1. Перевірити статус машин:
   ```bash
   fly status --app task-helper-api
   ```

2. Запустити машину вручну:
   ```bash
   fly machine start <machine-id> --app task-helper-api
   ```

3. Перевірити логи:
   ```bash
   fly logs --app task-helper-api
   ```

### Database не доступна

1. Перевірити статус:
   ```bash
   fly status --app task-helper-db
   ```

2. Запустити базу:
   ```bash
   fly machine start <machine-id> --app task-helper-db
   ```

### CORS помилки

1. Перевірити поточний CORS_ORIGIN:
   ```bash
   fly secrets list --app task-helper-api
   ```

2. Оновити з новим URL:
   ```bash
   fly secrets set CORS_ORIGIN="https://frontend-url.vercel.app" --app task-helper-api
   ```

### Prisma міграції

```bash
# Застосувати схему до production
cd backend
DATABASE_URL="postgres://..." npx prisma db push
```

---

## Costs

### Fly.io

| Resource | Free Tier |
|----------|-----------|
| Shared CPU VMs | 3 VMs |
| Memory | Up to 256MB per VM |
| Storage | 3GB total |
| Bandwidth | Unlimited |

### Vercel

| Resource | Free Tier |
|----------|-----------|
| Deployments | Unlimited |
| Bandwidth | 100GB/month |
| Serverless Functions | 100GB-hours |

---

## Useful Commands

```bash
# Fly.io
fly auth login                    # Login
fly apps list                     # List apps
fly status --app <app>            # App status
fly logs --app <app>              # View logs
fly secrets list --app <app>      # List secrets
fly deploy                        # Deploy
fly ssh console --app <app>       # SSH access

# Vercel
vercel login                      # Login
vercel --yes --prod               # Deploy to production
vercel logs <url>                 # View logs

# GitHub CLI
gh auth login                     # Login
gh repo view --web                # Open repo in browser
```
