# Xiaohuang Video Editor - Comprehensive Codebase Overview

## PROJECT SUMMARY

This is a Next.js 16 + TypeScript full-stack application for AI-powered video editing.
Built with PostgreSQL, Redis, BullMQ, and OpenAI API integration.

## TECH STACK

Frontend: React 19, Next.js 16, TypeScript, Tailwind CSS 4, Zustand 5, Zundo, React Query
Backend: Node.js, PostgreSQL (Prisma ORM), Redis, BullMQ, NextAuth.js 5
Media: FFmpeg, Tesseract.js (OCR), wavesurfer.js
AI: OpenAI SDK
Testing: Vitest, ESLint, Prettier
Monitoring: Prometheus

## DIRECTORY STRUCTURE

src/app/          - Next.js App Router (pages & API routes)
src/components/   - React components (auth, editor, layout, upload)
src/lib/          - Utilities (AI, media analyzers, storage, validators)
src/server/       - Backend services & job handlers
src/stores/       - Zustand state management
src/types/        - TypeScript definitions
src/tests/        - Test suites
prisma/           - Database schema & migrations
public/           - Static assets
scripts/          - Utility scripts

## CORE FEATURES

1. User Authentication (NextAuth + email/password)
2. Project Management Dashboard
3. Video Upload with Metadata Extraction
4. Multi-Stage Video Analysis:
   - Scene Detection
   - OCR Text Extraction
   - Speech Transcription
   - Audio Analysis
   - AI-Generated Insights
   - Risk Scoring (watermark, audio reuse, transformation)
5. AI-Powered Edit Plan Generation
6. Multi-Track Timeline Video Editor
7. Video Rendering with FFmpeg
8. Background Job Processing (BullMQ)
9. User Settings & API Key Management

## DATABASE MODELS

User - Authentication & settings
Project - Video project metadata
MediaAsset - Uploaded/generated video files
AnalysisReport - Multi-stage analysis results
RiskReport - Content risk assessment
EditPlan - AI-generated editing suggestions
RenderJob - Video rendering jobs
BackgroundJob - Job queue tracking
EditorState - Multi-track editor state

## JOB QUEUE SYSTEM

Three parallel queues (Analysis, Planning, Render) using BullMQ + Redis
Analysis: Multi-stage content analysis with progress tracking
Planning: Edit plan generation from analysis
Render: FFmpeg video rendering

## APP ROUTES

Public:
  GET / → Redirect to /dashboard
  GET /api/health → Health check

Auth:
  GET /login, /register
  POST /api/auth/[...nextauth]
  POST /api/auth/register

Protected:
  GET /dashboard → Project overview
  GET /dashboard/projects/[id] → Project details
  GET /dashboard/settings → User settings
  GET /projects/[id]/upload → Video upload
  GET /projects/[id]/analysis → Analysis results
  GET /projects/[id]/plan → Edit plan viewer
  GET /projects/[id]/render → Render configuration
  GET /projects/[id]/editor → Multi-track editor

API Endpoints:
  /api/projects - Project CRUD
  /api/projects/[id]/upload - Video upload
  /api/projects/[id]/analyze - Queue analysis
  /api/projects/[id]/analysis - Get analysis
  /api/projects/[id]/plan - Get/generate plan
  /api/projects/[id]/render - Queue/get render
  /api/projects/[id]/editor - Get/save editor state
  /api/user/settings - User preferences
  /api/user/storage - Storage usage
  /api/health - Health check
  /api/metrics - Prometheus metrics

## STATE MANAGEMENT

Frontend (Zustand + Zundo):
- Editor store with tracks, trackItems, markers
- Serialized state (undoable): tracks, items, markers, playhead, duration
- UI state (not undoable): selection, clipboard, panels, playback, zoom
- Zundo temporal middleware for undo/redo

Backend:
- PostgreSQL for persistent data
- Redis for job queue state

## ENVIRONMENT VARIABLES

DATABASE_URL - PostgreSQL connection
REDIS_URL - Redis connection
NEXTAUTH_SECRET - NextAuth secret key
NEXTAUTH_URL - App URL
UPLOAD_DIR - Local storage directory
OPENAI_API_KEY - OpenAI API key (optional)
AI_BASE_URL - Custom AI API endpoint (optional)
AI_API_KEY - Custom AI API key (optional)
FFMPEG_PATH - FFmpeg binary path
FFPROBE_PATH - FFprobe binary path
WORKER_ANALYSIS_CONCURRENCY - Parallel analysis jobs (1-10)
WORKER_PLANNING_CONCURRENCY - Parallel planning jobs (1-10)
WORKER_RENDER_CONCURRENCY - Parallel render jobs (1-4)
DISK_QUOTA_BYTES - User storage quota (5GB default)
STORAGE_PROVIDER - Storage provider: local or s3

## DEVELOPMENT COMMANDS

npm run dev - Start dev server (port 3000)
npm run build - Build for production
npm start - Start production server
npm run worker - Start background job worker
npm test - Run tests once
npm run test:watch - Run tests in watch mode
npm run test:coverage - Run tests with coverage
npm run lint - Run ESLint

## PROJECT WORKFLOW

Draft → Upload → Analyzing → Analyzed → Planning → Planned → Rendering → Rendered
(At any stage, on failure: → Failed)

## KEY SERVICES

ProjectService - Project CRUD and status management
AnalysisService - Persist and retrieve analysis results
PlanningService - Generate and retrieve edit plans
RenderService - Manage render jobs
RiskService - Generate risk assessments
BackgroundJobService - Track job progress and status

## CI/CD

GitHub Actions workflow triggered on push/PR to main/master
Services: PostgreSQL 16, Redis 7
Steps: checkout, setup Node 20, install, type check, lint, generate Prisma, test

## NOTABLE PATTERNS

- NextAuth Prisma adapter for session persistence
- Storage factory pattern for local/S3 abstraction
- Zod schemas for runtime API validation
- BullMQ with graceful shutdown
- Non-fatal AI analysis failures (don't block job)
- Per-step progress tracking in jobs
- Prometheus metrics for monitoring
- Full TypeScript strict mode

## EXTERNAL INTEGRATIONS

OpenAI API - Whisper (transcription), GPT-4 (analysis)
FFmpeg - Video processing
Tesseract.js - OCR
wavesurfer.js - Audio visualization
NextAuth.js - Authentication
Prisma - Database ORM
BullMQ - Job queue
React Query - Client-side caching

