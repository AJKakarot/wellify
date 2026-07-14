# Wellify API Docs

Base URL during local development: `http://localhost:3000`

This document covers the application API exposed by the backend in `server/src/routes/`.

## Overview

- Content type for most endpoints: `application/json`
- Upload endpoints use `multipart/form-data`
- Auth-protected endpoints require a valid Better Auth session
- Uploaded files are served from `/uploads/*`
- Most successful responses use `success: true`
- Validation and server errors use `success: false`

## Authentication

Auth routes are mounted at:

- `ALL /api/auth/*`

These are provided by Better Auth via [auth.ts](/c:/health-tracker/server/src/lib/auth.ts), so the exact auth sub-routes are managed by that library rather than handwritten route files in this repo.

For app-owned protected endpoints, the backend checks the incoming session using request headers. In practice, frontend clients should send the Better Auth session cookie and/or the `Authorization` header used by their auth flow.

## Common Error Shape

Most errors return:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "errors": {
      "fieldName": ["Error message"]
    }
  }
}
```

Common codes:

- `UNAUTHORIZED`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `IMAGE_REQUIRED`
- `AUDIO_REQUIRED`
- `INVALID_FILE_TYPE`
- `INVALID_AUDIO_TYPE`
- `AI_SERVICE_ERROR`-style failures wrapped through the app error layer

## Health and Utility

### `GET /health`

Health check for the server.

Auth: not required

Response:

```json
{
  "status": "OK",
  "timestamp": "2026-03-22T00:00:00.000Z"
}
```

### `POST /api/test-queue`

Queues a sample text log job.

Auth: not required

Request body:

```json
{
  "text": "Had a protein shake after a workout"
}
```

Response:

```json
{
  "status": "queued",
  "message": "Job added to queue"
}
```

### `POST /api/test-ai`

Runs a lightweight embedding + AI response check.

Auth: not required

Request body:

```json
{
  "text": "Breakfast was oats and berries"
}
```

Response:

```json
{
  "status": "success",
  "vectorSize": 3072,
  "aiResponse": "Short summary text"
}
```

## Text Health Logs

### `POST /api/logs`

Creates a text health log and queues it for background processing.

Auth: required

Request body:

```json
{
  "content": "Had oatmeal for breakfast and felt good afterward"
}
```

Validation:

- `content`: required non-empty string

Behavior:

1. stores a `log_entry` row with `pending` status
2. enqueues a BullMQ job
3. worker generates embeddings, extracts facts, and updates the daily summary

Response:

```json
{
  "success": true,
  "id": "log-uuid",
  "status": "queued",
  "message": "Log saved and processing started"
}
```

## Chat

### `POST /api/chat`

Asks a grounded health/nutrition question using stored facts, daily summaries, and previous logs.

Auth: required

Request body:

```json
{
  "message": "What patterns are showing up in my meals this week?"
}
```

Validation:

- `message`: required non-empty string

Response:

```json
{
  "success": true,
  "answer": "Your protein has been strongest at breakfast...",
  "debug": {
    "factsUsed": 4,
    "logsUsed": 5,
    "hasSummary": true,
    "verification": "Enabled"
  }
}
```

## Food Logs

Food supports both photo-driven and manual entry.

### `POST /api/food`

Uploads a meal image for AI analysis.

Auth: required

Content type: `multipart/form-data`

Form fields:

- `image`: required file
- `mealType`: optional, one of `breakfast | lunch | dinner | snack`
- `notes`: optional string, max 500 chars

Accepted file types:

- `image/jpeg`
- `image/png`
- `image/webp`

File size limit:

- 10 MB

Behavior:

1. stores the image in `server/uploads/food`
2. creates a pending `food_log`
3. enqueues food analysis
4. worker updates nutrition totals, revision history, vector memory, and daily nutrition summary

Response:

```json
{
  "success": true,
  "id": "food-log-uuid",
  "status": "queued",
  "imageUrl": "/uploads/food/1711111111111-meal.jpg"
}
```

### `POST /api/food/manual`

Creates a completed meal without image analysis.

Auth: required

Request body:

```json
{
  "title": "Chicken rice bowl",
  "mealType": "lunch",
  "notes": "Homemade",
  "loggedAt": "2026-03-22T12:30:00.000Z",
  "detectedFoods": [
    {
      "name": "chicken breast",
      "estimatedPortion": "150g",
      "calories": 250,
      "protein": 35,
      "carbs": 0,
      "fat": 6,
      "confidence": null
    },
    {
      "name": "rice",
      "estimatedPortion": "1 cup",
      "calories": 270,
      "protein": 5,
      "carbs": 45,
      "fat": 2,
      "confidence": null
    }
  ],
  "totalCalories": 520,
  "totalProtein": 40,
  "totalCarbs": 45,
  "totalFat": 12
}
```

Validation:

- `title`: optional, max 120 chars
- `mealType`: optional enum
- `notes`: optional, max 500 chars
- `loggedAt`: optional date
- `detectedFoods`: required array with at least one item

Response:

```json
{
  "success": true,
  "data": {
    "id": "food-log-uuid",
    "userId": "user-uuid",
    "title": "Chicken rice bowl",
    "entryMode": "manual",
    "status": "completed"
  }
}
```

### `GET /api/food`

Lists all food logs for the authenticated user, newest first.

Auth: required

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "food-log-uuid",
      "entryMode": "photo",
      "mealType": "dinner",
      "status": "completed",
      "totalCalories": 640
    }
  ]
}
```

