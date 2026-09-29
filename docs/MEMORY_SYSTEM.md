# Contextual Support Agent — Memory Pipeline

The backend uses Hindsight as the persistent customer-memory system. There is no local/demo memory fallback in the production request path.

## Lifecycle

1. **Recall** — before response generation, the backend calls `POST /v1/default/banks/{bank_id}/memories/recall` with the current customer message.
2. **Context** — only returned Hindsight facts are injected into the support-agent prompt.
3. **Response** — the configured LLM provider generates the current answer.
4. **Retain** — after a successful response, the backend sends a concise interaction outcome to Hindsight. The raw assistant answer is not retained as a customer fact.
5. **Feedback** — `/api/feedback` can persist customer-confirmed outcomes or corrections to the same Hindsight bank as learning signals.
6. **Deletion** — `DELETE /api/history/{customer_id}` calls Hindsight's memory-bank clear endpoint and does not merely clear frontend/local state.

## Memory states

`memory_enabled=true` is the default and performs real Hindsight recall and retention.

`memory_enabled=false` skips Hindsight recall and retention for that turn. The response explicitly reports `recall_source: "disabled"`.

A bank that has never been written to Hindsight genuinely returns an empty recall result. The application does not manufacture a first-time history.

## Important accuracy rule

Hindsight recall results contain scores, but the backend does not present those scores as confidence or recall accuracy. Analytics uses the defensible metric **responses using recalled context**: the percentage of memory-enabled support turns for which Hindsight returned at least one recalled result.
