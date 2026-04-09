# Google Drive Backup — Setup Guide

> Enable automatic backup of postcard media (photos/videos) to a Google Drive folder connected to the event organizer's account. Drive integration is completely decoupled from EventHub authentication — no Google Sign-In replaces JWT login.

---

## Overview

When enabled, every postcard media file uploaded to the corkboard is automatically backed up to the organizer's Google Drive in a folder called `EventHub Backups`. The backup happens asynchronously — it does not slow down the corkboard response.

**What's backed up:**
- Postcard images (JPEG, PNG, WebP)
- Postcard videos (MP4, WebM, MOV) + thumbnail

**What's NOT backed up:**
- Quiz questions, ranking data, event configuration
- Regular (non-postcard) uploads

---

## Architecture

| Component | Description |
|-----------|-------------|
| GCP project | `event-hub-492622` |
| OAuth scope | `drive.file` (app-created files only) |
| Token storage | Encrypted at rest (AES-256-GCM) using `DRIVE_ENCRYPTION_KEY` |
| Backup trigger | Async job queued on postcard creation |
| Idempotency | `postcard_id + media_hash` prevents duplicate uploads |
| Worker | In-process goroutine pool (MVP — lost on restart) |
| Feature gate | `ENABLE_GOOGLE_DRIVE_BACKUP` (backend) + `VITE_ENABLE_GOOGLE_DRIVE_BACKUP` (frontend) |

---

## Prerequisites

- GCP project `event-hub-492622` with OAuth consent screen configured
- OAuth 2.0 Client ID (Web app) with redirect URI set
- At least one test user added to the OAuth consent screen (for development)

---

## Step 1: GCP OAuth Setup

These are **manual steps** done in the Google Cloud Console. No CLI needed.

### 1.1 Configure OAuth Consent Screen

