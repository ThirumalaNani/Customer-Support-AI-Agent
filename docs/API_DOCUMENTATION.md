# Contextual Support Agent — Backend API

Base URL: `http://127.0.0.1:8000` for local development. Docker exposes the same API on port `8000`.

## Health

`GET /health`

Example:

```json
{
  "status": "healthy",
  "timestamp": "2026-09-28T12:00:00+00:00",
  "agent_name": "Support Assistant",
  "llm_provider": "gemini",
  "llm_model": "gemini-3.8-flash",
  "history_provider": "hindsight",
  "hindsight_base_url": "http://localhost:8888",
  "hindsight": "connected",
  "llm": "configured"
}
```

`status` becomes `degraded` when Hindsight cannot be reached or the LLM is not configured. Hindsight is not reported as healthy merely because its URL is configured.

The chat endpoint uses the configured LLM provider. Provider failures return `code` and `retryable` metadata so the frontend can show an actionable error and retry safely.

## Chat

`POST /api/chat`

Request:

```json
{
  "customer_id": "alex_chen",
  "message": "We are still seeing 504s during the Friday sync.",
  "memory_enabled": true,
  "conversation_id": "optional-client-thread-id"
}
```

`memory_enabled` defaults to `true`. When false, the turn uses no Hindsight recall and is not retained.

The response preserves the existing frontend-compatible fields and adds truthful memory metadata:

```json
{
  "response": "...",
  "recalled_history": ["..."],
  "customer_id": "alex_chen",
  "history_retained": true,
  "memory_enabled": true,
  "recall_source": "hindsight"
}
```

## Customer history

`GET /api/history/{customer_id}`

Returns only Hindsight recall results. Unknown/new banks may return an empty `history` array.

## Erase customer memory

`DELETE /api/history/{customer_id}`

Requires the configured backend `ADMIN_API_KEY` in the `X-Admin-API-Key` header. The backend calls Hindsight's `DELETE /v1/default/banks/{bank_id}/memories` operation, which clears memories while preserving bank configuration.

## Feedback

`POST /api/feedback`

Example:

```json
{
  "customer_id": "alex_chen",
  "rating": 5,
  "useful": true,
  "outcome": "Timeout issue resolved after the Envoy change.",
  "corrected_resolution": "Keep the upstream timeout at 60 seconds.",
  "message_id": "optional-client-message-id",
  "conversation_id": "optional-client-thread-id"
}
```

The learning signal is retained to Hindsight without copying the raw assistant answer.

## Analytics

`GET /api/analytics`

Backend-owned metrics are computed from SQLite telemetry and live Hindsight bank statistics. Metrics without defensible source data are `null` rather than fabricated.

Important definitions:

- `responsesUsingRecalledContextPercent`: percentage of memory-enabled turns with at least one Hindsight recall result. This is coverage, not accuracy.
- `avgResponseTimeMs`: measured backend request time for successful turns.
- `csatScore`: average recorded 1–5 customer ratings; `null` until ratings exist.
- `memoriesStored`: current Hindsight fact count across visible banks; `null` if Hindsight analytics are unavailable.

`GET /api/analytics/export` returns the backend telemetry and current Hindsight summary in JSON.

## Customers / status

`GET /api/customers` keeps the existing preset directory response.

`GET /api/status` keeps the existing provider configuration response.
