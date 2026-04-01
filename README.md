# Xiaohuang Video Editor

AI-powered video analysis and editing pipeline. Upload short-form videos, analyze them (transcription, scene detection, OCR, audio analysis), and generate optimized edit plans.

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Next.js API Routes, BullMQ job queue
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: Redis + BullMQ
- **Media**: FFmpeg/FFprobe, OpenAI Whisper, Tesseract.js
- **Auth**: NextAuth v5 (Credentials provider)

## Setup

### Prerequisites

- Node.js 20+
- PostgreSQL
- Redis
- FFmpeg & FFprobe installed and in PATH (or set via env vars)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env` and fill in your values:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `REDIS_URL` | Yes | `redis://localhost:6379` | Redis connection string |
| `NEXTAUTH_SECRET` | Yes | — | Secret for JWT signing |
| `NEXTAUTH_URL` | Yes | — | App URL (e.g. `http://localhost:3002`) |
| `UPLOAD_DIR` | No | `./uploads` | Local file storage directory |
| `OPENAI_API_KEY` | No | — | OpenAI API key for Whisper transcription |
| `FFMPEG_PATH` | No | `ffmpeg` | Path to ffmpeg binary |
| `FFPROBE_PATH` | No | `ffprobe` | Path to ffprobe binary |

### Database Setup

```bash
npx prisma migrate dev
```

### Run

```bash
# Start Next.js dev server
npm run dev

# Start background worker (separate terminal)
npm run worker
```

## Architecture

```
src/
  app/              # Next.js App Router (pages + API routes)
  components/       # React components
  lib/              # Shared utilities (auth, db, queue, storage, media)
  server/           # Backend services, jobs, API helpers
  generated/        # Prisma generated client
prisma/             # Database schema + migrations
```

### Project Lifecycle

```
DRAFT → UPLOADED → ANALYZING → ANALYZED → PLANNING → PLANNED → RENDERING → RENDERED
                                                                              ↳ FAILED
```

1. **DRAFT**: Project created, no video yet
2. **UPLOADED**: Source video uploaded and validated
3. **ANALYZING**: Background worker running analysis pipeline
4. **ANALYZED**: Analysis complete (transcript, scenes, OCR, audio)
5. **PLANNING → RENDERED**: Future phases (edit planning, rendering)
