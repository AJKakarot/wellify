# Wellify

A full-stack, AI-powered wellness tracking platform built as an npm workspaces monorepo. Combines real-time nutrition coaching, semantic memory via vector embeddings, and asynchronous media processing across web, mobile, and server targets.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐   │
│  │  Next.js 15  │  │   Expo 53    │  │   @wellify/*            │   │
│  │  (App Router)│  │ React Native │  │   shared packages       │   │
│  │  apps/web    │  │ apps/mobile  │  │   types, api-client,    │   │
│  │              │  │              │  │   design-tokens         │   │
│  └──────┬───────┘  └──────┬───────┘  └─────────────────────────┘   │
│         │                 │                                        │
└─────────┼─────────────────┼────────────────────────────────────────┘
          │   HTTP/REST     │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Server Layer (Express 5)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────────┐  ┌─────────────┐   │
│  │  Routes  │  │ Middleware │  │   Services   │  │   Workers   │   │
│  │  (11)    │→ │ auth,zod,  │ →│  business    │  │  BullMQ     │   │
│  │          │  │ upload,err │  │  logic (10)  │  │  async (3)  │   │
│  └──────────┘  └────────────┘  └──────┬───────┘  └──────┬──────┘   │
│                                       │                  │         │
└───────────────────────────────────────┼──────────────────┼─────────┘
                                        │                  │
┌───────────────────────────────────────┼──────────────────┼─────────┐
│                        Data Layer     │                  │         │
│  ┌──────────────┐  ┌──────────────┐  │  ┌────────────┐  │         │
│  │ PostgreSQL 16│  │    Redis     │  │  │   Qdrant   │  │         │
│  │ Drizzle ORM  │  │   BullMQ     │  │  │  vectors   │  │         │
│  │ primary store│  │   sessions   │  │  │  3072-dim  │  │         │
│  └──────────────┘  └──────────────┘  │  └────────────┘  │         │
│                                       │                  │         │
└───────────────────────────────────────┼──────────────────┼─────────┘
                                        │                  │
┌───────────────────────────────────────┼──────────────────┼─────────┐
│                        AI Layer       │                  │         │
│  ┌───────────────────────────────────┴──────────────────┴──────┐   │
│  │                   Google Gemini                             │   │
│  │  gemini-embedding-001 (embeddings)                          │   │
│  │  gemini-2.5-flash (chat, food analysis, transcription,      │   │
│  │                     fact extraction)                        │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

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
│   │   ├── workers/            # 3 BullMQ async processors
│   │   ├── types/              # Server-specific type extensions
│   │   └── utils/              # AppError hierarchy, logger, helpers
│   ├── drizzle/                # Migration files (SQL)
│   ├── docker-compose.yml      # Postgres, Redis, Qdrant
│   └── drizzle.config.ts
├── tsconfig.base.json          # Shared compiler options
└── package.json                # Workspace root
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
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

## Data Model

### PostgreSQL Schema (Drizzle ORM)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│    user       │     │   session    │     │    account       │
│──────────────│     │──────────────│     │──────────────────│
│ id (PK)      │────<│ userId (FK)  │     │ userId (FK)      │
│ name         │     │ token        │     │ provider         │
│ email        │     │ expiresAt    │     │ providerAccountId│
│ createdAt    │     └──────────────┘     └──────────────────┘
└──────┬───────┘
       │
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
               │ foodLogId (FK)  │
               │ changedFields   │  ┌──────────────────────────┐
               │ previousValues  │  │ daily_nutrition_summary  │
               └─────────────────┘  │──────────────────────────│
                                    │ userId, date (unique)    │
┌──────────────┐                    │ totalCalories            │
│nutrition_goal│                    │ totalProtein/Carbs/Fat   │
│──────────────│                    │ mealBreakdown (JSONB)    │
│ userId (UK)  │                    └──────────────────────────┘
│ calories     │
│ protein      │                    ┌──────────────────────────┐
│ carbs, fat   │                    │  daily_health_summary    │
└──────────────┘                    │──────────────────────────│
                                    │ userId, date (unique)    │
                                    │ totalWaterMl             │
                                    │ totalExerciseMin         │
                                    │ totalCaloriesBurned      │
                                    │ latestWeightKg           │
                                    └──────────────────────────┘
```

### Vector Collections (Qdrant)

| Collection | Dimensions | Distance | Payload |
|-----------|-----------|----------|---------|
| `health_logs` | 3072 | Cosine | userId, timestamp, text |
| `user_facts` | 3072 | Cosine | userId, fact, source, extractedAt |
| `daily_summaries` | 3072 | Cosine | userId, date, summary |

## Async Processing Pipeline

All heavy processing (AI inference, embedding, vector sync) runs off the request path via BullMQ workers backed by Redis.

```
Request                    Queue                     Worker
───────                    ─────                     ──────

POST /api/logs ──────────→ log-processing ─────────→ Log Worker
  store log_entry                                     ├─ embed text (Gemini)
  status: "pending"                                   ├─ extract facts (Gemini)
                                                      ├─ upsert vectors (Qdrant)
                                                      └─ status: "completed"

POST /api/food ──────────→ food-processing ────────→ Food Worker
  store food_log                                      ├─ analyze image (Gemini Vision)
  save image to disk                                  ├─ update food_log with macros
  status: "pending"                                   ├─ create revision record
                                                      ├─ sync vectors (Qdrant)
                                                      └─ refresh daily_nutrition_summary

POST /api/voice-logs ────→ voice-processing ───────→ Voice Worker
  store voice_log                                     ├─ transcribe audio (Gemini)
  save audio to disk                                  ├─ create log_entry from transcript
  status: "pending"                                   └─ status: "completed"
```

**Retry policy:** 3 attempts, exponential backoff starting at 1s. Jobs auto-removed on completion.

## AI Integration

### Embedding Pipeline

Text inputs (logs, facts, summaries) are embedded via `gemini-embedding-001` into 3072-dimensional vectors, stored in Qdrant with userId-scoped filtering. This enables semantic retrieval for the chat endpoint — the system finds the most relevant health context before generating a response.

### Chat Context Assembly

```
User question
     │
     ▼
  Embed query (Gemini)
     │
     ▼
  Search Qdrant (user_facts + health_logs + daily_summaries)
     │   filtered by userId, scored by cosine similarity
     │   weighted by recency (configurable half-life: FACT_HALF_LIFE_DAYS)
     │   thresholded (FACT_SCORE_THRESHOLD) and capped (FACT_LIMIT)
     │
     ▼
  Build system prompt with retrieved context
     │
     ▼
  Gemini 2.5 Flash → grounded response
```

### Food Analysis

Meal photos are sent to Gemini Vision, which returns structured JSON: detected foods, estimated portions, per-item calories and macronutrients (protein, carbs, fat). Results are persisted to `food_log` and rolled into `daily_nutrition_summary`.

### Fact Extraction

The log worker sends text entries to Gemini with instructions to extract atomic health facts (dietary patterns, symptoms, triggers, preferences). These facts are individually embedded and stored in the `user_facts` Qdrant collection, building a persistent semantic memory of the user's health profile.

## Authentication

Better Auth handles session-based auth with the following flow:

1. All `/api/auth/*` routes are delegated to Better Auth
2. Protected routes use `requireAuth` middleware that validates the session token via Better Auth's API
3. The authenticated user ID is attached to `req.userId` for downstream use
4. Sessions are stored in PostgreSQL (`session` table)

## Error Handling

Custom `AppError` hierarchy with typed HTTP status codes:

| Error Class | Status | Code |
|------------|--------|------|
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
|---------------|-------|
| Chat | 10 req/min |
| Logs | 30 req/min |
| General | 100 req/min |

## Shared Packages

### `@health-tracker/types`

Core TypeScript interfaces (`FoodLog`, `VoiceLog`, `NutritionGoals`, `WeeklyInsight`, `GoalRecommendation`) and enums (`MealType`, `GoalType`, `ActivityLevel`) shared across all apps and the server.

### `@health-tracker/api-client`

Typed fetch-based HTTP client with methods for every endpoint. Handles JSON and `FormData` (multipart uploads), includes credentials by default, and wraps all responses in a generic `ApiResponse<T>` type.

### `@health-tracker/design-tokens`

Cross-platform visual constants: color palette (`#2f6b57` accent, `#f6f3ea` background), border radii (22px cards, 30px hero), and module metadata. Consumed by both Next.js and React Native.

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

### Environment Variables

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
|---------|-------|------|--------|
| PostgreSQL | postgres:16-alpine | 5432 | `pgdata` |
| Redis | redis:alpine | 6379 | `redisdata` |
| Qdrant | qdrant/qdrant | 6333 | `qdrantdata` |

## Disclaimer

This is a coaching and tracking platform, not a medical diagnosis system. AI-generated nutritional estimates are approximate.
