# Webhook-Driven Task Processing Pipeline

A backend service inspired by a simplified Zapier-style workflow system.  
It accepts incoming webhooks, stores them as jobs, processes them asynchronously through a queue, and delivers the processed payload to subscribed endpoints with retry logic and delivery tracking.

---

## Features

- Pipeline management with CRUD APIs
- Webhook ingestion by `webhookKey`
- Optional webhook secret verification
- Background job processing with BullMQ
- Redis-backed queue
- PostgreSQL database with Prisma ORM
- Delivery to active subscribers only
- Retry logic for failed deliveries
- Delivery attempt tracking
- Health and readiness endpoints
- Filtering for jobs, subscribers, and delivery attempts
- Clear `404 Not Found` and `409 Conflict` error handling in key APIs

---

## Tech Stack

- NestJS
- PostgreSQL
- Prisma
- Redis
- BullMQ
- Docker Compose
- pnpm
- Postman for API testing

---

## Architecture Overview

The main request flow is:

1. A webhook is sent to `POST /webhooks/:webhookKey`
2. The system finds the matching pipeline
3. If the pipeline has a secret, it validates the `x-webhook-secret` header
4. A job is stored in the database with status `PENDING`
5. The job is added to the `webhook-processing` queue
6. A worker picks up the job in the background
7. The configured action is applied to the payload
8. The processed payload is sent to all active subscribers
9. Each delivery attempt is stored in the database
10. Failed deliveries are retried up to 3 times
11. The final job status becomes:
   - `COMPLETED` if all active subscriber deliveries succeed
   - `FAILED` if one or more deliveries still fail after retries

---

## Supported Processing Actions

### `ADD_TIMESTAMP`

Adds a timestamp field to the payload.

**Example input:**

```json
{
  "message": "hello from webhook",
  "customerName": "mahmoud",
  "orderId": 123
}
```

**Example output:**

```json
{
  "message": "hello from webhook",
  "customerName": "mahmoud",
  "orderId": 123,
  "timestamp": "2026-03-18T14:58:13.401Z"
}
```

### `UPPERCASE_TEXT`

Uppercases a specific field defined in `actionConfig.field`.

**Example config:**

```json
{
  "field": "message"
}
```

**Example output:**

```json
{
  "message": "HELLO FROM WEBHOOK",
  "customerName": "mahmoud",
  "orderId": 123
}
```

### `EXTRACT_FIELD`

Returns only the selected field in a new object.

**Example config:**

```json
{
  "field": "customerName"
}
```

**Example output:**

```json
{
  "extractedField": "mahmoud"
}
```

---

## Project Structure

```bash
src/
  delivery-attempts/
  health/
  jobs/
  pipelines/
  prisma/
  subscribers/
  webhooks/
  app.module.ts
  main.ts

prisma/
  migrations/
  schema.prisma
```

