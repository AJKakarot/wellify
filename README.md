# Wellify

AI-powered wellness tracking platform — nutrition coaching, semantic health memory, and voice logging, built as an npm workspaces monorepo (Next.js web + Expo mobile + Express API).

## Architecture

<div align="center">
  <img src="./assets/architecture-dark.svg" alt="Wellify architecture and RAG memory loop diagram" width="100%">
</div>

## Tech Stack

| Layer | Technology |
|---|---|
| Web | Next.js 15, React 19 |
| Mobile | Expo 53, React Native 0.79 |
| API | Express 5.2 |
| Auth | Better Auth 1.4 |
| Database | PostgreSQL 16, Drizzle ORM |
| Queue | Redis, BullMQ |
| Vectors | Qdrant |
| AI | Gemini 2.5 Flash, Gemini Embedding 001 |

## How It Works

1. **Log** — user submits a food photo, voice note, or text log from web/mobile.
2. **Queue** — the API saves the entry as `pending` and pushes a job to BullMQ.
3. **Process** — a worker calls Gemini (vision/transcription/embeddings) off the request path.
4. **Store** — results land in PostgreSQL, and vectors sync to Qdrant for semantic search.
5. **Chat** — future questions are embedded, matched against stored vectors, and used to ground Gemini's response.

## RAG Pipeline (Semantic Memory)

Wellify doesn't just store logs — it remembers them semantically, so the AI coach can answer questions grounded in a user's actual history instead of generic advice.

- **Ingest** — every food/voice/text log is sent to `gemini-embedding-001`, producing a 3072-dimensional vector.
- **Persist** — vectors are upserted into Qdrant (`health_logs`, `user_facts`, `daily_summaries`), scoped by `userId`.
- **Extract facts** — a background worker also pulls out atomic health facts (symptoms, triggers, preferences) from each log and embeds them separately, building a long-term profile over time.
- **Retrieve** — when the user asks something in chat, the query is embedded and matched against all three collections via cosine similarity, weighted by recency (`FACT_HALF_LIFE_DAYS`) and filtered by a minimum score (`FACT_SCORE_THRESHOLD`), capped at `FACT_LIMIT` results.
- **Augment + generate** — the retrieved context is folded into the system prompt, and `gemini-2.5-flash` produces a response grounded in the user's real logs — not a hallucinated guess.

This is what lets Wellify say things like *"you've mentioned trouble sleeping after late dinners twice this week"* instead of generic wellness tips.

## Local Development

```bash
# Start infrastructure (Postgres, Redis, Qdrant)
cd server && docker compose up -d

# Install dependencies
npm install

# Run migrations
npm run db:generate

# Start dev servers
npm run dev:server   # Express on :3000
npm run dev:web      # Next.js on :3001
npm run dev:mobile   # Expo
```

### Environment Variables (`server/.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/health_tracker_db
BETTER_AUTH_SECRET=<random-secret>
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=<your-key>
CORS_ORIGINS=http://localhost:3001
```

## Disclaimer

This is a coaching and tracking platform, not a medical diagnosis system. AI-generated nutritional estimates are approximate.