### `GET /api/food/:id`

Returns one food log.

Auth: required

Path params:

- `id`: food log id

Response:

```json
{
  "success": true,
  "data": {
    "id": "food-log-uuid",
    "entryMode": "hybrid",
    "detectedFoods": [],
    "correctedData": {},
    "status": "completed"
  }
}
```

### `GET /api/food/:id/history`

Returns revision history for a food log.

Auth: required

Path params:

- `id`: food log id

Revision types currently used:

- `ai_initial`
- `manual_initial`
- `user_edit`
- `reprocess` reserved for future use

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "revision-uuid",
      "foodLogId": "food-log-uuid",
      "revisionType": "ai_initial",
      "data": {
        "detectedFoods": [],
        "totalCalories": 600,
        "totalProtein": 30,
        "totalCarbs": 55,
        "totalFat": 20,
        "title": null,
        "mealType": "dinner",
        "notes": "Restaurant meal",
        "entryMode": "photo"
      },
      "createdAt": "2026-03-22T12:00:00.000Z"
    }
  ]
}
```

### `PATCH /api/food/:id`

Updates a food log. This is mainly used for user corrections after AI analysis.

Auth: required

Path params:

- `id`: food log id

Request body:

```json
{
  "title": "Updated meal title",
  "mealType": "dinner",
  "notes": "Adjusted after reviewing",
  "correctedData": {
    "detectedFoods": [
      {
        "name": "paneer curry",
        "estimatedPortion": "1 bowl",
        "calories": 420,
        "protein": 22,
        "carbs": 18,
        "fat": 28,
        "confidence": null
      }
    ],
    "totalCalories": 420,
    "totalProtein": 22,
    "totalCarbs": 18,
    "totalFat": 28,
    "notes": "User-corrected"
  }
}
```

Validation:

- `title`: optional, max 120 chars
- `mealType`: optional enum
- `notes`: optional, max 500 chars
- `correctedData`: optional object; if provided, `detectedFoods` must contain at least one item

Behavior:

- saves corrected values to the `food_log`
- creates a `user_edit` revision if `correctedData` is present
- switches `entryMode` from `photo` to `hybrid` when appropriate
- refreshes daily nutrition summary
- re-syncs vector memory when correction data is provided

Response:

```json
{
  "success": true,
  "data": {
    "id": "food-log-uuid",
    "entryMode": "hybrid",
    "userCorrected": true
  }
}
```

### `DELETE /api/food/:id`

Deletes a food log and its revision history.

Auth: required

Path params:

- `id`: food log id

Behavior:

- deletes DB row
- deletes related revisions
- deletes stored image file if present
- removes vector point
- refreshes daily nutrition summary

Response:

```json
{
  "success": true,
  "message": "Food log deleted"
}
```

## Voice Logs

Voice notes are converted into normal text `log_entry` records and then processed through the same log enrichment pipeline.

### `POST /api/voice-logs`

Uploads an audio note for transcription.

Auth: required

Content type: `multipart/form-data`

Form fields:

- `audio`: required file
- `durationSeconds`: optional positive integer, max `1800`

Accepted audio types:

- `audio/mpeg`
- `audio/mp4`
- `audio/wav`
- `audio/webm`
- `audio/ogg`

File size limit:

- 25 MB

Behavior:

1. stores the audio file in `server/uploads/voice`
2. creates a pending `voice_log`
3. enqueues a voice-processing job
4. worker transcribes audio
5. worker creates a normal `log_entry`
6. worker queues normal log enrichment

Response:

```json
{
  "success": true,
  "id": "voice-log-uuid",
  "status": "queued",
  "audioUrl": "/uploads/voice/1711111111111-note.webm"
}
```

### `GET /api/voice-logs`

Lists voice logs for the authenticated user.

Auth: required

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "voice-log-uuid",
      "status": "completed",
      "transcript": "Had coffee and skipped breakfast",
      "createdLogEntryId": "log-uuid"
    }
  ]
}
```