---

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/webhook_pipeline?schema=public&sslmode=disable"
REDIS_HOST="127.0.0.1"
REDIS_PORT="6379"
PORT=3000
```

---

## Running Infrastructure

Start PostgreSQL and Redis:

```bash
docker compose up -d
```

Stop Redis for readiness testing:

```bash
docker compose stop redis
```

Start Redis again:

```bash
docker compose start redis
```

---

## Installation

```bash
pnpm install
```

---

## Prisma Setup

Generate Prisma client:

```bash
pnpm prisma generate
```

Run migrations:

```bash
pnpm prisma migrate dev
```

Reset the database if needed:

```bash
pnpm prisma migrate reset
```

---

## Running the App

Development mode:

```bash
pnpm run start:dev
```

Build:

```bash
pnpm run build
```

Production mode:

```bash
pnpm run start:prod
```

---

## Available Scripts

```bash
pnpm run build
pnpm run format
pnpm run start
pnpm run start:dev
pnpm run start:debug
pnpm run start:prod
pnpm run lint
pnpm run test
pnpm run test:watch
pnpm run test:cov
pnpm run test:e2e
```

---

## Main API Endpoints

### Pipelines

- `POST /pipelines`
- `GET /pipelines`
- `GET /pipelines/:id`
- `PATCH /pipelines/:id`
- `DELETE /pipelines/:id`

### Webhooks

- `POST /webhooks/:webhookKey`

### Jobs

- `GET /jobs`
- `GET /jobs/:id`
- `GET /jobs/:id/delivery-attempts`

**Supported filters:**

- `GET /jobs?status=FAILED`
- `GET /jobs?pipelineId=<pipelineId>`
- `GET /jobs?status=COMPLETED&pipelineId=<pipelineId>`

### Subscribers

- `POST /subscribers`
- `GET /subscribers`
- `GET /subscribers/:id`
- `PATCH /subscribers/:id`
- `DELETE /subscribers/:id`

**Supported filters:**

- `GET /subscribers?pipelineId=<pipelineId>`
- `GET /subscribers?active=true`
- `GET /subscribers?pipelineId=<pipelineId>&active=false`

### Delivery Attempts

- `GET /delivery-attempts`
- `GET /delivery-attempts/:id`

**Supported filters:**

- `GET /delivery-attempts?jobId=<jobId>`
- `GET /delivery-attempts?subscriberId=<subscriberId>`
- `GET /delivery-attempts?status=FAILED`
- `GET /delivery-attempts?jobId=<jobId>&status=FAILED`

### Health

- `GET /health`
- `GET /health/ready`

---

## Example Flow

### 1. Create a pipeline

```http
POST /pipelines
Content-Type: application/json
```

```json
{
  "name": "Order Pipeline",
  "webhookKey": "order-pipeline-1",
  "actionType": "ADD_TIMESTAMP",
  "actionConfig": {},
  "secret": "my-secret",
  "active": true
}
```

### 2. Create subscribers

**Success subscriber example:**

```http
POST /subscribers
Content-Type: application/json
```

```json
{
  "pipelineId": "<pipeline-id>",
  "targetUrl": "https://webhook.site/your-url",
  "active": true
}
```

**Failing subscriber example:**

```json
{
  "pipelineId": "<pipeline-id>",
  "targetUrl": "http://localhost:9999/fail",
  "active": true
}
```

### 3. Send a webhook

```http
POST /webhooks/order-pipeline-1
x-webhook-secret: my-secret
Content-Type: application/json
```

```json
{
  "message": "hello from webhook",
  "customerName": "mahmoud",
  "orderId": 123
}
```

### 4. Inspect jobs

```http
GET /jobs
```

### 5. Inspect delivery attempts

```http
GET /delivery-attempts
```

Or by job:

```http
GET /jobs/<job-id>/delivery-attempts
```

---

## Retry Logic

Each subscriber delivery can be attempted up to 3 times.

**Configuration used in the project:**

- Maximum delivery attempts: `3`
- Retry delay: `2000ms`
- Delivery timeout: `5000ms`

**Behavior:**

- If a subscriber succeeds on any attempt, retries stop for that subscriber
- If all retries fail for a subscriber, that subscriber is considered failed
- If any active subscriber fails after all retries, the job becomes `FAILED`
- If all active subscribers succeed, the job becomes `COMPLETED`

---

## Health Checks

### `GET /health`

Returns a simple application health response.

**Example:**

```json
{
  "status": "ok",
  "service": "webhook-pipeline",
  "timestamp": "2026-03-18T15:00:00.000Z"
}
```

### `GET /health/ready`

Checks whether critical dependencies are available:

- PostgreSQL
- Redis

If both are healthy:

```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

If one dependency fails, the endpoint returns `500` with a readiness failure response.

---

## Error Handling

### Duplicate pipeline webhook key

If `webhookKey` already exists:

```json
{
  "message": "webhookKey already exists",
  "error": "Conflict",
  "statusCode": 409
}
```

### Missing resource

If a pipeline, subscriber, job, or delivery attempt does not exist:

```json
{
  "message": "Resource not found",
  "error": "Not Found",
  "statusCode": 404
}
```

---

## Testing Notes

This project was tested manually using Postman with flows including:

- successful webhook processing
- secret validation failure
- missing webhook pipeline
- successful subscriber delivery
- failed subscriber delivery
- retry logic verification
- inactive subscriber behavior
- health/readiness checks
- duplicate key conflict handling
- not found handling
- filter endpoint verification

---

## Future Improvements

- Add pagination to list endpoints
- Add CI with GitHub Actions
- Add automated tests for workers and delivery behavior
- Add summary/statistics endpoints
- Add full Docker setup for the NestJS app itself

---

## License

This project is for learning and portfolio use.