1. Go to [GCP Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Select **External** user type
3. Fill in app details:
   - App name: `EventHub`
   - Email: your contact email
4. Skip "Scopes" for now (we use `drive.file` programmatically)
5. Add test users: add your Gmail address and any other emails you'll use during development
6. Save

### 1.2 Create OAuth 2.0 Client ID

1. Go to [GCP Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `EventHub Drive` (or any name you prefer)
5. Authorized redirect URIs — add:
   - **Development (Docker):** `http://localhost:8081/api/admin/drive/callback`
   - **Production:** `https://your-domain.com/api/admin/drive/callback`
6. Click **Create**
7. Copy the **Client ID** and **Client Secret** — you'll need them for the env vars

### 1.3 Enable the Drive API

1. Go to [GCP Console → APIs & Services → Library](https://console.cloud.google.com/apis/library)
2. Search for "Google Drive API"
3. Click **Enable**

---

## Step 2: Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### Backend (`.env` or docker-compose environment)

| Variable | Default | Description |
|----------|---------|-------------|
| `ENABLE_GOOGLE_DRIVE_BACKUP` | `false` | Master switch for the feature |
| `GOOGLE_CLIENT_ID` | — | OAuth Client ID from GCP (格式: `xxx.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | — | OAuth Client Secret from GCP |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8081/api/admin/drive/callback` | Must match GCP credential |
| `DRIVE_ENCRYPTION_KEY` | — | 32-byte key for AES-256-GCM token encryption |

**Generate DRIVE_ENCRYPTION_KEY:**
```bash
openssl rand -32 | base64
```

> **Security:** Never commit real encryption keys to version control. Use Docker secrets, Vault, or your cloud provider's secret manager in production.

### Frontend (`.env` or docker-compose build args)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_GOOGLE_DRIVE_BACKUP` | `false` | Shows/hides Drive panel in admin settings |

### Docker Compose (production deployment)

```bash
# Enable Drive backup globally
export VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true
export ENABLE_GOOGLE_DRIVE_BACKUP=true
export GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
export GOOGLE_CLIENT_SECRET=your-client-secret
export DRIVE_ENCRYPTION_KEY=$(openssl rand -32 | base64)

# Rebuild and deploy
docker-compose up --build -d
```

Or via `.env` file:
```env
VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true
ENABLE_GOOGLE_DRIVE_BACKUP=true
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
DRIVE_ENCRYPTION_KEY=your-32-byte-base64-key
```

---

## Step 3: Database Migration

The migration `011_google_drive_backup.up.sql` creates the required tables. It runs automatically on server startup via `migrations.Run()`.

To apply manually:
```bash
psql $DATABASE_URL -f backend/migrations/011_google_drive_backup.up.sql
```

To rollback:
```bash
psql $DATABASE_URL -f backend/migrations/011_google_drive_backup.down.sql
```

---

## Step 4: Local Development Setup

### Quick Start (with existing GCP credentials)

1. Copy env vars to `.env`:
```bash
ENABLE_GOOGLE_DRIVE_BACKUP=true
GOOGLE_CLIENT_ID=your-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-secret
DRIVE_ENCRYPTION_KEY=$(openssl rand -32 | base64)
VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true
```

2. Start the app:
```bash
docker-compose up --build
```

3. Navigate to an event admin settings page — the Drive panel should appear.

### First-Time GCP Setup (fresh credentials)

1. **GCP Console → OAuth consent screen** → create External app, add test users
2. **GCP Console → Credentials** → create Web app OAuth client ID, add redirect URI `http://localhost:8081/api/admin/drive/callback`
3. Enable Google Drive API
4. Fill in `.env` with the client ID/secret
5. Generate `DRIVE_ENCRYPTION_KEY`
6. `docker-compose up --build`

---

## OAuth Flow

```
[Admin: Connect Drive] → GET /api/admin/drive/auth-url
                               ↓
                    [Frontend: redirect to Google]
                               ↓
                    [Google consent screen]
                               ↓
                    [GET /api/admin/drive/callback?code=...]
                               ↓
                    [Backend: exchange code → tokens]
                               ↓
                    [Encrypt → store in drive_connections]
                               ↓
                    [Frontend: redirect to admin with success]
```

The `state` parameter uses HMAC-SHA256 to prevent CSRF attacks. Tokens are encrypted with AES-256-GCM before storage.

---

## Admin Panel UI

The Drive panel appears in **Event Settings** (`/e/:slug/admin/settings`) when `VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true`.

**Sections:**
1. **Connection status** — Shows connected/disconnected state with timestamp
2. **Connect / Disconnect button** — Initiates OAuth flow or revokes token
3. **Backup jobs list** — Shows status of all postcard backups (queued → synced / failed)
4. **Retry button** — Re-queues failed jobs (up to 3 automatic retries with exponential backoff)

**Statuses:**
| Status | Meaning |
|--------|---------|
| `queued` | Waiting for worker to pick up |
| `in_progress` | Currently uploading to Drive |
| `synced` | Successfully backed up to Drive |
| `failed` | All retries exhausted — click Retry |

---

## Demo Checklist

Before running a public demo with Drive backup:

- [ ] OAuth consent screen has test users configured
- [ ] OAuth Client ID redirect URI matches `GOOGLE_REDIRECT_URI`
- [ ] `DRIVE_ENCRYPTION_KEY` is set (not empty)
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- [ ] `ENABLE_GOOGLE_DRIVE_BACKUP=true` in backend environment
- [ ] `VITE_ENABLE_GOOGLE_DRIVE_BACKUP=true` in frontend build
- [ ] Migration `011` has been applied (runs automatically on startup)
- [ ] Connect Drive from admin settings (need a real Google account)
- [ ] Create a test postcard with an image
- [ ] Verify the image appears in Google Drive `EventHub Backups` folder

---

## Troubleshooting

### "Google Drive backup is not enabled" (403 on API calls)
- Backend `ENABLE_GOOGLE_DRIVE_BACKUP` is not set to `true`
- Or the backend was not rebuilt with the env var

### "Invalid state" error on OAuth callback
- `DRIVE_STATE_SECRET` or `JWT_SECRET` changed between auth URL generation and callback
- The state token expired (>10 minutes between connect click and Google redirect)

### "Failed to ping test database" in backend logs (test failures)
- Repository tests require a live PostgreSQL connection — this is expected in CI without a DB
- Not a production issue — these are unit tests with `t.Skipf` when DB is unavailable

### Postcards not being backed up
- Verify `ENABLE_GOOGLE_DRIVE_BACKUP=true` in backend env
- Check `backup_jobs` table for failed jobs and error messages
- Verify the organizer's Drive connection is still valid (`connected_at` in `drive_connections`)
- Worker uses in-memory queue — jobs are lost on server restart

### Duplicate files in Drive
- This should not happen — idempotency key is `postcard_id + media_hash`
- If it does, check if the same postcard was retried after a partial upload

---

## Security Notes

- Refresh tokens are encrypted at rest — never stored in plaintext
- Tokens are never returned to the frontend — only connection state is exposed
- All Drive admin endpoints require JWT authentication (Bearer token)
- Disconnecting revokes the OAuth token at Google (best-effort)
- The `state` parameter is HMAC-signed to prevent CSRF

---

## Disabling the Feature

To disable Drive backup without removing the code:

1. Set `ENABLE_GOOGLE_DRIVE_BACKUP=false` in backend env
2. Set `VITE_ENABLE_GOOGLE_DRIVE_BACKUP=false` in frontend build
3. Rebuild: `docker-compose up --build -d`

The Drive panel disappears from admin settings. Existing backup jobs in `drive_jobs` table remain but won't be processed. Existing files in Google Drive are NOT deleted.