### `GET /api/voice-logs/:id`

Returns one voice log.

Auth: required

Path params:

- `id`: voice log id

Response:

```json
{
  "success": true,
  "data": {
    "id": "voice-log-uuid",
    "audioUrl": "/uploads/voice/1711111111111-note.webm",
    "status": "completed",
    "transcript": "Transcript text",
    "processingError": null
  }
}
```

## Goals and Nutrition

### `GET /api/goals`

Returns the current nutrition goal record for the authenticated user.

Auth: required

Response:

```json
{
  "success": true,
  "data": {
    "userId": "user-uuid",
    "dailyCalories": 2200,
    "dailyProtein": 140,
    "dailyCarbs": 220,
    "dailyFat": 70,
    "goalType": "maintain",
    "activityLevel": "moderate"
  }
}
```

### `PUT /api/goals`

Creates or updates nutrition goals.

Auth: required

Request body:

```json
{
  "dailyCalories": 2100,
  "dailyProtein": 150,
  "dailyCarbs": 200,
  "dailyFat": 65,
  "goalType": "lose",
  "activityLevel": "active"
}
```

Validation:

- `dailyCalories`: optional positive integer or `null`
- `dailyProtein`: optional non-negative number or `null`
- `dailyCarbs`: optional non-negative number or `null`
- `dailyFat`: optional non-negative number or `null`
- `goalType`: optional `lose | maintain | gain | null`
- `activityLevel`: optional `sedentary | light | moderate | active | very_active | null`

Response:

```json
{
  "success": true,
  "data": {
    "dailyCalories": 2100,
    "goalType": "lose",
    "activityLevel": "active"
  }
}
```

### `GET /api/goals/nutrition?period=day|week`

Returns nutrition summaries for the requested period.

Auth: required

Query params:

- `period`: `day` or `week`, default `day`

Response:

```json
{
  "success": true,
  "data": {
    "period": "week",
    "from": "2026-03-16",
    "to": "2026-03-22",
    "totals": {
      "totalCalories": 13200,
      "totalProtein": 910,
      "totalCarbs": 1400,
      "totalFat": 420,
      "breakfastCalories": 2500,
      "lunchCalories": 3500,
      "dinnerCalories": 5200,
      "snackCalories": 2000
    },
    "averagePerDay": {
      "calories": 1885.7,
      "protein": 130,
      "carbs": 200,
      "fat": 60
    },
    "goalTargets": {
      "calories": 2100,
      "protein": 150,
      "carbs": 200,
      "fat": 65
    },
    "summaries": []
  }
}
```

### `GET /api/goals/progress?days=30`

