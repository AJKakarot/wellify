<div align="center">

# 🌿 Wellify

**AI-powered wellness tracking platform** — nutrition coaching, semantic health memory, and async media processing across web, mobile, and server.

[![Node](https://img.shields.io/badge/node-18%2B-2f6b57?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![Expo](https://img.shields.io/badge/Expo-53-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![Express](https://img.shields.io/badge/Express-5.2-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Qdrant](https://img.shields.io/badge/Qdrant-vector%20db-DC244C?style=flat-square)](https://qdrant.tech)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/license-MIT-2f6b57?style=flat-square)](#license)

</div>

---

## Table of Contents

- [Overview](#overview)
- [AI & RAG Pipeline](#-ai--rag-pipeline)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Data Model](#data-model)
- [Async Processing Pipeline](#async-processing-pipeline)
- [AI Integration](#ai-integration)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Shared Packages](#shared-packages)
- [Local Development](#local-development)
- [Environment Variables](#environment-variables)
- [Infrastructure](#infrastructure-docker-compose)
- [Disclaimer](#disclaimer)

---

## Overview

Wellify is a full-stack, AI-powered wellness tracking platform built as an **npm workspaces monorepo**. It combines:

- 🍽️ **Real-time nutrition coaching** — photo-based food logging with Gemini Vision
- 🧠 **Semantic memory** — vector embeddings of health facts and logs for grounded, context-aware chat
- 🎙️ **Voice logging** — audio transcription pipeline for hands-free entries
- ⚙️ **Async-first design** — all AI inference and vector sync runs off the request path via BullMQ workers

One codebase powers a **Next.js web app**, an **Expo mobile app**, and a shared **Express API**.

## 🧠 AI & RAG Pipeline

Wellify uses a **Retrieval-Augmented Generation (RAG)** architecture to provide personalized wellness insights.

- **Embeds** user health logs using `gemini-embedding-001`
- **Stores** semantic vectors in Qdrant
- **Retrieves** relevant health memories through vector similarity search
- **Augments** prompts with retrieved context
- **Generates** grounded responses using `gemini-2.5-flash`

<div align="center">
  <img src="./assets/rag-pipeline.svg" alt="RAG pipeline diagram" width="100%">
</div>

> See [AI Integration](#ai-integration) below for the full context-assembly flow, including recency weighting and score thresholds.

## Architecture

<div align="center">
  <img src="./assets/architecture.svg" alt="Wellify system architecture diagram" width="100%">
</div>

The system is organized into four layers:

1. **Client Layer** — Next.js 15 (web) and Expo 53 (mobile) consume the API through a shared, typed `api-client` package.
2. **Server Layer** — Express 5 handles routing, auth/validation middleware, business-logic services, and hands off heavy work to BullMQ workers.
3. **Data Layer** — PostgreSQL (source of truth via Drizzle ORM), Redis (queues + sessions), and Qdrant (vector search).
4. **AI Layer** — Google Gemini handles embeddings, chat, food-image analysis, and audio transcription.

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Web | Next.js 15, React 19 | SSR/SSG frontend with App Router |
| Mobile | Expo 53, React Native 0.79 | Cross-platform iOS/Android/Web |
| API | Express 5.2 | HTTP server, middleware pipeline |
| Auth | Better Auth 1.4 | Session-based authentication |
| Database | PostgreSQL 16, Drizzle ORM 0.45 | Relational data, typed migrations |
| Queue | Redis, BullMQ 5.67 | Job persistence, async processing |
| Vectors | Qdrant | Cosine similarity search on embeddings |
| AI | Gemini 2.5 Flash, Gemini Embedding 001 | Chat, vision, transcription, embeddings |
| Validation | Zod | Runtime schema validation |
| Security | Helmet, CORS | HTTP headers, origin control |
| Logging | Winston | Structured logging |

## Monorepo Structure

```
health-tracker/
├── apps/
│   ├── web/                    # Next.js 15 (App Router, React 19)
│   └── mobile/                 # Expo 53 (React Native 0.79)
├── packages/
│   ├── types/                  # Shared TypeScript interfaces & enums
│   ├── api-client/             # Typed fetch wrapper for all endpoints
│   └── design-tokens/          # Cross-platform colors, radii, spacing
├── server/
│   ├── src/
│   │   ├── config/             # Environment-based configuration
│   │   ├── db/                 # Drizzle schema + connection pool
│   │   ├── lib/                # Auth, Gemini, Qdrant, Redis, queues
│   │   ├── middleware/         # Auth, validation, upload, error handling
│   │   ├── routes/             # 11 route modules
│   │   ├── schemas/            # Zod request/response schemas
│   │   ├── services/           # 10 domain services
│   │   ├── workers/             # 3 BullMQ async processors
│   │   ├── types/               # Server-specific type extensions
│   │   └── utils/                # AppError hierarchy, logger, helpers
│   ├── drizzle/                 # Migration files (SQL)
│   ├── docker-compose.yml       # Postgres, Redis, Qdrant
│   └── drizzle.config.ts
├── tsconfig.base.json            # Shared compiler options
└── package.json                  # Workspace root
```

## Data Model

<details>
<summary><strong>PostgreSQL schema (Drizzle ORM)</strong> — click to expand</summary>

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    user      │     │   session    │     │    account       │
│──────────────│     │──────────────│     │──────────────────│
│ id (PK)      │────<│ userId (FK)  │     │ userId (FK)      │
│ name         │     │ token        │     │ provider         │
│ email        │     │ expiresAt    │     │ providerAccountId│
│ createdAt    │     └──────────────┘     └──────────────────┘
└──────┬───────┘
       │ 1:N
       ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  log_entry   │  │  food_log    │  │  voice_log   │  │  water_log   │
│──────────────│  │──────────────│  │──────────────│  │──────────────│
│ id           │  │ id           │  │ id           │  │ id           │
│ userId       │  │ userId       │  │ userId       │  │ userId       │
│ content      │  │ imagePath    │  │ audioPath    │  │ amountMl     │
│ status       │  │ status       │  │ transcript   │  │ loggedAt     │
│ processedAt  │  │ foods[]      │  │ status       │  └──────────────┘
└──────────────┘  │ calories     │  └──────────────┘
                  │ protein      │  ┌──────────────┐  ┌──────────────┐
                  │ carbs, fat   │  │ exercise_log │  │  weight_log  │
                  └──────┬───────┘  │──────────────│  │──────────────│
                         │          │ userId       │  │ userId       │
                         ▼          │ type         │  │ weightKg     │
               ┌──────────────────┐ │ durationMin  │  │ loggedAt     │
               │food_log_revision │ │ caloriesBurn │  └──────────────┘
               │──────────────────│ └──────────────┘
               │ foodLogId (FK)   │
               │ changedFields    │  ┌──────────────────────────┐
               │ previousValues   │  │ daily_nutrition_summary  │
               └──────────────────┘  │──────────────────────────│
                                     │ userId, date (unique)     │
┌──────────────┐                     │ totalCalories             │
│nutrition_goal│                     │ totalProtein/Carbs/Fat    │
│──────────────│                     │ mealBreakdown (JSONB)     │
│ userId (UK)  │                     └───────────────────────────┘
│ calories     │
│ protein      │                     ┌───────────────────────────┐
│ carbs, fat   │                     │  daily_health_summary     │
└──────────────┘                     │───────────────────────────│
                                     │ userId, date (unique)      │
                                     │ totalWaterMl                │
                                     │ totalExerciseMin             │
                                     │ totalCaloriesBurned           │
                                     │ latestWeightKg                 │
                                     └────────────────────────────────┘
```

</details>

**Vector collections (Qdrant):**

| Collection | Dimensions | Distance | Payload |
|---|---|---|---|
| `health_logs` | 3072 | Cosine | userId, timestamp, text |
| `user_facts` | 3072 | Cosine | userId, fact, source, extractedAt |
| `daily_summaries` | 3072 | Cosine | userId, date, summary |

## Async Processing Pipeline

All heavy processing (AI inference, embedding, vector sync) runs off the request path via BullMQ workers backed by Redis.

| Request | Queue | Worker steps |
|---|---|---|
| `POST /api/logs` | `log-processing` | embed text (Gemini) → extract facts (Gemini) → upsert vectors (Qdrant) → `status: completed` |
| `POST /api/food` | `food-processing` | analyze image (Gemini Vision) → update macros → create revision record → sync vectors → refresh daily summary |
| `POST /api/voice-logs` | `voice-processing` | transcribe audio (Gemini) → create `log_entry` from transcript → `status: completed` |

**Retry policy:** 3 attempts, exponential backoff starting at 1s. Jobs are auto-removed on completion.

## AI Integration

**Embedding pipeline** — text inputs (logs, facts, summaries) are embedded via `gemini-embedding-001` into 3072-dimensional vectors, stored in Qdrant with userId-scoped filtering.

**Chat context assembly:**

```
User question
     │
     ▼
Embed query (Gemini)
     │
     ▼
Search Qdrant (user_facts + health_logs + daily_summaries)
     │  filtered by userId, scored by cosine similarity
     │  weighted by recency (FACT_HALF_LIFE_DAYS)
     │  thresholded (FACT_SCORE_THRESHOLD), capped (FACT_LIMIT)
     ▼
Build system prompt with retrieved context
     │
     ▼
Gemini 2.5 Flash → grounded response
```

**Food analysis** — meal photos go to Gemini Vision, which returns structured JSON (detected foods, portions, per-item calories and macros). Persisted to `food_log` and rolled into `daily_nutrition_summary`.

**Fact extraction** — the log worker sends text entries to Gemini to extract atomic health facts (dietary patterns, symptoms, triggers, preferences), individually embedded into the `user_facts` collection — building a persistent semantic memory of the user's health profile.

## Authentication

Better Auth handles session-based auth:

1. All `/api/auth/*` routes are delegated to Better Auth.
2. Protected routes use a `requireAuth` middleware that validates the session token via Better Auth's API.
3. The authenticated user ID is attached to `req.userId` for downstream use.
4. Sessions are stored in PostgreSQL (`session` table).

## Error Handling

Custom `AppError` hierarchy with typed HTTP status codes:

| Error Class | Status | Code |
|---|---|---|
| `ValidationError` | 400 | `VALIDATION_ERROR` |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `ConflictError` | 409 | `CONFLICT` |
| `RateLimitError` | 429 | `RATE_LIMIT_EXCEEDED` |
| `AIServiceError` | 502 | `AI_SERVICE_ERROR` |
| `VectorServiceError` | 502 | `VECTOR_SERVICE_ERROR` |

All errors are caught by centralized error middleware and returned as:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": { "field": ["message"] }
  }
}
```

## Rate Limiting

| Endpoint Group | Limit |
|---|---|
| Chat | 10 req/min |
| Logs | 30 req/min |
| General | 100 req/min |

## Shared Packages

| Package | Description |
|---|---|
| `@health-tracker/types` | Core TypeScript interfaces (`FoodLog`, `VoiceLog`, `NutritionGoals`, `WeeklyInsight`, `GoalRecommendation`) and enums (`MealType`, `GoalType`, `ActivityLevel`) shared across all apps and the server. |
| `@health-tracker/api-client` | Typed fetch-based HTTP client with methods for every endpoint. Handles JSON and `FormData` (multipart uploads), includes credentials by default, and wraps responses in a generic `ApiResponse<T>` type. |
| `@health-tracker/design-tokens` | Cross-platform visual constants — color palette (`#2f6b57` accent, `#f6f3ea` background), border radii (22px cards, 30px hero), and module metadata. Consumed by both Next.js and React Native. |

## Local Development

### Prerequisites

- Node.js 18+
- Docker (for Postgres, Redis, Qdrant)
- Gemini API key

### Setup

```bash
# Start infrastructure
cd server && docker compose up -d

# Install all workspace dependencies
npm install

# Generate Drizzle migrations
npm run db:generate

# Start dev servers
npm run dev:server   # Express on :3000
npm run dev:web      # Next.js on :3001
npm run dev:mobile   # Expo
```

## Environment Variables

Create `server/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/health_tracker_db
BETTER_AUTH_SECRET=<random-secret>
BETTER_AUTH_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=<your-key>
CORS_ORIGINS=http://localhost:3001
FACT_HALF_LIFE_DAYS=45
FACT_SCORE_THRESHOLD=0.12
FACT_LIMIT=6
```

## Infrastructure (Docker Compose)

| Service | Image | Port | Volume |
|---|---|---|---|
| PostgreSQL | `postgres:16-alpine` | 5432 | `pgdata` |
| Redis | `redis:alpine` | 6379 | `redisdata` |
| Qdrant | `qdrant/qdrant` | 6333 | `qdrantdata` |

## Disclaimer

This is a coaching and tracking platform, **not** a medical diagnosis system. AI-generated nutritional estimates are approximate.

---

<div align="center">
<sub>Built with Next.js, Expo, Express, and Google Gemini</sub>
</div>