Returns nutrition progress points for charts.

Auth: required

Query params:

- `days`: integer `1..365`, default `30`

Response:

```json
{
  "success": true,
  "data": {
    "from": "2026-02-22",
    "to": "2026-03-22",
    "days": 30,
    "points": [
      {
        "date": "2026-03-22",
        "calories": 1900,
        "protein": 140,
        "carbs": 180,
        "fat": 70,
        "goalCalories": 2100,
        "goalProtein": 150,
        "goalCarbs": 200,
        "goalFat": 65
      }
    ]
  }
}
```

### `GET /api/goals/recommendations?days=14`

Returns suggested calorie and macro targets based on recent data.

Auth: required

Query params:

- `days`: integer `7..90`, default `14`

Response:

```json
{
  "success": true,
  "data": {
    "from": "2026-03-09",
    "to": "2026-03-22",
    "recommendation": {
      "suggestedCalories": 2050,
      "suggestedProtein": 145,
      "suggestedCarbs": 210,
      "suggestedFat": 62,
      "reasoning": [
        "Adjusted calories slightly below recent intake to support a weight-loss goal.",
        "Used the latest recorded weight (78.4 kg) to anchor protein guidance."
      ]
    }
  }
}
```

## Dashboard and Adherence

### `GET /api/dashboard/day`

Returns a one-day dashboard combining nutrition, hydration, exercise, and weight summary data.

Auth: required

Response:

```json
{
  "success": true,
  "data": {
    "period": "day",
    "from": "2026-03-22",
    "to": "2026-03-22",
    "goals": {
      "calories": 2100,
      "protein": 150,
      "carbs": 200,
      "fat": 65
    },
    "totals": {
      "calories": 1900,
      "protein": 145,
      "carbs": 185,
      "fat": 68,
      "waterMl": 2400,
      "exerciseMinutes": 35,
      "caloriesBurned": 300
    },
    "latestWeightKg": 78.4,
    "days": []
  }
}
```

### `GET /api/dashboard/week`

Returns a seven-day dashboard rollup.

Auth: required

Response shape is the same as `/api/dashboard/day`, but with `period: "week"` and 7 date entries in `days`.

### `GET /api/goals/adherence?days=7`

Returns adherence counts derived from nutrition and health summary tables.

Auth: required

Query params:

- `days`: integer `1..365`, default `7`

Current adherence rules:

- calorie goal hit: day calories `<= dailyCalories`
- protein goal hit: day protein `>= dailyProtein`
- hydration hit: water `>= 2000ml`
- exercise hit: exercise `>= 20 minutes`
- logging hit: at least one text log or completed food log that day

Response:

```json
{
  "success": true,
  "data": {
    "days": 7,
    "calorieGoalDaysHit": 5,
    "proteinGoalDaysHit": 4,
    "hydrationDaysHit": 6,
    "exerciseDaysHit": 3,
    "loggingDaysHit": 7,
    "summaryText": "4 of last 7 days hit protein goal, 6 met hydration, and 3 included exercise."
  }
}
```

## Weekly Insights

### `GET /api/insights/weekly`

Returns high-level weekly patterns derived from recent summary tables.

Auth: required

Response:

```json
{
  "success": true,
  "data": {
    "from": "2026-03-16",
    "to": "2026-03-22",
    "insights": [
      {
        "type": "protein",
        "title": "Protein is trending low",
        "message": "Average protein intake was 108g, below your 150g target.",
        "severity": "warning"
      },
      {
        "type": "calories",
        "title": "Dinner is carrying a lot of calories",
        "message": "4 of the last 7 days had 45% or more of calories at dinner.",
        "severity": "info"
      }
    ]
  }
}
```

Possible insight types:

- `protein`
- `hydration`
- `calories`
- `exercise`
- `logging`
- `weight`

## Water Logs

### `POST /api/water`

Creates a water log entry.

Auth: required

Request body:

```json
{
  "amountMl": 500,
  "loggedAt": "2026-03-22T09:00:00.000Z"
}
```

Validation:

- `amountMl`: positive integer, max `10000`
- `loggedAt`: optional date

Response:

```json
{
  "success": true,
  "data": {
    "id": "water-log-uuid",
    "amountMl": 500,
    "loggedAt": "2026-03-22T09:00:00.000Z"
  }
}
```

### `GET /api/water`

Lists water logs, newest first.

Auth: required

### `DELETE /api/water/:id`

Deletes a water log and refreshes daily health summary.

Auth: required

Path params:

- `id`: water log id

Response:

```json
{
  "success": true,
  "message": "Water log deleted"
}
```

## Exercise Logs

### `POST /api/exercise`

Creates an exercise log.

Auth: required

Request body:

```json
{
  "activityType": "Running",
  "durationMinutes": 30,
  "estimatedCaloriesBurned": 280,
  "notes": "Zone 2 cardio",
  "loggedAt": "2026-03-22T18:00:00.000Z"
}
```

Validation:

- `activityType`: required string, `1..120` chars
- `durationMinutes`: positive integer, max `1440`
- `estimatedCaloriesBurned`: optional non-negative integer or `null`
- `notes`: optional, max `500`
- `loggedAt`: optional date

Response:

```json
{
  "success": true,
  "data": {
    "id": "exercise-log-uuid",
    "activityType": "Running",
    "durationMinutes": 30
  }
}
```

### `GET /api/exercise`

Lists exercise logs, newest first.

Auth: required

### `DELETE /api/exercise/:id`

Deletes an exercise log and refreshes daily health summary.

Auth: required

Path params:

- `id`: exercise log id

Response:

```json
{
  "success": true,
  "message": "Exercise log deleted"
}
```

## Weight Logs

### `POST /api/weight`

Creates a weight log.

Auth: required

Request body:

```json
{
  "weightKg": 78.4,
  "notes": "Morning weight",
  "loggedAt": "2026-03-22T07:30:00.000Z"
}
```

Validation:

- `weightKg`: positive number, max `500`
- `notes`: optional, max `500`
- `loggedAt`: optional date

Response:

```json
{
  "success": true,
  "data": {
    "id": "weight-log-uuid",
    "weightKg": 78.4,
    "loggedAt": "2026-03-22T07:30:00.000Z"
  }
}
```

### `GET /api/weight`

Lists weight logs, newest first.

Auth: required

### `DELETE /api/weight/:id`

Deletes a weight log and refreshes daily health summary.

Auth: required

Path params:

- `id`: weight log id

Response:

```json
{
  "success": true,
  "message": "Weight log deleted"
}
```

## Static Upload URLs

These are served directly by Express:

- `/uploads/food/:filename`
- `/uploads/voice/:filename`

These are usually returned inside food and voice log records as `imageUrl` or `audioUrl`.

## Notes for Frontend Integration

- Use `multipart/form-data` for `/api/food` and `/api/voice-logs`
- Use `application/json` everywhere else
- Poll `GET /api/food/:id` after photo upload if you want to wait for AI processing to finish
- Poll `GET /api/voice-logs/:id` after audio upload if you want to wait for transcription to finish
- For manual food entry, use `/api/food/manual` directly and no polling is needed
- Dashboard and insights endpoints are read-only and are good candidates for homepage widgets

## Suggested Frontend Screen Mapping

- onboarding / auth: `Better Auth` routes under `/api/auth/*`
- home dashboard: `/api/dashboard/day`, `/api/dashboard/week`, `/api/insights/weekly`
- chat screen: `/api/chat`
- meal capture:
  - photo upload: `/api/food`
  - manual meal: `/api/food/manual`
  - meal details: `/api/food/:id`
  - meal history: `/api/food/:id/history`
- goals screen:
  - `/api/goals`
  - `/api/goals/nutrition`
  - `/api/goals/progress`
  - `/api/goals/adherence`
  - `/api/goals/recommendations`
- hydration: `/api/water`
- exercise: `/api/exercise`
- weight: `/api/weight`
- voice notes: `/api/voice-logs`
